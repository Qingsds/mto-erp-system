import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBillingRequest,
  UpdateBillingStatusRequest,
} from '@erp/shared-types';
import { Prisma } from '@erp/database';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createBilling(payload: CreateBillingRequest) {
    return this.prisma.client.$transaction(async (tx) => {
      const { deliveryItemIds } = payload;

      // 步骤 A: 抓取发货明细，并向上溯源拉取单价快照，向下检查是否已计费
      const deliverItems = await tx.deliveryItem.findMany({
        where: { id: { in: deliveryItemIds } },
        include: {
          orderItem: true,
          billingItem: true,
        },
      });

      if (deliverItems.length !== deliveryItemIds.length) {
        throw new BadRequestException(
          '部分发货明细在系统中不存在，请核对发货明细 ID 数组',
        );
      }

      let totalAmount = 0;
      const billingItemCreates: Prisma.BillingItemCreateWithoutBillingInput[] =
        [];

      for (const item of deliverItems) {
        if (item.billingItem) {
          throw new BadRequestException(
            `发货明细 ID: ${item.id} 已经被其他对账单锁定计费，严禁重复结算！`,
          );
        }

        // 计算公式：单次发货量 * 订单锁定的单价快照
        const itemAmount = item.shippedQty * Number(item.orderItem.unitPrice);
        totalAmount += itemAmount;

        billingItemCreates.push({
          deliveryItem: { connect: { id: item.id } },
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          description: `物料结算: 发货量 ${item.shippedQty} 件, 单价快照 ${item.orderItem.unitPrice}`,
          amount: itemAmount,
        });

        // 步骤 D: 级联创建主账单及所有计费条目
        const billingStatement = tx.billingStatement.create({
          data: {
            customerName: payload.customerName,
            totalAmount: totalAmount,
            status: 'DRAFT', // 初始状态为草稿
            items: {
              create: billingItemCreates,
            },
          },
          include: { items: true },
        });
        return billingStatement;
      }
    });
  }

  // 2. 分页查询对账单列表
  async findAll(page: number = 1, pageSize: number = 10, status?: string) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.BillingStatementWhereInput = {};
    if (status) {
      where.status = status;
    }

    const [total, data] = await Promise.all([
      this.prisma.client.billingStatement.count({ where }),
      this.prisma.client.billingStatement.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
    ]);

    return { total, data, page: Number(page), pageSize: Number(pageSize) };
  }

  // 3. 修改对账单状态 (如：变更为 PAID 已结清)
  async updateStatus(id: number, payload: UpdateBillingStatusRequest) {
    const billing = await this.prisma.client.billingStatement.findUnique({
      where: { id },
    });

    if (!billing) {
      throw new NotFoundException(`对账单 ID: ${id} 不存在`);
    }

    return await this.prisma.client.billingStatement.update({
      where: { id },
      data: { status: payload.status },
    });
  }
}
