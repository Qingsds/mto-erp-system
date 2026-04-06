// apps/backend/src/seals/seals.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSealRequest,
  DiscardSealUploadRequest,
  DocumentTargetType,
  UpdateSealStatusRequest,
} from '@erp/shared-types';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { SealImageService } from './seal-image.service';

const MAX_SEAL_SIZE_BYTES = 10 * 1024 * 1024;
const SEAL_FILE_KEY_PREFIX = 'seals/processed/';
const SEAL_ORIGINAL_FILE_KEY_PREFIX = 'seals/original/';

function resolveStoredContentType(stat: {
  metaData?: Record<string, string | undefined>;
}) {
  const rawContentType = stat.metaData?.['content-type'];
  return typeof rawContentType === 'string' ? rawContentType : null;
}

function resolveLogTarget(document: {
  orderId: number | null;
  deliveryNoteId: number | null;
  billingId: number | null;
}): {
  targetType: DocumentTargetType | null;
  targetId: number | null;
} {
  if (document.orderId) {
    return { targetType: 'ORDER', targetId: document.orderId };
  }
  if (document.deliveryNoteId) {
    return { targetType: 'DELIVERY', targetId: document.deliveryNoteId };
  }
  if (document.billingId) {
    return { targetType: 'BILLING', targetId: document.billingId };
  }

  return { targetType: null, targetId: null };
}

@Injectable()
export class SealsService {
  private readonly logger = new Logger(SealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly sealImage: SealImageService,
  ) {}

  private assertSealObjectKey(
    fileKey: string,
    prefix: string,
    message: string,
  ) {
    if (
      !fileKey ||
      !fileKey.startsWith(prefix) ||
      !fileKey.toLowerCase().endsWith('.png')
    ) {
      throw new BadRequestException(message);
    }
  }

  private async assertPngObject(fileKey: string, message: string) {
    const stat = await this.storage.statObject(fileKey);
    const contentType = resolveStoredContentType(
      stat as { metaData?: Record<string, string | undefined> },
    );

    if (contentType !== 'image/png') {
      throw new BadRequestException(message);
    }
  }

  private async removeUploadedSealFiles(payload: {
    fileKey: string;
    originalFileKey: string;
  }) {
    const uniqueKeys = [...new Set([payload.fileKey, payload.originalFileKey])];

    await Promise.all(
      uniqueKeys.map(async (key) => {
        try {
          await this.storage.removeObject(key);
        } catch (error) {
          this.logger.error(
            `Failed to cleanup uploaded seal file: ${key}`,
            error as Error,
          );
        }
      }),
    );
  }

  async createSeal(payload: CreateSealRequest) {
    const name = payload.name.trim();
    const fileKey = payload.fileKey.trim();
    const originalFileKey = payload.originalFileKey.trim();

    if (!name) {
      throw new BadRequestException('印章名称不能为空');
    }

    this.assertSealObjectKey(
      fileKey,
      SEAL_FILE_KEY_PREFIX,
      '请先生成清洗后的印章图片再注册',
    );
    this.assertSealObjectKey(
      originalFileKey,
      SEAL_ORIGINAL_FILE_KEY_PREFIX,
      '请先上传原始 PNG 印章图片后再注册',
    );

    const existingSeal = await this.prisma.client.seal.findFirst({
      where: {
        OR: [{ fileKey }, { originalFileKey }],
      },
      select: { id: true },
    });
    if (existingSeal) {
      throw new BadRequestException('该印章图片已被注册，请勿重复提交');
    }

    await this.assertPngObject(fileKey, '清洗后的印章文件不可用，请重新上传');
    await this.assertPngObject(
      originalFileKey,
      '原始印章文件不可用，请重新上传',
    );

    try {
      return await this.prisma.client.seal.create({
        data: {
          name,
          fileKey,
          originalFileKey,
          isActive: true,
        },
      });
    } catch (error) {
      await this.removeUploadedSealFiles({ fileKey, originalFileKey });
      this.logger.error('Failed to create seal record', error as Error);
      throw new InternalServerErrorException('印章注册失败，请重新上传后再试');
    }
  }

  async uploadSealFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('未检测到上传文件');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('上传文件内容为空');
    }
    if (file.mimetype !== 'image/png') {
      throw new BadRequestException('仅支持上传 PNG 透明底图');
    }
    if (file.size > MAX_SEAL_SIZE_BYTES) {
      throw new BadRequestException('印章图片不能超过 10MB');
    }

    const originalFileKey = `${SEAL_ORIGINAL_FILE_KEY_PREFIX}${Date.now()}-${randomUUID()}.png`;
    const fileKey = `${SEAL_FILE_KEY_PREFIX}${Date.now()}-${randomUUID()}.png`;
    const processedBuffer = await this.sealImage.sanitizeSealPng(file.buffer);

    await this.storage.uploadObject({
      key: originalFileKey,
      body: file.buffer,
      size: file.size,
      contentType: 'image/png',
    });

    try {
      await this.storage.uploadObject({
        key: fileKey,
        body: processedBuffer,
        size: processedBuffer.byteLength,
        contentType: 'image/png',
      });
    } catch (error) {
      await this.removeUploadedSealFiles({ fileKey, originalFileKey });
      throw error;
    }

    return {
      fileKey,
      originalFileKey,
      fileName: file.originalname,
      contentType: 'image/png',
      size: file.size,
      processedPreviewDataUrl: this.sealImage.toPreviewDataUrl(processedBuffer),
    };
  }

  async discardUploadedSealFile(payload: DiscardSealUploadRequest) {
    const fileKey = payload.fileKey.trim();
    const originalFileKey = payload.originalFileKey.trim();

    this.assertSealObjectKey(
      fileKey,
      SEAL_FILE_KEY_PREFIX,
      '处理图文件标识不合法',
    );
    this.assertSealObjectKey(
      originalFileKey,
      SEAL_ORIGINAL_FILE_KEY_PREFIX,
      '原图文件标识不合法',
    );

    const linkedSeal = await this.prisma.client.seal.findFirst({
      where: {
        OR: [{ fileKey }, { originalFileKey }],
      },
      select: { id: true },
    });
    if (linkedSeal) {
      return { removed: false };
    }

    await this.removeUploadedSealFiles({ fileKey, originalFileKey });
    return { removed: true };
  }

  async findAll() {
    return await this.prisma.client.seal.findMany({
      orderBy: [{ isActive: 'desc' }, { id: 'desc' }],
    });
  }

  async updateStatus(id: number, payload: UpdateSealStatusRequest) {
    const seal = await this.prisma.client.seal.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!seal) {
      throw new NotFoundException('印章不存在');
    }

    return await this.prisma.client.seal.update({
      where: { id },
      data: { isActive: payload.isActive },
    });
  }

  async getSealFile(id: number): Promise<{
    seal: {
      id: number;
      name: string;
      fileKey: string;
      fileName: string;
    };
    stream: Readable;
    size: number;
    contentType: string;
  }> {
    const seal = await this.prisma.client.seal.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileKey: true,
      },
    });

    if (!seal) {
      throw new NotFoundException('印章不存在');
    }

    const [stream, stat] = await Promise.all([
      this.storage.getObjectStream(seal.fileKey),
      this.storage.statObject(seal.fileKey),
    ]);
    const contentType = resolveStoredContentType(
      stat as { metaData?: Record<string, string | undefined> },
    );

    return {
      seal: {
        ...seal,
        fileName: `${seal.name}.png`,
      },
      stream,
      size: stat.size,
      contentType: contentType ?? 'image/png',
    };
  }

  async findLogs(id: number) {
    const seal = await this.prisma.client.seal.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileKey: true,
        originalFileKey: true,
        isActive: true,
      },
    });

    if (!seal) {
      throw new NotFoundException('印章不存在');
    }

    const logs = await this.prisma.client.sealUsageLog.findMany({
      where: { sealId: id },
      orderBy: { actionTime: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            realName: true,
          },
        },
        document: {
          select: {
            id: true,
            fileName: true,
            status: true,
            orderId: true,
            deliveryNoteId: true,
            billingId: true,
          },
        },
      },
    });

    return {
      seal,
      logs: logs.map((log) => {
        const target = resolveLogTarget(log.document);

        return {
          id: log.id,
          actionTime: log.actionTime,
          ipAddress: log.ipAddress,
          pageIndex: log.pageIndex,
          xRatio: log.xRatio,
          yRatio: log.yRatio,
          widthRatio: log.widthRatio,
          user: log.user,
          document: {
            id: log.document.id,
            fileName: log.document.fileName,
            status: log.document.status,
          },
          targetType: target.targetType,
          targetId: target.targetId,
        };
      }),
    };
  }

  async reprocessExistingSeals() {
    const seals = await this.prisma.client.seal.findMany({
      select: {
        id: true,
        name: true,
        fileKey: true,
        originalFileKey: true,
      },
      orderBy: { id: 'asc' },
    });

    let updated = 0;
    let failed = 0;
    const failures: Array<{ id: number; name: string; reason: string }> = [];

    for (const seal of seals) {
      const sourceKey = seal.originalFileKey?.trim() || seal.fileKey;
      const previousProcessedKey = seal.fileKey;
      const nextOriginalFileKey = seal.originalFileKey?.trim() || seal.fileKey;
      const nextProcessedKey = `${SEAL_FILE_KEY_PREFIX}${Date.now()}-${randomUUID()}.png`;

      try {
        const sourceBuffer = await this.storage.getObjectBuffer(sourceKey);
        const processedBuffer =
          await this.sealImage.sanitizeSealPng(sourceBuffer);

        await this.storage.uploadObject({
          key: nextProcessedKey,
          body: processedBuffer,
          size: processedBuffer.byteLength,
          contentType: 'image/png',
        });

        await this.prisma.client.seal.update({
          where: { id: seal.id },
          data: {
            originalFileKey: nextOriginalFileKey,
            fileKey: nextProcessedKey,
          },
        });

        if (seal.originalFileKey && previousProcessedKey !== nextProcessedKey) {
          try {
            await this.storage.removeObject(previousProcessedKey);
          } catch (cleanupError) {
            this.logger.error(
              `Failed to cleanup previous processed seal file: ${previousProcessedKey}`,
              cleanupError as Error,
            );
          }
        }

        updated += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          id: seal.id,
          name: seal.name,
          reason: error instanceof Error ? error.message : '补处理失败',
        });
      }
    }

    return {
      total: seals.length,
      updated,
      skipped: Math.max(0, seals.length - updated - failed),
      failed,
      failures,
    };
  }
}
