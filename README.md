# MTO (无库存) ERP 管理系统

本项目是一个基于无库存按单生产 (Make-To-Order) 模式的轻量级 ERP 系统。涵盖从销售订单价格快照、发货单分批交付、到最终费用清单合并结算的完整业务流，并集成物理哈希防篡改的电子签章工作流。

## 技术栈选型
- **包管理工具**: pnpm (Monorepo 架构)
- **前端**: React + Vite + TypeScript (`apps/frontend`)
- **后端**: NestJS + TypeScript (`apps/backend`)
- **数据持久层**: PostgreSQL + Prisma (`@erp/database`)
- **共享类型库**: `@erp/shared-types`
- **对象存储**: MinIO (用于图纸与印章归档)

---


### 1. 拉取代码与安装依赖
项目采用 pnpm Workspace 架构，**严禁使用 npm 或 yarn**。拉取代码后，必须在根目录执行依赖安装以建立跨包的软链接。

```bash
git pull origin main
pnpm install
```

### 2. 生成 Prisma Client 类型声明
Prisma Client 的 TypeScript 类型定义是基于系统环境动态生成的，不包含在 Git 版本控制中。必须手动生成本地类型，否则编辑器将出现大面积的模块缺失报错。

```bash
cd packages/database
npx prisma generate
```

### 3. 配置本地环境变量
系统底层依赖数据库连接，配置文件 `.env` 已在 `.gitignore` 中排除。
请在 `packages/database` 目录下手动创建 `.env` 文件，并根据你的实际开发环境（连接 NAS 测试库或本地自建 Docker）填入以下内容：

```env
# 请根据实际情况修改 IP 和密码
# 格式：postgresql://用户名:密码@IP地址:端口/数据库名?schema=public
DATABASE_URL="postgresql://postgres:你的密码@你的IP:5433/mto_erp?schema=public"
```

### 4. 数据库结构同步
在后续开发中，若拉取代码后发现 `packages/database/prisma/schema.prisma` 文件有更新，需同步最新表结构到你的开发数据库：

```bash
cd packages/database
npx prisma db push
```

---

## 代码与分支规范

1. **主分支保护**: 严禁直接在 `main` 分支上提交代码。
2. **分支命名**:
   - 新功能开发: `feat/功能名称` (如 `feat/order-module`)
   - Bug 修复: `fix/问题描述` (如 `fix/price-calc-error`)
   - 基建与配置: `chore/配置说明` (如 `chore/update-deps`)
3. **提交流程**: 开发完成后推送到远端，由代码审查者确认无误后，通过 Pull Request (PR) 合并至 `main`。