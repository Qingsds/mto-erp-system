// packages/database/src/index.ts

// 1. 从本地生成的目录中引入，彻底切断对 node_modules 的依赖
import { PrismaClient } from './generated/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 2. 初始化连接池与适配器
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. 实例化 Prisma Client
const prisma = new PrismaClient({ adapter });

// 4. 导出所有生成的类型（如 Order, Part 等）供外部使用
export * from './generated/client';
export default prisma;