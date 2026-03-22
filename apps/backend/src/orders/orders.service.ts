import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloseShortOrderRequest, CreateOrderRequest } from '@erp/shared-types';
import { OrderStatus, Prisma } from '@erp/database';

@Injectable()
export class OrdersService {
  // 依赖注入：通过构造函数，NestJS 会自动把全局的 PrismaService 塞给这个类
  constructor(private readonly prisma: PrismaService) {}

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
    if (!commonPrices || typeof commonPrices !== 'object' || Array.isArray(commonPrices)) {
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

  /**
   * 创建订单 并固定加个快照
   * @param payload
   * @Qingsds
   */
  async createOrder(payload: CreateOrderRequest) {
    const { customerName, items } = payload;

    if (!items || items.length === 0) {
      // 遇到不合法的业务请求，直接抛出异常，NestJS 会自动将其转化为 HTTP 400 响应
      throw new BadRequestException('订单明细不能为空');
    }

    // 【核心业务逻辑】：使用 Prisma 的事务机制 ($transaction)
    // 保证订单主表和所有明细表要么同时创建成功，要么同时回滚失败，防止出现脏数据
    const newOrder = await this.prisma.client.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1.创建订单主表记录
        const order = await tx.order.create({
          data: {
            customerName,
            status: 'PENDING', // 默认订单状态为待处理
          },
        });

        for (const item of items) {
          const part = await tx.part.findUnique({
            where: { id: item.partId },
          });

          if (!part)
            throw new BadRequestException(`零件 ID${item.partId} 不存在`);

          const unitPrice = this.resolvePriceFromCommonPrices(part.commonPrices);

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
    customerName?: string,
  ) {
    const skip = (page - 1) * pageSize;

    // 构建动态查询条件
    const where: Prisma.OrderWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (customerName) {
      where.customerName = { contains: customerName, mode: 'insensitive' };
    }

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

    return { total, data, page: Number(page), pageSize: Number(pageSize) };
  }

  // 2. 查询单条订单详情
  async findOne(id: number) {
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
    return order;
  }
}
