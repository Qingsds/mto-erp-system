/* eslint-disable no-case-declarations */
// apps/backend/src/documents/documents.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecuteSealRequest } from '@erp/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async executeSeal(payload: ExecuteSealRequest) {
    return await this.prisma.client.$transaction(async (tx) => {
      // 1. 校验印章合法性
      const seal = await tx.seal.findUnique({ where: { id: payload.sealId } });
      if (!seal || !seal.isActive) {
        throw new BadRequestException('所选印章不存在或已被停用');
      }

      // 2. 校验目标单据，并动态设置外键
      let orderId = null,
        deliveryNoteId = null,
        billingId = null;
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
        case 'BILLING':
          const billing = await tx.billingStatement.findUnique({
            where: { id: payload.targetId },
          });
          if (!billing) throw new NotFoundException('目标对账单不存在');
          billingId = payload.targetId;
          targetPrefix = 'BIL';
          break;
        default:
          throw new BadRequestException('未知的目标单据类型');
      }

      // 3. 模拟电子签章的防伪合成逻辑
      const fakeOriginalKey = `docs/${targetPrefix}-${payload.targetId}/original.pdf`;
      const fakeSignedKey = `docs/${targetPrefix}-${payload.targetId}/signed-${Date.now()}.pdf`;
      const fakeFileHash = crypto
        .createHash('sha256')
        .update(fakeSignedKey)
        .digest('hex');
      const fileName = `${targetPrefix}-${payload.targetId}-${seal.name}已盖章版.pdf`;

      // 4. 生成归档记录
      const document = await tx.document.create({
        data: {
          fileName: fileName,
          originalKey: fakeOriginalKey,
          signedKey: fakeSignedKey,
          fileHash: fakeFileHash,
          status: 'SIGNED',
          orderId: orderId,
          deliveryNoteId: deliveryNoteId,
          billingId: billingId,
        },
      });

      // 5. 记录不可篡改的审计日志
      await tx.sealUsageLog.create({
        data: {
          sealId: payload.sealId,
          userId: payload.userId, // 实际应用中可从 JWT Token 中提取，此处由 payload 传入
          documentId: document.id,
          ipAddress: '127.0.0.1', // 实际应用中从 HTTP Request 中获取
        },
      });

      // 若是对账单盖章，同步流转对账单状态为已盖章 (SEALED)
      if (payload.targetType === 'BILLING') {
        await tx.billingStatement.update({
          where: { id: payload.targetId },
          data: { status: 'SEALED' },
        });
      }

      return document;
    });
  }
}
