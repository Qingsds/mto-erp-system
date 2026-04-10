#!/usr/bin/env node

const {
  databaseEnvPath,
  generatedClientPath,
  getPnpmCommand,
  getSchemaFromDatabaseUrl,
  isLocalDatabaseUrl,
  listMigrationNames,
  prepareDatabaseEnv,
  runCommand,
  workspaceRoot,
} = require("../../../scripts/dev-utils.cjs")

const prismaGenerateArgs = [
  "--filter",
  "@erp/database",
  "exec",
  "prisma",
  "generate",
]
const prismaMigrateDeployArgs = [
  "--filter",
  "@erp/database",
  "exec",
  "prisma",
  "migrate",
  "deploy",
]
const prismaDbPushArgs = [
  "--filter",
  "@erp/database",
  "exec",
  "prisma",
  "db",
  "push",
  "--skip-generate",
]

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

async function resolveExistingMigrations(pnpmCommand) {
  const migrationNames = listMigrationNames()

  for (const migrationName of migrationNames) {
    console.log(`[db-sync] marking migration as applied: ${migrationName}`)
    await runCommand(
      pnpmCommand,
      [
        "--filter",
        "@erp/database",
        "exec",
        "prisma",
        "migrate",
        "resolve",
        "--applied",
        migrationName,
      ],
      {
        cwd: workspaceRoot,
        env: process.env,
      },
    )
  }
}

async function ensurePrismaClientGenerated(pnpmCommand) {
  console.log("[db-sync] generating Prisma Client")
  await runCommand(pnpmCommand, prismaGenerateArgs, {
    cwd: workspaceRoot,
    env: process.env,
  })

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
  const pnpmCommand = getPnpmCommand()

  console.log(
    `[db-sync] checking schema "${schema}" on ${isLocalDatabase ? "local" : "non-local"} database`,
  )

  await ensurePrismaClientGenerated(pnpmCommand)

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
      await runCommand(pnpmCommand, prismaMigrateDeployArgs, {
        cwd: workspaceRoot,
        env: process.env,
      })
      return
    }

    if (!state.hasBusinessTables) {
      console.log("[db-sync] empty schema detected, applying migrations")
      await runCommand(pnpmCommand, prismaMigrateDeployArgs, {
        cwd: workspaceRoot,
        env: process.env,
      })
      return
    }

    if (!isLocalDatabase || !isDbPushFallbackEnabled()) {
      throw new Error(formatLegacyDatabaseMessage(databaseUrl, isLocalDatabase))
    }

    console.log("[db-sync] legacy local schema detected, running one-time db push fallback")
    await runCommand(pnpmCommand, prismaDbPushArgs, {
      cwd: workspaceRoot,
      env: process.env,
    })

    await resolveExistingMigrations(pnpmCommand)

    console.log("[db-sync] verifying migration state after baseline")
    await runCommand(pnpmCommand, prismaMigrateDeployArgs, {
      cwd: workspaceRoot,
      env: process.env,
    })
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
