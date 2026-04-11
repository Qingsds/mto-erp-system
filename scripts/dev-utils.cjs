#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const { spawn, spawnSync } = require("node:child_process")

const workspaceRoot = path.resolve(__dirname, "..")
const backendRoot = path.resolve(workspaceRoot, "apps/backend")
const databaseRoot = path.resolve(workspaceRoot, "packages/database")
const sharedTypesRoot = path.resolve(workspaceRoot, "packages/shared-types")
const databaseEnvPath = path.resolve(databaseRoot, ".env")
const databaseEnvExamplePath = path.resolve(databaseRoot, ".env.example")
const migrationsRoot = path.resolve(databaseRoot, "prisma/migrations")
const generatedClientPath = path.resolve(databaseRoot, "dist/generated/client")
const sharedTypesSrcRoot = path.resolve(sharedTypesRoot, "src")
const sharedTypesDistRoot = path.resolve(sharedTypesRoot, "dist")
const sharedTypesTsconfigPath = path.resolve(sharedTypesRoot, "tsconfig.json")

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

let cachedPnpmCommand = null

// PATH 在不同终端里可能带引号、空白项，或者同时出现 Path / PATH 两种写法。
// 这里先做一次标准化，后面的可执行文件解析才能不受环境差异影响。
function getPathEntries(envPath = process.env.Path || process.env.PATH || "") {
  return envPath
    .split(path.delimiter)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => unquote(entry))
}

function isExistingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

// Windows 下优先从 PATH 中找到真实可执行文件，
// 避免一上来就去调 pnpm.cmd，踩到当前环境的 Node spawn 兼容问题。
function findExecutableInPath(fileName) {
  for (const directory of getPathEntries()) {
    const candidate = path.join(directory, fileName)
    if (isExistingFile(candidate)) {
      return candidate
    }
  }

  return null
}

// 某些版本管理器会通过 shim 暴露命令，PATH 未必能直接枚举到真实文件。
// 这里用 Windows 自带的 where.exe 做兜底解析。
function findExecutableWithWhere(fileName) {
  try {
    const result = spawnSync("where.exe", [fileName], {
      encoding: "utf8",
      windowsHide: true,
    })

    if (result.status !== 0 || typeof result.stdout !== "string") {
      return null
    }

    const candidates = result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)

    for (const candidate of candidates) {
      if (isExistingFile(candidate)) {
        return candidate
      }
    }
  } catch {
    return null
  }

  return null
}

// Windows 优先选择 pnpm.exe，再回退 pnpm.cmd。
// 这样既能兼容 nvmd / nvm-windows / Corepack / 手动安装，
// 也能规避当前环境里 pnpm.cmd 被 Node 直接拒绝的问题。
function resolveWindowsPnpmCommand() {
  const candidateResolvers = [
    () => findExecutableInPath("pnpm.exe"),
    () => findExecutableWithWhere("pnpm.exe"),
    () => findExecutableInPath("pnpm.cmd"),
    () => findExecutableWithWhere("pnpm.cmd"),
    () => findExecutableWithWhere("pnpm"),
  ]

  for (const resolveCandidate of candidateResolvers) {
    const candidate = resolveCandidate()
    if (candidate) {
      return candidate
    }
  }

  throw new Error(
    "[dev] Unable to resolve a pnpm executable on Windows. Ensure pnpm is installed and available in PATH.",
  )
}

// macOS / Linux 继续保持最简单的 pnpm 调用方式。
// 这些平台的 PATH 与 shell 解析更稳定，不需要额外绕路。
function getPnpmCommand() {
  if (process.platform !== "win32") {
    return "pnpm"
  }

  if (cachedPnpmCommand) {
    return cachedPnpmCommand
  }

  cachedPnpmCommand = resolveWindowsPnpmCommand()
  return cachedPnpmCommand
}

// 当前仓库只在 Windows 上遇到过 spawn 同步抛 EINVAL。
// 一旦命中，就降级为 shell 模式再试一次，让 cmd 负责拉起子进程。
function shouldFallbackToWindowsShell(error) {
  return (
    process.platform === "win32" &&
    error &&
    typeof error === "object" &&
    error.code === "EINVAL"
  )
}

// 所有子进程都统一走这一层，避免平台兼容逻辑散落在多个脚本里。
// 先尝试最直接的 spawn；如果 Windows 同步抛 EINVAL，再回退到 shell 模式。
function spawnProcess(command, args, options = {}) {
  const baseOptions = {
    stdio: "inherit",
    ...options,
  }

  try {
    return spawn(command, args, baseOptions)
  } catch (error) {
    if (!shouldFallbackToWindowsShell(error)) {
      throw error
    }

    return spawn(command, args, {
      ...baseOptions,
      shell: true,
    })
  }
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

function getNewestMtimeMs(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return 0
  }

  const stat = fs.statSync(targetPath)
  if (stat.isFile()) {
    return stat.mtimeMs
  }

  if (!stat.isDirectory()) {
    return 0
  }

  let newest = stat.mtimeMs
  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    const childPath = path.join(targetPath, entry.name)
    newest = Math.max(newest, getNewestMtimeMs(childPath))
  }

  return newest
}

function hasFiles(targetPath) {
  try {
    return fs.readdirSync(targetPath).length > 0
  } catch {
    return false
  }
}

// shared-types 是前后端共同依赖的类型包。
// 这里只做一个轻量 freshness 判断：dist 中最新产物时间只要晚于
// src 和 tsconfig 的最新修改时间，就认为可以直接复用。
function isSharedTypesBuildCurrent() {
  if (!hasFiles(sharedTypesDistRoot)) {
    return false
  }

  const newestSourceTime = Math.max(
    getNewestMtimeMs(sharedTypesSrcRoot),
    getNewestMtimeMs(sharedTypesTsconfigPath),
  )

  return getNewestMtimeMs(sharedTypesDistRoot) >= newestSourceTime
}

// 启动前自动构建 shared-types，避免 backend / frontend 直接消费过期 dist，
// 导致“源码有新类型，但编译产物还是旧的”这类难排查问题。
async function ensureSharedTypesBuilt() {
  if (isSharedTypesBuildCurrent()) {
    console.log("[types-sync] @erp/shared-types is up to date, skipping build")
    return
  }

  const tscBinPath = require.resolve("typescript/bin/tsc", {
    paths: [sharedTypesRoot],
  })

  console.log("[types-sync] building @erp/shared-types")
  await runCommand(process.execPath, [tscBinPath, "-p", sharedTypesTsconfigPath], {
    cwd: sharedTypesRoot,
    env: process.env,
  })
}

module.exports = {
  backendRoot,
  databaseEnvPath,
  databaseEnvExamplePath,
  databaseRoot,
  ensureSharedTypesBuilt,
  generatedClientPath,
  getPnpmCommand,
  getSchemaFromDatabaseUrl,
  isLocalDatabaseUrl,
  listMigrationNames,
  loadDatabaseEnv,
  migrationsRoot,
  prepareDatabaseEnv,
  runCommand,
  sharedTypesRoot,
  spawnProcess,
  workspaceRoot,
}
