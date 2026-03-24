#!/usr/bin/env node

/**
 * Cross-platform backend dev launcher.
 *
 * Responsibilities:
 * - Load ../../packages/database/.env if present
 * - Apply a safe DATABASE_URL fallback when it is missing
 * - Start Nest in watch mode without relying on shell-specific syntax
 */

const fs = require("node:fs")
const path = require("node:path")
const { spawn } = require("node:child_process")

const backendRoot = path.resolve(__dirname, "..")
const databaseEnvPath = path.resolve(
  backendRoot,
  "../../packages/database/.env",
)
const defaultDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:5433/mto_erp?schema=public"

function unquote(value) {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if (
      (first === '"' && last === '"') ||
      (first === "'" && last === "'")
    ) {
      return value.slice(1, -1)
    }
  }
  return value
}

function parseEnvFile(content) {
  const result = {}
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const normalized = trimmed.startsWith("export ")
      ? trimmed.slice(7).trim()
      : trimmed
    const eqIndex = normalized.indexOf("=")
    if (eqIndex <= 0) continue

    const key = normalized.slice(0, eqIndex).trim()
    const rawValue = normalized.slice(eqIndex + 1).trim()
    const value = unquote(rawValue)
    result[key] = value
  }

  return result
}

function loadDatabaseEnv() {
  if (!fs.existsSync(databaseEnvPath)) return

  const content = fs.readFileSync(databaseEnvPath, "utf8")
  const parsed = parseEnvFile(content)
  for (const [key, value] of Object.entries(parsed)) {
    // Keep compatibility with previous shell `source` behavior: env file wins.
    process.env[key] = value
  }
}

function ensureDatabaseUrl() {
  const current = process.env.DATABASE_URL?.trim()
  if (!current) {
    process.env.DATABASE_URL = defaultDatabaseUrl
  }
}

function run() {
  loadDatabaseEnv()
  ensureDatabaseUrl()

  const args = process.argv.slice(2)
  if (args.includes("--dry-run")) {
    const hasEnvFile = fs.existsSync(databaseEnvPath)
    console.log(
      `[dev] database env file: ${hasEnvFile ? databaseEnvPath : "not found"}`,
    )
    console.log(`[dev] DATABASE_URL=${process.env.DATABASE_URL ?? ""}`)
    return
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

run()
