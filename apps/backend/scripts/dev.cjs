#!/usr/bin/env node

/**
 * backend 单独开发时的启动入口。
 *
 * 这个脚本既会被 `apps/backend` 目录单独调试时使用，
 * 也会被工作区根级 `pnpm dev` 复用来启动 backend 子进程。
 *
 * 固定启动顺序：
 * 1. 从 packages/database/.env 读取数据库环境变量
 * 2. 检查并构建 `@erp/shared-types`
 * 3. 除非显式传入 `--skip-db-sync`，否则执行 Prisma 预检查
 * 4. 用当前 Node 进程拉起 Nest CLI 的 watch 模式
 *
 * 这里仍然使用 `node <nest-bin> start --watch`，而不是 `pnpm exec nest`，
 * 目的是把 backend 启动链从包管理器 shim 中隔离出来，减少平台差异。
 */
const fs = require("node:fs")
const { spawn } = require("node:child_process")

const {
  backendRoot,
  databaseEnvPath,
  ensureDatabaseBuilt,
  ensureSharedTypesBuilt,
  prepareDatabaseEnv,
} = require("../../../scripts/dev-utils.cjs")
const { syncPrismaDatabase } = require("./prisma-sync.cjs")

async function run() {
  // backend 单独启动时，也要和根级启动入口保持一致的前置行为，
  // 避免出现“从根目录能跑、进 apps/backend 就跑不起来”的漂移。
  prepareDatabaseEnv()
  await ensureSharedTypesBuilt()

  /** @type {string[]} 当前脚本接收到的启动参数 */
  const args = process.argv.slice(2)
  if (args.includes("--dry-run")) {
    const hasEnvFile = fs.existsSync(databaseEnvPath)
    console.log(
      `[dev] database env file: ${hasEnvFile ? databaseEnvPath : "not found"}`,
    )
    console.log(`[dev] DATABASE_URL=${process.env.DATABASE_URL ?? ""}`)
    return
  }

  if (!args.includes("--skip-db-sync")) {
    await syncPrismaDatabase()
  }

  await ensureDatabaseBuilt()

  // 从 backend 工作区内部解析 Nest CLI，避免依赖外部 PATH，
  // 也避免再次经过 `pnpm exec` 这一层。
  const nestBin = require.resolve("@nestjs/cli/bin/nest.js", {
    paths: [backendRoot],
  })

  const child = spawn(process.execPath, [nestBin, "start", "--watch"], {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  })

  child.on("exit", code => {
    process.exit(code ?? 0)
  })

  child.on("error", error => {
    console.error("[dev] failed to start backend dev server:", error)
    process.exit(1)
  })
}

run().catch(error => {
  console.error("[dev] failed to start backend dev server:", error)
  process.exit(1)
})
