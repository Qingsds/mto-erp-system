import { Prisma } from '@erp/database';
import {
  CreateDeliveryRequest,
  FileType,
  UserRoleType,
} from '@erp/shared-types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const MAX_DELIVERY_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

function resolveDeliveryPhotoType(file: Express.Multer.File): FileType {
  if (file.mimetype.startsWith('image/')) {
    return FileType.IMAGE;
  }
  throw new BadRequestException('仅支持上传图片格式的发货照片');
}

function resolveFileExtension(file: Express.Multer.File) {
  const originalExt = extname(file.originalname).toLowerCase();
  return originalExt || '.bin';
}

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private sanitizeListItemForUser(delivery: {
    totalAmount?: number;
    [key: string]: unknown;
  }) {
    const { totalAmount, ...rest } = delivery;
    return rest;
  }

  private sanitizeDetailForUser(delivery: {
    items: {
      orderItem: {
        unitPrice: Prisma.Decimal | string | number;
        part: {
          commonPrices: unknown;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }[];
    [key: string]: unknown;
  }) {
    return {
      ...delivery,
      items: delivery.items.map(item => ({
        ...item,
        orderItem: {
          ...item.orderItem,
          unitPrice: '0',
          part: {
            ...item.orderItem.part,
            commonPrices: {},
          },
        },
      })),
    };
  }

  private normalizePhotoKey(fileKey: string) {
    return fileKey.trim();
  }

  private ensureTempPhotoKey(fileKey: string) {
    const normalizedKey = this.normalizePhotoKey(fileKey);
    if (!normalizedKey.startsWith('temp/deliveries/')) {
      throw new BadRequestException('仅允许绑定临时发货照片');
    }
    return normalizedKey;
  }

  async stashPhoto(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('上传文件内容为空');
    }
    if (file.size > MAX_DELIVERY_PHOTO_SIZE_BYTES) {
      throw new BadRequestException('发货照片不能超过 10MB');
    }

    const fileType = resolveDeliveryPhotoType(file);
    const fileKey = `temp/deliveries/${Date.now()}-${randomUUID()}${resolveFileExtension(file)}`;

    await this.storage.uploadObject({
      key: fileKey,
      body: file.buffer,
      size: file.size,
      contentType: file.mimetype,
    });

    return {
      fileKey,
      fileName: file.originalname,
      fileType,
    };
  }

  async removeStashedPhoto(fileKey: string) {
    const normalizedKey = this.ensureTempPhotoKey(fileKey);
    await this.storage.removeObjectSafe(normalizedKey);
    return { removed: true, fileKey: normalizedKey };
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

  private async buildOrderFilter(
    customerId?: number,
    customerName?: string,
  ): Promise<Prisma.OrderWhereInput | undefined> {
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

    if (filters.length === 0) {
      return undefined;
    }

    return filters.length === 1 ? filters[0] : { AND: filters };
  }

  async createDelivery(payload: CreateDeliveryRequest, createdById: number) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('发货明细不能为空');
    }
    const photos = payload.photos ?? [];
    if (photos.length > 9) {
      throw new BadRequestException('发货照片最多上传 9 张');
    }

    const normalizedPhotos = photos.map((photo, index) => ({
      ...photo,
      fileKey: this.ensureTempPhotoKey(photo.fileKey),
      sortOrder: index,
    }));

    const finalPhotoKeys: string[] = [];
    const tempPhotoKeys = normalizedPhotos.map(photo => photo.fileKey);

    try {
      const copiedPhotos = await Promise.all(
        normalizedPhotos.map(async photo => {
          if (photo.fileType !== FileType.IMAGE) {
            throw new BadRequestException('发货照片仅支持图片');
          }

          await this.storage.statObject(photo.fileKey);

          const finalFileKey = `deliveries/delivery-${payload.orderId}/${Date.now()}-${randomUUID()}${extname(photo.fileName) || extname(photo.fileKey) || '.bin'}`;
          await this.storage.copyObject({
            sourceKey: photo.fileKey,
            destinationKey: finalFileKey,
          });
          finalPhotoKeys.push(finalFileKey);

          return {
            fileName: photo.fileName,
            fileKey: finalFileKey,
            fileType: photo.fileType,
            sortOrder: photo.sortOrder,
          };
        }),
      );

      const result = await this.prisma.client.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: payload.orderId },
          include: { items: true },
        });

        if (!order) {
          throw new BadRequestException(`订单 ID: ${payload.orderId} 不存在`);
        }

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

        let isOrderFullyShipped = true;
        for (const orderItem of order.items) {
          const shippedQtyToAdd = reqQtyByOrderItemId.get(orderItem.id) ?? 0;
          const newShippedTotal = orderItem.shippedQty + shippedQtyToAdd;

          if (newShippedTotal > orderItem.orderedQty) {
            throw new BadRequestException(
              `订单明细 ID: ${orderItem.id} 超发。原需求: ${orderItem.orderedQty}, 已发: ${orderItem.shippedQty}, 本次请求: ${shippedQtyToAdd}`,
            );
          }

          if (newShippedTotal < orderItem.orderedQty) {
            isOrderFullyShipped = false;
          }
        }

        const deliveryNote = await tx.deliveryNote.create({
          data: {
            orderId: payload.orderId,
            createdById,
            remark: payload.remark,
            items: {
              create: payload.items.map((item) => ({
                orderItemId: item.orderItemId,
                shippedQty: item.quantity,
                remark: item.remark,
              })),
            },
            photos: copiedPhotos.length
              ? {
                  create: copiedPhotos,
                }
              : undefined,
          },
          include: {
            items: true,
            photos: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        });

        for (const item of payload.items) {
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: {
              shippedQty: { increment: item.quantity },
            },
          });
        }

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

      await this.storage.removeObjectsSafe(tempPhotoKeys);
      return result;
    } catch (error) {
      await this.storage.removeObjectsSafe(finalPhotoKeys);
      await this.storage.removeObjectsSafe(tempPhotoKeys);
      throw error;
    }
  }

  // 1. 分页查询发货记录
  async findAll(
    page: number = 1,
    pageSize: number = 10,
    orderId?: number,
    customerId?: number,
    customerName?: string,
    deliveryDateStart?: string,
    deliveryDateEnd?: string,
    hasRemark?: boolean,
    role: UserRoleType = 'ADMIN',
  ) {
    const skip = (page - 1) * pageSize;

    // 使用精确的 WhereInput 类型
    const where: Prisma.DeliveryNoteWhereInput = {};

    if (orderId) {
      where.orderId = Number(orderId);
    }

    const orderFilter = await this.buildOrderFilter(customerId, customerName);
    if (orderFilter) {
      where.order = orderFilter;
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
          createdBy: {
            select: { id: true, realName: true, role: true },
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

    return {
      total,
      data:
        role === 'ADMIN'
          ? data
          : data.map(delivery => this.sanitizeListItemForUser(delivery)),
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  // 2. 查询发货单详情及深度追溯
  async findOne(id: number, role: UserRoleType = 'ADMIN') {
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
        createdBy: {
          select: { id: true, realName: true, role: true },
        },
        photos: {
          select: {
            id: true,
            fileName: true,
            fileKey: true,
            fileType: true,
            sortOrder: true,
            uploadedAt: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        items: {
          include: {
            orderItem: {
              include: { part: true },
            },
            billingItem: { select: { id: true, billingId: true } },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException(`发货单 ID: ${id} 不存在`);
    }
    return role === 'ADMIN' ? delivery : this.sanitizeDetailForUser(delivery);
  }

  async getPhotoFile(
    deliveryId: number,
    photoId: number,
  ): Promise<{
    photo: {
      id: number;
      deliveryNoteId: number;
      fileName: string;
      fileKey: string;
      fileType: string;
    };
    stream: Readable;
    size: number;
    contentType: string;
  }> {
    const photo = await this.prisma.client.deliveryPhoto.findFirst({
      where: {
        id: photoId,
        deliveryNoteId: deliveryId,
      },
    });

    if (!photo) {
      throw new NotFoundException('发货照片不存在');
    }

    const [stream, stat] = await Promise.all([
      this.storage.getObjectStream(photo.fileKey),
      this.storage.statObject(photo.fileKey),
    ]);
    const metaData = stat.metaData as
      | Record<string, string | undefined>
      | undefined;
    const rawContentType = metaData?.['content-type'];
    const contentType =
      typeof rawContentType === 'string'
        ? rawContentType
        : photo.fileType === FileType.IMAGE
          ? 'image/*'
          : 'application/octet-stream';

    return {
      photo: {
        id: photo.id,
        deliveryNoteId: photo.deliveryNoteId,
        fileName: photo.fileName,
        fileKey: photo.fileKey,
        fileType: photo.fileType,
      },
      stream,
      size: Number(stat.size),
      contentType,
    };
  }
}
