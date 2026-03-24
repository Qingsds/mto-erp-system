import { Prisma } from '@erp/database';
import { CreateDeliveryRequest } from '@erp/shared-types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DeliveriesService {
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
   * 解析发货行单价：优先订单快照单价，缺失时回退零件价格字典。
   */
  private resolveDeliveryUnitPrice(
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

  async createDelivery(payload: CreateDeliveryRequest) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('发货明细不能为空');
    }

    return await this.prisma.client.$transaction(async (tx) => {
      //1. 锁定效验订单
      const order = await tx.order.findUnique({
        where: { id: payload.orderId },
        include: { items: true },
      });

      if (!order)
        throw new BadRequestException(`订单 ID: ${payload.orderId} 不存在`);

      const reqQtyByOrderItemId = new Map<number, number>();
      for (const item of payload.items) {
        const prev = reqQtyByOrderItemId.get(item.orderItemId) ?? 0;
        reqQtyByOrderItemId.set(item.orderItemId, prev + item.quantity);
      }

      const orderItemIdSet = new Set(order.items.map((i) => i.id));
      for (const orderItemId of reqQtyByOrderItemId.keys()) {
        if (!orderItemIdSet.has(orderItemId)) {
          throw new BadRequestException(
            `订单明细 ID: ${orderItemId} 不属于订单 ID: ${payload.orderId}`,
          );
        }
      }

      // 2. 内存计算与合法性校验 (防超发)
      let isOrderFullyShipped = true;
      const { items } = order;
      for (const orderItem of items) {
        const shippedQtyToAdd = reqQtyByOrderItemId.get(orderItem.id) ?? 0;

        // 发货总数
        const newShippedTotal = orderItem.shippedQty + shippedQtyToAdd;

        // 严格校验：不允许超发
        if (newShippedTotal > orderItem.orderedQty) {
          throw new BadRequestException(
            `订单明细 ID: ${orderItem.id} 超发。原需求: ${orderItem.orderedQty}, 已发: ${orderItem.shippedQty}, 本次请求: ${shippedQtyToAdd}`,
          );
        }

        // 判断整单是否已全部发完
        if (newShippedTotal < orderItem.orderedQty) {
          isOrderFullyShipped = false;
        }
      }

      // 3. 写入发货单及发货明细
      const deliveryNote = await tx.deliveryNote.create({
        data: {
          orderId: payload.orderId,
          remark: payload.remark,
          items: {
            create: payload.items.map((item) => ({
              orderItemId: item.orderItemId,
              shippedQty: item.quantity,
              remark: item.remark,
            })),
          },
        },
        include: { items: true },
      });

      // 4. 利用数据库底层的原子操作 (increment) 累加发货数量，防止并发脏写
      for (const item of payload.items) {
        await tx.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            shippedQty: { increment: item.quantity },
          },
        });
      }

      // 5. 状态机流转：更新主订单状态
      const newOrderStatus = isOrderFullyShipped
        ? 'SHIPPED'
        : 'PARTIAL_SHIPPED';
      if (order.status !== newOrderStatus) {
        await tx.order.update({
          where: { id: payload.orderId },
          data: { status: newOrderStatus },
        });
      }

      return deliveryNote;
    });
  }

  // 1. 分页查询发货记录
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    orderId?: number,
    customerName?: string,
    deliveryDateStart?: string,
    deliveryDateEnd?: string,
    hasRemark?: boolean,
  ) {
    const skip = (page - 1) * pageSize;

    // 使用精确的 WhereInput 类型
    const where: Prisma.DeliveryNoteWhereInput = {};

    if (orderId) {
      where.orderId = Number(orderId);
    }

    if (customerName) {
      where.order = {
        customerName: { contains: customerName, mode: 'insensitive' },
      };
    }

    if (deliveryDateStart || deliveryDateEnd) {
      where.deliveryDate = {};

      if (deliveryDateStart) {
        where.deliveryDate.gte = new Date(deliveryDateStart);
      }

      if (deliveryDateEnd) {
        const endDate = new Date(deliveryDateEnd);
        endDate.setHours(23, 59, 59, 999);
        where.deliveryDate.lte = endDate;
      }
    }

    if (hasRemark === true) {
      where.AND = [{ remark: { not: null } }, { remark: { not: '' } }];
    } else if (hasRemark === false) {
      where.OR = [{ remark: null }, { remark: '' }];
    }

    const [total, rawData] = await Promise.all([
      this.prisma.client.deliveryNote.count({ where }),
      this.prisma.client.deliveryNote.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { deliveryDate: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              customerName: true,
              createdAt: true,
            },
          },
          items: {
            select: {
              shippedQty: true,
              orderItem: {
                select: {
                  unitPrice: true,
                  part: {
                    select: { commonPrices: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const data = rawData.map((delivery) => {
      const totalAmount = delivery.items.reduce((sum, item) => {
        const unitPrice = this.resolveDeliveryUnitPrice(
          item.orderItem.unitPrice,
          item.orderItem.part?.commonPrices,
        );
        return sum + item.shippedQty * unitPrice;
      }, 0);

      const { items, ...rest } = delivery;
      return { ...rest, totalAmount };
    });

    return { total, data, page: Number(page), pageSize: Number(pageSize) };
  }

  // 2. 查询发货单详情及深度追溯
  async findOne(id: number) {
    const delivery = await this.prisma.client.deliveryNote.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            customerName: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            orderItem: {
              include: { part: true },
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`发货单 ID: ${id} 不存在`);
    }
    return delivery;
  }
}
