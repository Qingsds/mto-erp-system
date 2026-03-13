import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CloseShortOrderRequest,
  CreateOrderRequest,
  OrderStatus,
} from '@erp/shared-types';
import { Prisma } from '@erp/database';

@Injectable()
export class OrdersService {
  // 依赖注入：通过构造函数，NestJS 会自动把全局的 PrismaService 塞给这个类
  constructor(private readonly prisma: PrismaService) {}

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
            status: OrderStatus.PENDING, // 默认订单状态为待处理
          },
        });

        for (const item of items) {
          const part = await tx.part.findUnique({
            where: { id: item.partId },
          });

          if (!part)
            throw new BadRequestException(`零件 ID${item.partId} 不存在`);

          const prices = part.commonPrices as Record<string, number>;
          const unitPrice = prices['标准价'] || 0;

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

    // 3. 执行状态变更
    // 提示：当前 Schema 的 Order 表中暂无 reason 字段，payload.reason 可在需要时扩展写入数据库或日志系统
    const updatedOrder = await this.prisma.client.order.update({
      where: { id: orderId },
      data: {
        reason: payload.reason,
        status: 'CLOSED_SHORT',
      },
    });

    return updatedOrder;
  }
}
