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

  async createDelivery(payload: CreateDeliveryRequest) {
    return await this.prisma.client.$transaction(async (tx) => {
      //1. 锁定效验订单
      const order = await tx.order.findUnique({
        where: { id: payload.orderId },
        include: { items: true },
      });

      if (!order)
        throw new BadRequestException(`订单 ID: ${payload.orderId} 不存在`);

      // 2. 内存计算与合法性校验 (防超发)
      let isOrderFullyShipped = true;
      const { items } = order;
      for (const orderItem of items) {
        // 找到发货明细
        const reqItem = payload.items.find(
          (i) => i.orderItemId === orderItem.id,
        );
        const shippedQtyToAdd = reqItem ? reqItem.quantity : 0;

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

        // 3. 写入发货单及发货明细
        const deliveryNote = await tx.deliveryNote.create({
          data: {
            orderId: payload.orderId,
            items: {
              create: payload.items.map((item) => ({
                orderItemId: item.orderItemId,
                shippedQty: item.quantity,
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
      }
    });
  }

  // 1. 分页查询发货记录
  async findAll(page: number = 1, pageSize: number = 10, orderId?: number) {
    const skip = (page - 1) * pageSize;

    // 使用精确的 WhereInput 类型
    const where: Prisma.DeliveryNoteWhereInput = {};

    if (orderId) {
      where.orderId = Number(orderId);
    }

    const [total, data] = await Promise.all([
      this.prisma.client.deliveryNote.count({ where }),
      this.prisma.client.deliveryNote.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { deliveryDate: 'desc' },
      }),
    ]);

    return { total, data, page: Number(page), pageSize: Number(pageSize) };
  }

  // 2. 查询发货单详情及深度追溯
  async findOne(id: number) {
    const delivery = await this.prisma.client.deliveryNote.findUnique({
      where: { id },
      include: {
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
