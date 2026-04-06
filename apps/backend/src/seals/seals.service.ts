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
  DocumentTargetType,
  UpdateSealStatusRequest,
} from '@erp/shared-types';
import { StorageService } from '../storage/storage.service';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

const MAX_SEAL_SIZE_BYTES = 2 * 1024 * 1024;
const SEAL_FILE_KEY_PREFIX = 'seals/';

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
  ) {}

  async createSeal(payload: CreateSealRequest) {
    const name = payload.name.trim();
    const fileKey = payload.fileKey.trim();

    if (!name) {
      throw new BadRequestException('印章名称不能为空');
    }
    if (!fileKey) {
      throw new BadRequestException('印章文件标识不能为空');
    }
    if (
      !fileKey.startsWith(SEAL_FILE_KEY_PREFIX) ||
      !fileKey.toLowerCase().endsWith('.png')
    ) {
      throw new BadRequestException('请先上传 PNG 印章图片后再注册');
    }

    const existingSeal = await this.prisma.client.seal.findFirst({
      where: { fileKey },
      select: { id: true },
    });
    if (existingSeal) {
      throw new BadRequestException('该印章图片已被注册，请勿重复提交');
    }

    const stat = await this.storage.statObject(fileKey);
    const contentType = resolveStoredContentType(
      stat as { metaData?: Record<string, string | undefined> },
    );

    if (contentType !== 'image/png') {
      throw new BadRequestException('仅支持使用 PNG 透明底图注册印章');
    }

    try {
      return await this.prisma.client.seal.create({
        data: {
          name,
          fileKey,
          isActive: true,
        },
      });
    } catch (error) {
      try {
        await this.storage.removeObject(fileKey);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to rollback uploaded seal file: ${fileKey}`,
          cleanupError as Error,
        );
      }

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
      throw new BadRequestException('印章图片不能超过 2MB');
    }

    const fileKey = `seals/${Date.now()}-${randomUUID()}.png`;

    await this.storage.uploadObject({
      key: fileKey,
      body: file.buffer,
      size: file.size,
      contentType: 'image/png',
    });

    return {
      fileKey,
      fileName: file.originalname,
      contentType: 'image/png',
      size: file.size,
    };
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
}
