#!/usr/bin/env node

/**
 * backend 启动前的 Prisma 预检查脚本。
 *
 * 这个脚本会被根级启动入口和 backend 单独启动入口共同复用。
 * 主要目标有三件事：
 * 1. 让 Prisma Client 的生成链在 Windows / macOS 上都尽量稳定
 * 2. 避免继续依赖 `pnpm exec prisma` 这层不稳定中间环节
 * 3. 在产物已经是最新时跳过重复 generate，减少文件锁和无效重建
 */
const fs = require("node:fs")
const path = require("node:path")

const {
  databaseRoot,
  databaseEnvPath,
  generatedClientPath,
  getSchemaFromDatabaseUrl,
  isLocalDatabaseUrl,
  listMigrationNames,
  prepareDatabaseEnv,
  runCommand,
} = require("../../../scripts/dev-utils.cjs")

/**
 * Prisma schema 源文件路径。
 * 用于判断当前源码是否比已生成 client 更新。
 */
const sourceSchemaPath = path.join(databaseRoot, "prisma", "schema.prisma")

/**
 * Prisma generate 后输出的 schema 路径。
 * 用于和其他生成文件一起判断当前 dist 是否完整、是否最新。
 */
const generatedSchemaPath = path.join(generatedClientPath, "schema.prisma")

/**
 * Prisma Client 入口 JS 文件路径。
 * backend 运行时最终会 import 这里的产物。
 */
const generatedIndexPath = path.join(generatedClientPath, "index.js")

/**
 * Prisma Client 类型声明文件路径。
 * 用于确认生成产物是否完整。
 */
const generatedTypesPath = path.join(generatedClientPath, "index.d.ts")

/**
 * Prisma Client 包描述文件路径。
 * 同样作为“生成产物是否完整”的判断条件之一。
 */
const generatedPackagePath = path.join(generatedClientPath, "package.json")

/**
 * 解析当前工作区里的 Prisma CLI 入口文件。
 * 这里固定走本地依赖，避免依赖全局命令或 shell shim。
 *
 * @returns {string} Prisma CLI 的绝对路径
 */
function resolvePrismaCliPath() {
  try {
    return require.resolve("prisma/build/index.js", {
      paths: [databaseRoot],
    })
  } catch (error) {
    throw new Error(
      `[db-sync] Failed to resolve Prisma CLI from ${databaseRoot}: ${error.message}`,
    )
  }
}

/**
 * 执行一条 Prisma CLI 命令。
 * 调用方式统一固定为：当前 Node 进程 + 本地 Prisma CLI 入口 + 参数，
 * 这样 macOS 和 Windows 走的是同一条路径，不再受 `pnpm exec prisma` 影响。
 *
 * @param {string[]} args Prisma CLI 参数，例如 `["generate"]`
 * @returns {Promise<void>} 命令执行完成后结束
 */
function runPrismaCommand(args) {
  const prismaCliPath = resolvePrismaCliPath()

  return runCommand(process.execPath, [prismaCliPath, ...args], {
    cwd: databaseRoot,
    env: process.env,
  })
}

/**
 * 判断 Prisma Client 的关键产物是否都已经存在。
 * 这里只检查 backend 启动真正需要 import 的那几份文件。
 *
 * @returns {boolean} 生成产物是否完整存在
 */
function hasGeneratedClientArtifacts() {
  return [
    generatedSchemaPath,
    generatedIndexPath,
    generatedTypesPath,
    generatedPackagePath,
  ].every(filePath => fs.existsSync(filePath))
}

/**
 * 判断当前 Prisma Client 产物是否仍然是最新的。
 * Prisma 会重排 generated schema 的格式，所以不适合做文本全量比对；
 * 这里改用“源 schema 修改时间 <= 生成产物修改时间”的轻量判断。
 *
 * @returns {boolean} 是否可以直接复用当前 Prisma Client
 */
function isGeneratedClientCurrent() {
  if (!hasGeneratedClientArtifacts()) {
    return false
  }

  try {
    const sourceSchemaStat = fs.statSync(sourceSchemaPath)
    const generatedArtifactTimes = [
      fs.statSync(generatedSchemaPath).mtimeMs,
      fs.statSync(generatedIndexPath).mtimeMs,
      fs.statSync(generatedTypesPath).mtimeMs,
      fs.statSync(generatedPackagePath).mtimeMs,
    ]

    return generatedArtifactTimes.every(
      artifactTime => artifactTime >= sourceSchemaStat.mtimeMs,
    )
  } catch {
    return false
  }
}

/**
 * 读取目标数据库当前 schema 的状态：
 * 1. 是否存在 `_prisma_migrations`
 * 2. 是否已经有业务表
 *
 * @param {import("@prisma/client").PrismaClient} prisma 已初始化的 Prisma Client
 * @param {string} schema 要检查的数据库 schema 名称
 * @returns {Promise<{ hasBusinessTables: boolean; hasMigrationTable: boolean }>} 当前 schema 状态
 */
async function queryDatabaseState(prisma, schema) {
  const [migrationTableRow] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${schema}
        AND table_name = '_prisma_migrations'
    ) AS "exists"
  `
  const [businessTableRow] = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = ${schema}
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
    ) AS "exists"
  `

  return {
    hasBusinessTables: businessTableRow?.exists === true,
    hasMigrationTable: migrationTableRow?.exists === true,
  }
}

/**
 * 判断是否允许对本地旧库启用 db push fallback。
 *
 * @returns {boolean} 是否开启 fallback
 */
function isDbPushFallbackEnabled() {
  return process.env.PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK === "true"
}

/**
 * 生成“旧库但没有 Prisma migration 历史”时的提示文案。
 * 非本地库和本地库会给出不同的引导信息。
 *
 * @param {string} databaseUrl 当前数据库连接串
 * @param {boolean} isLocalDatabase 是否为本地数据库
 * @returns {string} 最终展示给开发者的错误文案
 */
function formatLegacyDatabaseMessage(databaseUrl, isLocalDatabase) {
  const lines = [
    "[db-sync] Detected a legacy database without Prisma migration history.",
    `[db-sync] DATABASE_URL=${databaseUrl}`,
  ]

  if (!isLocalDatabase) {
    lines.push(
      "[db-sync] Automatic db push fallback is blocked because this database is not local.",
      "[db-sync] Recreate the database from migrations or baseline it manually before starting the app.",
    )
    return lines.join("\n")
  }

  lines.push(
    "[db-sync] Automatic db push fallback is disabled by default.",
    "[db-sync] To baseline this local database once, rerun startup with:",
    "[db-sync]   macOS/Linux: PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK=true pnpm dev",
    '[db-sync]   Windows PowerShell: $env:PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK="true"; pnpm dev',
    "[db-sync] Or rebuild the local database from scratch and run pnpm dev again.",
  )

  return lines.join("\n")
}

/**
 * 把现有 migration 目录逐个标记为已应用。
 * 仅在对本地旧库做一次性 baseline 时使用。
 *
 * @returns {Promise<void>} 全部 resolve 完成后结束
 */
async function resolveExistingMigrations() {
  const migrationNames = listMigrationNames()

  for (const migrationName of migrationNames) {
    console.log(`[db-sync] marking migration as applied: ${migrationName}`)
    await runPrismaCommand([
      "migrate",
      "resolve",
      "--applied",
      migrationName,
    ])
  }
}

/**
 * 确保 Prisma Client 已经可用。
 *
 * 这里有两个关键策略：
 * 1. 当前 dist 已最新时，直接跳过 generate
 * 2. Windows 下 generate 因 DLL 文件锁失败，但产物其实已最新时，仍然复用已有 dist
 *
 * @returns {Promise<void>} Prisma Client 已确认可用后结束
 */
async function ensurePrismaClientGenerated() {
  if (isGeneratedClientCurrent()) {
    console.log("[db-sync] Prisma Client is up to date, skipping generate")
    return
  }

  console.log("[db-sync] generating Prisma Client")
  try {
    await runPrismaCommand(["generate"])
  } catch (error) {
    if (isGeneratedClientCurrent()) {
      console.warn(
        "[db-sync] Prisma generate hit a Windows file lock, but the generated client is already current. Reusing existing client.",
      )
      return
    }

    throw error
  }

  try {
    require.resolve(generatedClientPath)
  } catch (error) {
    throw new Error(
      `[db-sync] Prisma Client was not generated at ${generatedClientPath}: ${error.message}`,
    )
  }
}

/**
 * 加载当前生成好的 Prisma Client 构造函数。
 * backend 后续会用它创建真实的数据库连接实例。
 *
 * @returns {typeof import("@prisma/client").PrismaClient} PrismaClient 构造函数
 */
function loadPrismaClient() {
  try {
    const generatedClient = require(generatedClientPath)
    if (typeof generatedClient.PrismaClient !== "function") {
      throw new Error("PrismaClient export is missing")
    }

    return generatedClient.PrismaClient
  } catch (error) {
    throw new Error(
      `[db-sync] Failed to load generated Prisma Client from ${generatedClientPath}: ${error.message}`,
    )
  }
}

/**
 * 执行 backend 启动前的完整 Prisma 同步流程。
 * 会根据数据库现状自动选择：
 * 1. 仅 generate
 * 2. migrate deploy
 * 3. 本地旧库的一次性 db push + resolve + deploy
 *
 * @returns {Promise<void>} 同步完成后结束
 */
async function syncPrismaDatabase() {
  prepareDatabaseEnv()

  const databaseUrl = process.env.DATABASE_URL ?? ""
  const schema = getSchemaFromDatabaseUrl(databaseUrl)
  const isLocalDatabase = isLocalDatabaseUrl(databaseUrl)

  console.log(
    `[db-sync] checking schema "${schema}" on ${isLocalDatabase ? "local" : "non-local"} database`,
  )

  // 先确保 Prisma Client 可用，再去查询数据库状态。
  // 否则后面的 Prisma 实例化本身就会先失败，错误信号会变得很乱。
  await ensurePrismaClientGenerated()

  const PrismaClient = loadPrismaClient()
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  try {
    const state = await queryDatabaseState(prisma, schema)

    if (state.hasMigrationTable) {
      console.log("[db-sync] migration history found, applying pending migrations")
      await runPrismaCommand(["migrate", "deploy"])
      return
    }

    if (!state.hasBusinessTables) {
      console.log("[db-sync] empty schema detected, applying migrations")
      await runPrismaCommand(["migrate", "deploy"])
      return
    }

    if (!isLocalDatabase || !isDbPushFallbackEnabled()) {
      throw new Error(formatLegacyDatabaseMessage(databaseUrl, isLocalDatabase))
    }

    console.log("[db-sync] legacy local schema detected, running one-time db push fallback")
    await runPrismaCommand(["db", "push", "--skip-generate"])

    await resolveExistingMigrations()

    console.log("[db-sync] verifying migration state after baseline")
    await runPrismaCommand(["migrate", "deploy"])
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 允许这个脚本单独作为命令行入口运行。
 * `--dry-run` 只打印环境，不执行真正的数据库同步。
 *
 * @returns {Promise<void>} 入口逻辑执行完成后结束
 */
async function main() {
  prepareDatabaseEnv()

  if (process.argv.slice(2).includes("--dry-run")) {
    const envFileStatus = fs.existsSync(databaseEnvPath)
      ? databaseEnvPath
      : "not found"
    console.log(`[db-sync] database env file: ${envFileStatus}`)
    console.log(`[db-sync] DATABASE_URL=${process.env.DATABASE_URL ?? ""}`)
    console.log(
      `[db-sync] PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK=${process.env.PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK ?? "false"}`,
    )
    return
  }

  await syncPrismaDatabase()
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}

module.exports = {
  syncPrismaDatabase,
}
