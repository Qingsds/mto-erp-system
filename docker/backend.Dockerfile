FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.0 --activate

# 先复制 lockfile 与 package 清单，提升镜像层缓存命中率
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY . .

# Monorepo 必需的构建顺序：generate -> shared-types -> database -> backend
RUN pnpm --filter @erp/database exec prisma generate \
  && pnpm --filter @erp/shared-types build \
  && pnpm --filter @erp/database build \
  && pnpm --filter backend build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @erp/database exec prisma migrate deploy && node apps/backend/dist/main.js"]
