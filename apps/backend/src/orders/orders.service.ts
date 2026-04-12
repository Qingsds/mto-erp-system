import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CloseShortOrderRequest,
  CreateOrderRequest,
  UserRoleType,
} from '@erp/shared-types';
import { OrderStatus, Prisma } from '@erp/database';

@Injectable()
export class OrdersService {
  // 依赖注入：通过构造函数，NestJS 会自动把全局的 PrismaService 塞给这个类
  constructor(private readonly prisma: PrismaService) {}

  private async loadOrderParts(
    tx: Prisma.TransactionClient,
    partIds: number[],
  ) {
    const uniquePartIds = [...new Set(partIds)];
    const parts = await tx.part.findMany({
      where: { id: { in: uniquePartIds } },
      select: {
        id: true,
        name: true,
        commonPrices: true,
        customers: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (parts.length !== uniquePartIds.length) {
      const foundIds = new Set(parts.map(part => part.id));
      const missingIds = uniquePartIds.filter(partId => !foundIds.has(partId));
      throw new BadRequestException(
        `零件 ID${missingIds.join('、')} 不存在`,
      );
    }

    return new Map(parts.map(part => [part.id, part]));
  }

  private ensurePartsAssignableToCustomer(
    partMap: Map<
      number,
      {
        id: number;
        name: string;
        commonPrices: Prisma.JsonValue;
        customers: Array<{ customerId: number }>;
      }
    >,
    customerId: number,
  ) {
    const blockedParts = [...partMap.values()].filter(part => {
      if (part.customers.length === 0) {
        return false;
      }

      return !part.customers.some(item => item.customerId === customerId);
    });

    if (blockedParts.length === 0) {
      return;
    }

    throw new BadRequestException(
      `零件「${blockedParts.map(part => part.name).join('、')}」未关联当前客户，无法创建订单`,
    );
  }

  /**
   * 将 unknown 价格值解析为 number。
   */
  private toFiniteNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  /**
   * 解析零件价格字典：
   * - 优先“标准价”
   * - 兜底第一个可用数值
   */
  private resolvePriceFromCommonPrices(commonPrices: unknown): number {
    if (
      !commonPrices ||
      typeof commonPrices !== 'object' ||
      Array.isArray(commonPrices)
    ) {
      return 0;
    }

    const priceMap = commonPrices as Record<string, unknown>;
    const standardPrice = this.toFiniteNumber(priceMap['标准价']);
    if (standardPrice !== undefined) {
      return standardPrice;
    }

    for (const value of Object.values(priceMap)) {
      const parsed = this.toFiniteNumber(value);
      if (parsed !== undefined) {
        return parsed;
      }
    }

    return 0;
  }

  /**
   * 解析订单行单价：优先快照单价，缺失时回退零件价格字典。
   */
  private resolveOrderItemUnitPrice(
    snapshotUnitPrice: Prisma.Decimal | number | string,
    fallbackCommonPrices?: unknown,
  ): number {
    const snapshot = this.toFiniteNumber(snapshotUnitPrice) ?? 0;
    if (snapshot > 0) {
      return snapshot;
    }

    const fallback = this.resolvePriceFromCommonPrices(fallbackCommonPrices);
    return fallback > 0 ? fallback : snapshot;
  }

  private async buildCustomerFilters(
    customerId?: number,
    customerName?: string,
  ): Promise<Prisma.OrderWhereInput[]> {
    const filters: Prisma.OrderWhereInput[] = [];

    if (customerId) {
      const customer = await this.prisma.client.customer.findUnique({
        where: { id: Number(customerId) },
        select: { id: true, name: true },
      });

      if (customer) {
        filters.push({
          OR: [
            { customerId: customer.id },
            { customerId: null, customerName: customer.name },
          ],
        });
      } else {
        filters.push({
          customerId: Number(customerId),
        });
      }
    }

    if (customerName) {
      filters.push({
        customerName: { contains: customerName, mode: 'insensitive' },
      });
    }

    return filters;
  }

  private sanitizeListItemForUser(order: {
    totalAmount?: number;
    items: {
      unitPrice: Prisma.Decimal | string | number;
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  }) {
    const { totalAmount, items, ...rest } = order;
    return {
      ...rest,
      items: items.map(item => ({
        ...item,
        unitPrice: '0',
      })),
    };
  }

  private sanitizeDetailForUser(order: {
    items: {
      unitPrice: Prisma.Decimal | string | number;
      part: {
        commonPrices: unknown;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  }) {
    return {
      ...order,
      items: order.items.map(item => ({
        ...item,
        unitPrice: '0',
        part: {
          ...item.part,
          commonPrices: {},
        },
      })),
    };
  }

  /**
   * 创建订单 并固定加个快照
   * @param payload
   * @Qingsds
   */
  async createOrder(payload: CreateOrderRequest) {
    const { customerId, items } = payload;

    if (!items || items.length === 0) {
      // 遇到不合法的业务请求，直接抛出异常，NestJS 会自动将其转化为 HTTP 400 响应
      throw new BadRequestException('订单明细不能为空');
    }

    // 【核心业务逻辑】：使用 Prisma 的事务机制 ($transaction)
    // 保证订单主表和所有明细表要么同时创建成功，要么同时回滚失败，防止出现脏数据
    const newOrder = await this.prisma.client.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { id: true, name: true, isActive: true },
        });
        if (!customer) {
          throw new BadRequestException(`客户 ID${customerId} 不存在`);
        }
        if (!customer.isActive) {
          throw new BadRequestException('客户已停用，无法用于新建订单');
        }

        const partMap = await this.loadOrderParts(
          tx,
          items.map(item => item.partId),
        );
        this.ensurePartsAssignableToCustomer(partMap, customer.id);

        // 1.创建订单主表记录
        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            customerName: customer.name,
            status: 'PENDING', // 默认订单状态为待处理
          },
        });

        for (const item of items) {
          const part = partMap.get(item.partId);
          if (!part) {
            throw new BadRequestException(`零件 ID${item.partId} 不存在`);
          }

          const unitPrice = this.resolvePriceFromCommonPrices(
            part.commonPrices,
          );

          await tx.orderItem.create({
            data: {
              orderId: order.id,
              partId: item.partId,
              orderedQty: item.orderedQty,
              unitPrice: unitPrice, // 【防篡改机制】：价格一旦写入这里，后续零件字典怎么改价，都不会影响本订单
            },
          });
        }
        // 返回订单信息
        return tx.order.findUnique({
          where: {
            id: order.id,
          },
          include: { items: true },
        });
      },
    );
    return newOrder;
  }

  /**
   * 订单短交结案close short
   * 强行终止尚未发完的订单，阻断后续排产与发货
   */
  async closeShortOrder(orderId: number, payload: CloseShortOrderRequest) {
    const order = await this.prisma.client.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`订单 ID: ${orderId} 不存在`);
    }

    // 2. 状态校验：已经发货完成或已经结案的订单，不允许再次短交结案
    if (order.status === 'SHIPPED' || order.status === 'CLOSED_SHORT') {
      throw new BadRequestException(
        `当前订单状态为 ${order.status}，无法执行短交结案`,
      );
    }

    // 3. 执行状态变更，并记录短交原因（可选）
    const updatedOrder = await this.prisma.client.order.update({
      where: { id: orderId },
      data: {
        reason: payload.reason,
        status: 'CLOSED_SHORT',
      },
    });

    return updatedOrder;
  }

  // 1. 分页查询订单列表
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    status?: OrderStatus,
    customerId?: number,
    customerName?: string,
    role: UserRoleType = 'ADMIN',
  ) {
    const skip = (page - 1) * pageSize;

    // 构建动态查询条件
    const filters = await this.buildCustomerFilters(customerId, customerName);
    if (status) {
      filters.unshift({ status });
    }

    const where: Prisma.OrderWhereInput =
      filters.length === 0
        ? {}
        : filters.length === 1
          ? filters[0]
          : { AND: filters };

    const [total, rawData] = await Promise.all([
      this.prisma.client.order.count({ where }),
      this.prisma.client.order.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              part: {
                select: {
                  name: true,
                  partNumber: true,
                  commonPrices: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const data = rawData.map((order) => {
      const totalAmount = order.items.reduce((sum, item) => {
        const unitPrice = this.resolveOrderItemUnitPrice(
          item.unitPrice,
          item.part?.commonPrices,
        );
        const settlementQty =
          order.status === 'CLOSED_SHORT'
            ? Math.max(Math.min(item.shippedQty, item.orderedQty), 0)
            : item.orderedQty;
        return sum + settlementQty * unitPrice;
      }, 0);

      const items = order.items.map(({ part, ...item }) => ({
        ...item,
        partName: part.name,
        partNumber: part.partNumber,
      }));
      return { ...order, items, totalAmount };
    });

    return {
      total,
      data:
        role === 'ADMIN'
          ? data
          : data.map(order => this.sanitizeListItemForUser(order)),
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  // 2. 查询单条订单详情
  async findOne(id: number, role: UserRoleType = 'ADMIN') {
    const order = await this.prisma.client.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { part: true }, // 深度联表：带出明细对应的零件基础信息
        },
        deliveries: true, // 带出该订单名下的所有发货记录
      },
    });

    if (!order) {
      throw new NotFoundException(`订单 ID: ${id} 不存在`);
    }
    return role === 'ADMIN' ? order : this.sanitizeDetailForUser(order);
  }
}
