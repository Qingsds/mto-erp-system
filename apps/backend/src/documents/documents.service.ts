/* eslint-disable no-case-declarations */
// apps/backend/src/documents/documents.service.ts
import {
  BadGatewayException,
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecuteSealRequest } from '@erp/shared-types';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { createBillingPdfBuffer } from './billing-pdf';
import { Readable } from 'node:stream';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private formatBillingNo(id: number): string {
    return `BIL-${String(id).padStart(6, '0')}`;
  }

  /**
   * 兼容旧目标类型的占位分支。
   *
   * 当前只有 BILLING 会生成真实 PDF 并上传 MinIO。
   * ORDER / DELIVERY 仍沿用历史占位实现，仅供后端兼容保留，
   * 前端本轮不会开放对应盖章入口，后续补齐真实归档能力后再替换。
   */
  private async createLegacyDocumentRecord(payload: ExecuteSealRequest) {
    return await this.prisma.client.$transaction(async (tx) => {
      const seal = await tx.seal.findUnique({ where: { id: payload.sealId } });
      if (!seal || !seal.isActive) {
        throw new BadRequestException('所选印章不存在或已被停用');
      }

      let orderId = null,
        deliveryNoteId = null;
      let targetPrefix = '';

      switch (payload.targetType) {
        case 'ORDER':
          const order = await tx.order.findUnique({
            where: { id: payload.targetId },
          });
          if (!order) throw new NotFoundException('目标订单不存在');
          orderId = payload.targetId;
          targetPrefix = 'ORD';
          break;
        case 'DELIVERY':
          const delivery = await tx.deliveryNote.findUnique({
            where: { id: payload.targetId },
          });
          if (!delivery) throw new NotFoundException('目标发货单不存在');
          deliveryNoteId = payload.targetId;
          targetPrefix = 'DEL';
          break;
        default:
          throw new BadRequestException('未知的目标单据类型');
      }

      const fakeOriginalKey = `docs/${targetPrefix}-${payload.targetId}/original.pdf`;
      const fakeSignedKey = `docs/${targetPrefix}-${payload.targetId}/signed-${Date.now()}.pdf`;
      const fakeFileHash = crypto
        .createHash('sha256')
        .update(fakeSignedKey)
        .digest('hex');
      const fileName = `${targetPrefix}-${payload.targetId}-${seal.name}已盖章版.pdf`;

      const document = await tx.document.create({
        data: {
          fileName: fileName,
          originalKey: fakeOriginalKey,
          signedKey: fakeSignedKey,
          fileHash: fakeFileHash,
          status: 'SIGNED',
          orderId: orderId,
          deliveryNoteId: deliveryNoteId,
        },
      });

      await tx.sealUsageLog.create({
        data: {
          sealId: payload.sealId,
          userId: payload.userId,
          documentId: document.id,
          ipAddress: '127.0.0.1',
        },
      });

      return document;
    });
  }

  private async createBillingDocumentRecord(payload: ExecuteSealRequest) {
    const seal = await this.prisma.client.seal.findUnique({
      where: { id: payload.sealId },
    });
    if (!seal || !seal.isActive) {
      throw new BadRequestException('所选印章不存在或已被停用');
    }

    const billing = await this.prisma.client.billingStatement.findUnique({
      where: { id: payload.targetId },
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
      },
    });
    if (!billing) {
      throw new NotFoundException('目标对账单不存在');
    }

    const now = new Date();
    const originalPdf = await createBillingPdfBuffer({
      billing,
    });
    const signedPdf = await createBillingPdfBuffer({
      billing,
      sealName: seal.name,
      archivedAt: now,
    });

    const targetPrefix = this.formatBillingNo(payload.targetId);
    const originalKey = `docs/${targetPrefix}/original-${now.getTime()}.pdf`;
    const signedKey = `docs/${targetPrefix}/signed-${now.getTime()}.pdf`;
    const fileName = `${targetPrefix}-${seal.name}已盖章版.pdf`;
    const fileHash = crypto
      .createHash('sha256')
      .update(Buffer.from(signedPdf))
      .digest('hex');

    try {
      await this.storage.uploadObject({
        key: originalKey,
        body: Buffer.from(originalPdf),
        size: originalPdf.byteLength,
        contentType: 'application/pdf',
      });
      await this.storage.uploadObject({
        key: signedKey,
        body: Buffer.from(signedPdf),
        size: signedPdf.byteLength,
        contentType: 'application/pdf',
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new BadGatewayException('对账单 PDF 归档失败');
    }

    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const document = await tx.document.create({
          data: {
            fileName,
            originalKey,
            signedKey,
            fileHash,
            status: 'SIGNED',
            billingId: payload.targetId,
          },
        });

        await tx.sealUsageLog.create({
          data: {
            sealId: payload.sealId,
            userId: payload.userId,
            documentId: document.id,
            ipAddress: '127.0.0.1',
          },
        });

        await tx.billingStatement.update({
          where: { id: payload.targetId },
          data: { status: 'SEALED' },
        });

        return document;
      });
    } catch {
      throw new InternalServerErrorException('对账单归档记录写入失败');
    }
  }

  async executeSeal(payload: ExecuteSealRequest) {
    if (payload.targetType === 'BILLING') {
      return await this.createBillingDocumentRecord(payload);
    }

    // 非 BILLING 目标仍走兼容分支，本轮不对前端开放入口。
    return await this.createLegacyDocumentRecord(payload);
  }

  async getSignedFile(id: number): Promise<{
    document: {
      id: number;
      fileName: string;
      signedKey: string | null;
      status: string;
    };
    stream: Readable;
    size: number;
    contentType: string;
  }> {
    const document = await this.prisma.client.document.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        signedKey: true,
        status: true,
      },
    });

    if (!document) {
      throw new NotFoundException('归档文件不存在');
    }
    if (document.status !== 'SIGNED' || !document.signedKey) {
      throw new BadRequestException('当前归档文件尚不可下载');
    }

    const [stream, stat] = await Promise.all([
      this.storage.getObjectStream(document.signedKey),
      this.storage.statObject(document.signedKey),
    ]);
    const metaData = stat.metaData as
      | Record<string, string | undefined>
      | undefined;
    const rawContentType = metaData?.['content-type'];

    return {
      document,
      stream,
      size: stat.size,
      contentType:
        typeof rawContentType === 'string' ? rawContentType : 'application/pdf',
    };
  }
}
