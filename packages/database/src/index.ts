// packages/database/src/index.ts

// 1. 从本地生成的目录中引入，彻底切断对 node_modules 的依赖
import { PrismaClient,Prisma } from './generated/client';


// 3. 实例化 Prisma Client
const prisma = new PrismaClient();


export { PrismaClient,Prisma };
// 4. 导出所有生成的类型（如 Order, Part 等）供外部使用
export * from '../dist/generated/client';
export default prisma;