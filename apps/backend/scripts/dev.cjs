#!/usr/bin/env node

/**
 * Cross-platform backend dev launcher.
 *
 * Responsibilities:
 * - Load ../../packages/database/.env if present
 * - Apply a safe DATABASE_URL fallback when it is missing
 * - Sync local Prisma schema before backend startup unless skipped
 * - Start Nest in watch mode without relying on shell-specific syntax
 */

const fs = require("node:fs")
const { spawn } = require("node:child_process")

const {
  backendRoot,
  databaseEnvPath,
  prepareDatabaseEnv,
} = require("../../../scripts/dev-utils.cjs")
const { syncPrismaDatabase } = require("./prisma-sync.cjs")

async function run() {
  prepareDatabaseEnv()

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
