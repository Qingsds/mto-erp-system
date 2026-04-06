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
import {
  applySealToBillingPdfBuffer,
  createBillingPdfBuffer,
} from './billing-pdf';
import { Readable } from 'node:stream';
import type { AuthenticatedRequest } from '../auth/auth-request';

interface SealAuditContext {
  userId: number;
  ipAddress: string | null;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private formatBillingNo(id: number): string {
    return `BIL-${String(id).padStart(6, '0')}`;
  }

  private normalizeIp(rawIp?: string | null): string | null {
    const value = rawIp?.trim();
    if (!value) {
      return null;
    }

    if (value.startsWith('::ffff:')) {
      return value.slice(7);
    }

    return value;
  }

  private resolveAuditIp(request: AuthenticatedRequest): string | null {
    const socketIp = this.normalizeIp(request.socket.remoteAddress);
    const requestIp = this.normalizeIp(request.ip);
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];

    const forwardedIp =
      typeof forwardedFor === 'string'
        ? this.normalizeIp(forwardedFor.split(',')[0] ?? null)
        : null;
    const realHeaderIp =
      typeof realIp === 'string' ? this.normalizeIp(realIp) : null;

    const isLocalProxy =
      socketIp === '127.0.0.1' || socketIp === '::1' || socketIp === null;

    if (isLocalProxy && forwardedIp) {
      return forwardedIp;
    }
    if (isLocalProxy && realHeaderIp) {
      return realHeaderIp;
    }

    return socketIp ?? requestIp ?? forwardedIp ?? realHeaderIp;
  }

  private async buildSealAuditContext(
    request: AuthenticatedRequest,
  ): Promise<SealAuditContext> {
    return {
      userId: request.user.id,
      ipAddress: this.resolveAuditIp(request),
    };
  }

  private async getBillingPdfSource(id: number) {
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
      },
    });

    if (!billing) {
      throw new NotFoundException('目标对账单不存在');
    }

    return billing;
  }

  /**
   * 兼容旧目标类型的占位分支。
   *
   * 当前只有 BILLING 会生成真实 PDF 并上传 MinIO。
   * ORDER / DELIVERY 仍沿用历史占位实现，仅供兼容旧数据和旧调用保留，
   * 不能视为可生产使用的真实归档能力，前端也不会开放对应入口。
   *
   * 后续若补齐订单 / 发货单 PDF 生成链路，应整体替换本分支，而不是继续扩展。
   */
  private async createLegacyPlaceholderDocumentRecord(
    payload: ExecuteSealRequest,
    auditContext: SealAuditContext,
  ) {
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

      const legacyOriginalKey = `docs/${targetPrefix}-${payload.targetId}/original.pdf`;
      const legacySignedKey = `docs/${targetPrefix}-${payload.targetId}/signed-${Date.now()}.pdf`;
      const legacyFileHash = crypto
        .createHash('sha256')
        .update(legacySignedKey)
        .digest('hex');
      const fileName = `${targetPrefix}-${payload.targetId}-${seal.name}已盖章版.pdf`;

      const document = await tx.document.create({
        data: {
          fileName: fileName,
          originalKey: legacyOriginalKey,
          signedKey: legacySignedKey,
          fileHash: legacyFileHash,
          status: 'SIGNED',
          orderId: orderId,
          deliveryNoteId: deliveryNoteId,
        },
      });

      await tx.sealUsageLog.create({
        data: {
          sealId: payload.sealId,
          userId: auditContext.userId,
          documentId: document.id,
          ipAddress: auditContext.ipAddress,
        },
      });

      return document;
    });
  }

  private async createBillingDocumentRecord(
    payload: ExecuteSealRequest,
    auditContext: SealAuditContext,
  ) {
    const seal = await this.prisma.client.seal.findUnique({
      where: { id: payload.sealId },
    });
    if (!seal || !seal.isActive) {
      throw new BadRequestException('所选印章不存在或已被停用');
    }

    const billing = await this.getBillingPdfSource(payload.targetId);
    if (billing.status !== 'DRAFT') {
      throw new BadRequestException('当前对账单状态不允许重复盖章');
    }

    const now = new Date();
    let originalPdf: Uint8Array | null = null;
    let finalSignedPdf: Uint8Array | null = null;

    try {
      const sealImageBytes = await this.storage.getObjectBuffer(seal.fileKey);
      originalPdf = await createBillingPdfBuffer({ billing });
      const archivedPdf = await createBillingPdfBuffer({
        billing: {
          ...billing,
          status: 'SEALED',
        },
        archivedAt: now,
      });
      finalSignedPdf = await applySealToBillingPdfBuffer({
        originalPdf: archivedPdf,
        sealImageBytes,
        placement: {
          pageIndex: payload.pageIndex,
          xRatio: payload.xRatio,
          yRatio: payload.yRatio,
          widthRatio: payload.widthRatio,
        },
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      if (error instanceof Error && error.message.trim()) {
        throw new BadRequestException(error.message);
      }

      throw new InternalServerErrorException('对账单 PDF 盖章失败');
    }

    if (!originalPdf || !finalSignedPdf) {
      throw new InternalServerErrorException('对账单 PDF 盖章失败');
    }

    const targetPrefix = this.formatBillingNo(payload.targetId);
    const originalKey = `docs/${targetPrefix}/original-${now.getTime()}.pdf`;
    const signedKey = `docs/${targetPrefix}/signed-${now.getTime()}.pdf`;
    const fileName = `${targetPrefix}-${seal.name}已盖章版.pdf`;
    const fileHash = crypto
      .createHash('sha256')
      .update(Buffer.from(finalSignedPdf))
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
        body: Buffer.from(finalSignedPdf),
        size: finalSignedPdf.byteLength,
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
            userId: auditContext.userId,
            documentId: document.id,
            ipAddress: auditContext.ipAddress,
            pageIndex: payload.pageIndex,
            xRatio: payload.xRatio,
            yRatio: payload.yRatio,
            widthRatio: payload.widthRatio,
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

  async executeSeal(payload: ExecuteSealRequest, request: AuthenticatedRequest) {
    const auditContext = await this.buildSealAuditContext(request);

    if (payload.targetType === 'BILLING') {
      return await this.createBillingDocumentRecord(payload, auditContext);
    }

    // 非 BILLING 目标仍走兼容占位分支，本轮不对前端开放入口。
    return await this.createLegacyPlaceholderDocumentRecord(
      payload,
      auditContext,
    );
  }

  async getBillingPreviewFile(id: number): Promise<{
    fileName: string;
    content: Uint8Array;
  }> {
    const billing = await this.getBillingPdfSource(id);
    const content = await createBillingPdfBuffer({ billing });

    return {
      fileName: `${this.formatBillingNo(id)}-preview.pdf`,
      content,
    };
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
