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

  private toFiniteNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

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
    if (standardPrice !== undefined) return standardPrice;
    for (const value of Object.values(priceMap)) {
      const parsed = this.toFiniteNumber(value);
      if (parsed !== undefined) return parsed;
    }
    return 0;
  }

  /** 优先使用订单快照单价，快照为 0 时回退零件当前价格字典（与 deliveries.service 保持一致）。 */
  private resolveUnitPrice(
    snapshotUnitPrice: Prisma.Decimal | number | string,
    fallbackCommonPrices?: unknown,
  ): number {
    const snapshot = this.toFiniteNumber(snapshotUnitPrice) ?? 0;
    if (snapshot > 0) return snapshot;
    const fallback = this.resolvePriceFromCommonPrices(fallbackCommonPrices);
    return fallback > 0 ? fallback : snapshot;
  }

  async createBilling(payload: CreateBillingRequest) {
    return this.prisma.client.$transaction(async (tx) => {
      const { deliveryItemIds, extraItems } = payload;

      if (!deliveryItemIds || deliveryItemIds.length === 0) {
        throw new BadRequestException('请选择至少一条发货明细进行结算');
      }

      const uniqueDeliveryItemIds = [...new Set(deliveryItemIds)];
      if (uniqueDeliveryItemIds.length !== deliveryItemIds.length) {
        throw new BadRequestException('发货明细 ID 不允许重复');
      }

      // 步骤 A: 抓取发货明细，并向上溯源拉取单价快照，向下检查是否已计费
      const deliverItems = await tx.deliveryItem.findMany({
        where: { id: { in: uniqueDeliveryItemIds } },
        include: {
          orderItem: { include: { part: true } },
          billingItem: true,
        },
      });

      if (deliverItems.length !== uniqueDeliveryItemIds.length) {
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

        // 计算公式：单次发货量 * 单价（优先快照，快照为 0 时回退零件当前价格字典）
        const unitPrice = this.resolveUnitPrice(
          item.orderItem.unitPrice,
          item.orderItem.part?.commonPrices,
        );
        const itemAmount = item.shippedQty * unitPrice;
        totalAmount += itemAmount;

        billingItemCreates.push({
          deliveryItem: { connect: { id: item.id } },
          description: `物料结算: 发货量 ${item.shippedQty} 件, 单价快照 ${unitPrice}`,
          amount: itemAmount,
        });
      }

      // 可选：附加费用（运费/打包费等）
      if (extraItems && extraItems.length > 0) {
        for (const extra of extraItems) {
          totalAmount += extra.amount;
          billingItemCreates.push({
            description: `附加费用: ${extra.desc}`,
            amount: extra.amount,
          });
        }
      }

      // 步骤 D: 级联创建主账单及所有计费条目
      const billingStatement = await tx.billingStatement.create({
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

  // 3. 查询单张对账单详情（含来源发货项与归档记录）
  async findOne(id: number) {
    const billing = await this.prisma.client.billingStatement.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            deliveryItem: {
              include: {
                deliveryNote: true,
                orderItem: {
                  include: {
                    part: true,
                  },
                },
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            sealLogs: {
              orderBy: { actionTime: 'desc' },
              include: {
                seal: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                user: {
                  select: {
                    id: true,
                    username: true,
                    realName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!billing) {
      throw new NotFoundException(`对账单 ID: ${id} 不存在`);
    }

    return billing;
  }

  // 4. 修改对账单状态 (如：变更为 PAID 已结清)
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
