// apps/backend/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import prisma, { PrismaClient } from '@erp/database'; // 引入我们在 database 包中导出的单例

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // 将实例暴露为 public 属性，供其他模块调用

  public readonly client: PrismaClient = prisma;

  async onModuleInit() {
    // NestJS 启动时建立连接
    await this.client.$connect();
  }

  async onModuleDestroy() {
    // NestJS 停止时断开连接，防止连接数爆满
    await this.client.$disconnect();
  }
}
