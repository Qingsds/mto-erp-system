// packages/database/src/index.ts

// 1. 从 prisma generate 产物中引入（schema 输出到 packages/database/dist/generated）
import { PrismaClient, Prisma } from '../dist/generated/client';


// 3. 实例化 Prisma Client
const prisma = new PrismaClient();


export { PrismaClient, Prisma };
// 4. 导出所有生成的类型（如 Order, Part 等）供外部使用
export * from '../dist/generated/client';
export default prisma;
