import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@erp/database';
import type { UserRoleType } from '@erp/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  UpdateCustomerStatusRequest,
} from '@erp/shared-types';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequiredName(value: string) {
    const nextName = value.trim();
    if (!nextName) {
      throw new BadRequestException('客户名称不能为空');
    }
    return nextName;
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }
    const nextValue = value?.trim() ?? '';
    return nextValue ? nextValue : null;
  }

  private buildLegacyOrderWhere(customerId: number, customerName: string) {
    return {
      OR: [
        { customerId },
        {
          customerId: null,
          customerName,
        },
      ],
    } satisfies Prisma.OrderWhereInput;
  }

  private async syncLegacyOrdersByName(
    tx: Prisma.TransactionClient,
    customerId: number,
    customerName: string,
  ) {
    await tx.order.updateMany({
      where: {
        customerId: null,
        customerName,
      },
      data: {
        customerId,
      },
    });
  }

  private handleWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException('客户名称已存在');
      }
      if (error.code === 'P2000') {
        throw new BadRequestException('客户字段长度超出限制');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('客户不存在');
      }
    }
    throw error;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    keyword?: string,
    isActive?: string,
    role: UserRoleType = 'USER',
  ) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.CustomerWhereInput = {};

    const resolvedKeyword = keyword?.trim();
    if (resolvedKeyword) {
      where.OR = [
        { name: { contains: resolvedKeyword, mode: 'insensitive' } },
        { contactName: { contains: resolvedKeyword, mode: 'insensitive' } },
        { contactPhone: { contains: resolvedKeyword, mode: 'insensitive' } },
      ];
    }

    if (role !== 'ADMIN') {
      where.isActive = true;
    } else if (isActive === 'true' || isActive === 'false') {
      where.isActive = isActive === 'true';
    }

    const [total, data] = await Promise.all([
      this.prisma.client.customer.count({ where }),
      this.prisma.client.customer.findMany({
        where,
        skip,
        take: Number(pageSize),
        orderBy: { updatedAt: 'desc' },
        select:
          role === 'ADMIN'
            ? {
                id: true,
                name: true,
                address: true,
                contactName: true,
                contactPhone: true,
                invoiceInfo: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              }
            : {
                id: true,
                name: true,
              },
      }),
    ]);

    return {
      total,
      data,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  async findOne(id: number) {
    const customer = await this.prisma.client.customer.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            part: {
              select: {
                id: true,
                partNumber: true,
                name: true,
                material: true,
                spec: true,
                commonPrices: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`客户 ID: ${id} 不存在`);
    }

    const totalOrders = await this.prisma.client.order.count({
      where: this.buildLegacyOrderWhere(customer.id, customer.name),
    });

    return {
      ...customer,
      _count: {
        orders: totalOrders,
      },
    };
  }

  async create(payload: CreateCustomerRequest) {
    const name = this.normalizeRequiredName(payload.name);

    try {
      return await this.prisma.client.$transaction(async tx => {
        const created = await tx.customer.create({
          data: {
            name,
            address: this.normalizeOptionalText(payload.address) ?? null,
            contactName: this.normalizeOptionalText(payload.contactName) ?? null,
            contactPhone: this.normalizeOptionalText(payload.contactPhone) ?? null,
            invoiceInfo: this.normalizeOptionalText(payload.invoiceInfo) ?? null,
            isActive: true,
          },
        });

        await this.syncLegacyOrdersByName(tx, created.id, created.name);

        return created;
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: number, payload: UpdateCustomerRequest) {
    const nextName =
      payload.name === undefined
        ? undefined
        : this.normalizeRequiredName(payload.name);

    try {
      return await this.prisma.client.$transaction(async tx => {
        const current = await tx.customer.findUnique({
          where: { id },
          select: { id: true, name: true },
        });

        if (!current) {
          throw new NotFoundException(`客户 ID: ${id} 不存在`);
        }

        await this.syncLegacyOrdersByName(tx, current.id, current.name);

        return tx.customer.update({
          where: { id },
          data: {
            name: nextName,
            address: this.normalizeOptionalText(payload.address),
            contactName: this.normalizeOptionalText(payload.contactName),
            contactPhone: this.normalizeOptionalText(payload.contactPhone),
            invoiceInfo: this.normalizeOptionalText(payload.invoiceInfo),
          },
        });
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateStatus(id: number, payload: UpdateCustomerStatusRequest) {
    try {
      return await this.prisma.client.customer.update({
        where: { id },
        data: { isActive: payload.isActive },
      });
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async addPart(customerId: number, partId: number) {
    const customer = await this.prisma.client.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException(`客户 ID: ${customerId} 不存在`);
    }

    const part = await this.prisma.client.part.findUnique({
      where: { id: partId },
      select: { id: true },
    });
    if (!part) {
      throw new NotFoundException(`零件 ID: ${partId} 不存在`);
    }

    await this.prisma.client.customerPart.upsert({
      where: {
        customerId_partId: {
          customerId,
          partId,
        },
      },
      update: {},
      create: {
        customerId,
        partId,
      },
    });

    return { customerId, partId };
  }

  async removePart(customerId: number, partId: number) {
    try {
      await this.prisma.client.customerPart.delete({
        where: {
          customerId_partId: {
            customerId,
            partId,
          },
        },
      });
    } catch {
      throw new BadRequestException('客户与零件关联不存在或已删除');
    }

    return { customerId, partId };
  }
}
