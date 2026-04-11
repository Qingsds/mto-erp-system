import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@erp/database';
import {
  CreateBillingRequest,
  UpdateBillingStatusRequest,
} from '@erp/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

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

  private resolveUnitPrice(
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

  async createBilling(payload: CreateBillingRequest) {
    return this.prisma.client.$transaction(async tx => {
      const { customerId, deliveryItemIds, extraItems } = payload;

      if (!deliveryItemIds || deliveryItemIds.length === 0) {
        throw new BadRequestException('请选择至少一条发货明细进行结算');
      }

      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true },
      });

      if (!customer) {
        throw new BadRequestException(`客户 ID: ${customerId} 不存在`);
      }

      const uniqueDeliveryItemIds = [...new Set(deliveryItemIds)];
      if (uniqueDeliveryItemIds.length !== deliveryItemIds.length) {
        throw new BadRequestException('发货明细 ID 不允许重复');
      }

      const deliveryItems = await tx.deliveryItem.findMany({
        where: { id: { in: uniqueDeliveryItemIds } },
        include: {
          orderItem: {
            include: {
              part: true,
              order: {
                select: {
                  customerId: true,
                  customerName: true,
                },
              },
            },
          },
          billingItem: true,
        },
      });

      if (deliveryItems.length !== uniqueDeliveryItemIds.length) {
        throw new BadRequestException(
          '部分发货明细在系统中不存在，请核对发货明细 ID',
        );
      }

      let totalAmount = 0;
      const billingItemCreates: Prisma.BillingItemCreateWithoutBillingInput[] =
        [];

      for (const item of deliveryItems) {
        if (item.billingItem) {
          throw new BadRequestException(
            `发货明细 ID: ${item.id} 已被其他对账单计费，禁止重复结算`,
          );
        }

        const belongsToCustomer =
          item.orderItem.order.customerId === customer.id ||
          (item.orderItem.order.customerId == null &&
            item.orderItem.order.customerName === customer.name);

        if (!belongsToCustomer) {
          throw new BadRequestException(
            `发货明细 ID: ${item.id} 不属于客户 ${customer.name}`,
          );
        }

        const unitPrice = this.resolveUnitPrice(
          item.orderItem.unitPrice,
          item.orderItem.part?.commonPrices,
        );
        const itemAmount = item.shippedQty * unitPrice;
        totalAmount += itemAmount;

        billingItemCreates.push({
          deliveryItem: { connect: { id: item.id } },
          description: `物料结算：发货 ${item.shippedQty} 件，单价 ${unitPrice}`,
          amount: itemAmount,
        });
      }

      if (extraItems?.length) {
        for (const extra of extraItems) {
          const desc = extra.desc.trim();
          if (!desc) {
            throw new BadRequestException('附加费用说明不能为空');
          }
          if (extra.amount <= 0) {
            throw new BadRequestException('附加费用金额必须大于 0');
          }

          totalAmount += extra.amount;
          billingItemCreates.push({
            description: `附加费用：${desc}`,
            amount: extra.amount,
          });
        }
      }

      return tx.billingStatement.create({
        data: {
          customerName: customer.name,
          totalAmount,
          status: 'DRAFT',
          items: {
            create: billingItemCreates,
          },
        },
        include: { items: true },
      });
    });
  }

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

  async updateStatus(id: number, payload: UpdateBillingStatusRequest) {
    const billing = await this.prisma.client.billingStatement.findUnique({
      where: { id },
    });

    if (!billing) {
      throw new NotFoundException(`对账单 ID: ${id} 不存在`);
    }

    return this.prisma.client.billingStatement.update({
      where: { id },
      data: { status: payload.status },
    });
  }
}
