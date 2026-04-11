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
  workspaceRoot,
} = require("../../../scripts/dev-utils.cjs")

const sourceSchemaPath = path.join(databaseRoot, "prisma", "schema.prisma")
const generatedSchemaPath = path.join(generatedClientPath, "schema.prisma")
const generatedIndexPath = path.join(generatedClientPath, "index.js")
const generatedTypesPath = path.join(generatedClientPath, "index.d.ts")
const generatedPackagePath = path.join(generatedClientPath, "package.json")

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

// Prisma 相关命令统一通过“当前 Node + 本地 Prisma CLI 入口”执行。
// 这样 macOS 和 Windows 走的是同一条调用链，不依赖 shell shim。
function runPrismaCommand(args) {
  const prismaCliPath = resolvePrismaCliPath()

  return runCommand(process.execPath, [prismaCliPath, ...args], {
    cwd: databaseRoot,
    env: process.env,
  })
}

// 启动前只需要一个足够快的“当前 dist 能不能直接用”的判断。
// 这里检查几份关键产物是否存在，就足以判断 backend 能否正常 import Prisma Client。
function hasGeneratedClientArtifacts() {
  return [
    generatedSchemaPath,
    generatedIndexPath,
    generatedTypesPath,
    generatedPackagePath,
  ].every(filePath => fs.existsSync(filePath))
}

// Prisma 会按自己的格式重写 generated/schema.prisma，
// 所以不能用“文件内容是否完全相等”来判断新旧。
// 这里改用源 schema 修改时间与主要生成产物时间做比较，跨平台更稳。
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

function isDbPushFallbackEnabled() {
  return process.env.PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK === "true"
}

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

// Windows 下 query engine DLL 可能会被其他进程短暂占用。
// 如果 generate 失败但当前产物其实已经是最新，就直接复用已有 dist，
// 避免为了一个无效重建把整个启动流程卡死。
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

async function syncPrismaDatabase() {
  prepareDatabaseEnv()

  const databaseUrl = process.env.DATABASE_URL ?? ""
  const schema = getSchemaFromDatabaseUrl(databaseUrl)
  const isLocalDatabase = isLocalDatabaseUrl(databaseUrl)

  console.log(
    `[db-sync] checking schema "${schema}" on ${isLocalDatabase ? "local" : "non-local"} database`,
  )

  // 先确保 Prisma Client 可用，再去查询数据库状态。
  // 否则后面的 Prisma 实例化本身就会先崩掉，错误信号会变得很混乱。
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

async function main() {
  prepareDatabaseEnv()

  if (process.argv.slice(2).includes("--dry-run")) {
    const envFileStatus = require("node:fs").existsSync(databaseEnvPath)
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
