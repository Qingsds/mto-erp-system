// apps/backend/src/seals/seals.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSealRequest } from '@erp/shared-types';

@Injectable()
export class SealsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. 注册新印章
  async createSeal(payload: CreateSealRequest) {
    return await this.prisma.client.seal.create({
      data: {
        name: payload.name,
        fileKey: payload.fileKey,
        isActive: true,
      },
    });
  }

  // 2. 查询所有可用印章
  async findAllActive() {
    return await this.prisma.client.seal.findMany({
      where: { isActive: true },
      orderBy: { id: 'desc' },
    });
  }
}
