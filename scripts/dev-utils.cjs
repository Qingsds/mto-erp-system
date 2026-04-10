#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const { spawn } = require("node:child_process")

const workspaceRoot = path.resolve(__dirname, "..")
const backendRoot = path.resolve(workspaceRoot, "apps/backend")
const databaseRoot = path.resolve(workspaceRoot, "packages/database")
const databaseEnvPath = path.resolve(databaseRoot, ".env")
const databaseEnvExamplePath = path.resolve(databaseRoot, ".env.example")
const migrationsRoot = path.resolve(databaseRoot, "prisma/migrations")
const generatedClientPath = path.resolve(databaseRoot, "dist/generated/client")

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
    result[key] = unquote(rawValue)
  }

  return result
}

function loadDatabaseEnv(targetEnv = process.env) {
  if (!fs.existsSync(databaseEnvPath)) return targetEnv

  const content = fs.readFileSync(databaseEnvPath, "utf8")
  const parsed = parseEnvFile(content)

  for (const [key, value] of Object.entries(parsed)) {
    const currentValue = targetEnv[key]
    if (typeof currentValue === "string" && currentValue.trim() !== "") {
      continue
    }

    if (currentValue != null && currentValue !== "") {
      continue
    }

    targetEnv[key] = value
  }

  return targetEnv
}

function ensureDatabaseUrl(targetEnv = process.env) {
  const current = targetEnv.DATABASE_URL?.trim()
  if (!current) {
    throw new Error(
      `[dev] DATABASE_URL is required. Configure it in ${databaseEnvPath} or export it in your shell. Example: ${databaseEnvExamplePath}`,
    )
  }

  return targetEnv
}

function prepareDatabaseEnv(targetEnv = process.env) {
  loadDatabaseEnv(targetEnv)
  ensureDatabaseUrl(targetEnv)
  return targetEnv
}

function getPnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm"
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  })
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, options)

    child.on("error", reject)
    child.on("exit", code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `Command failed with exit code ${code ?? 1}: ${command} ${args.join(" ")}`,
        ),
      )
    })
  })
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    )
  } catch {
    return false
  }
}

function getSchemaFromDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    return parsed.searchParams.get("schema") || "public"
  } catch {
    return "public"
  }
}

function listMigrationNames() {
  if (!fs.existsSync(migrationsRoot)) return []

  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

module.exports = {
  backendRoot,
  databaseEnvPath,
  databaseEnvExamplePath,
  databaseRoot,
  generatedClientPath,
  getPnpmCommand,
  getSchemaFromDatabaseUrl,
  isLocalDatabaseUrl,
  listMigrationNames,
  loadDatabaseEnv,
  migrationsRoot,
  prepareDatabaseEnv,
  runCommand,
  spawnProcess,
  workspaceRoot,
}
