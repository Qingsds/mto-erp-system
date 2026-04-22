#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const { spawn, spawnSync } = require("node:child_process")

/**
 * 工作区根目录。
 * 所有跨包启动脚本都以它作为统一基准路径，避免不同 cwd 下相对路径漂移。
 */
const workspaceRoot = path.resolve(__dirname, "..")

/**
 * backend 包目录。
 * 用于解析 Nest CLI、本地 backend 脚本和 backend 专属资源。
 */
const backendRoot = path.resolve(workspaceRoot, "apps/backend")

/**
 * database 包目录。
 * Prisma schema、数据库环境变量、生成产物都放在这里。
 */
const databaseRoot = path.resolve(workspaceRoot, "packages/database")

/**
 * shared-types 包目录。
 * 前后端都会消费它的编译产物，因此启动前需要判断它是否过期。
 */
const sharedTypesRoot = path.resolve(workspaceRoot, "packages/shared-types")

/**
 * 数据库环境变量文件路径。
 * 本地开发时如果 shell 没有手动注入 DATABASE_URL，会从这里补齐。
 */
const databaseEnvPath = path.resolve(databaseRoot, ".env")

/**
 * 数据库环境变量示例文件路径。
 * 仅用于报错提示时告诉开发者参考哪份模板。
 */
const databaseEnvExamplePath = path.resolve(databaseRoot, ".env.example")

/**
 * Prisma migration 目录。
 * 预检查阶段会读取这里的 migration 名称，决定是否需要做 resolve。
 */
const migrationsRoot = path.resolve(databaseRoot, "prisma/migrations")

/**
 * Prisma Client 生成目录。
 * backend 运行时实际 import 的就是这里的产物。
 */
const generatedClientPath = path.resolve(databaseRoot, "dist/generated/client")

/**
 * shared-types 源码目录。
 * 用于判断类型包源码是否比 dist 更新。
 */
const sharedTypesSrcRoot = path.resolve(sharedTypesRoot, "src")

/**
 * shared-types 编译产物目录。
 * 启动前会检查这里的时间戳，决定是否需要重新 build。
 */
const sharedTypesDistRoot = path.resolve(sharedTypesRoot, "dist")

/**
 * shared-types 的 tsconfig 路径。
 * 如果只改了编译配置，也应该触发一次重新构建。
 */
const sharedTypesTsconfigPath = path.resolve(sharedTypesRoot, "tsconfig.json")

const databaseSrcRoot = path.resolve(databaseRoot, "src")
const databaseDistRoot = path.resolve(databaseRoot, "dist")
const databaseTsconfigPath = path.resolve(databaseRoot, "tsconfig.json")
const databaseIndexDtsPath = path.resolve(databaseDistRoot, "index.d.ts")

/**
 * 缓存解析后的 pnpm 命令路径。
 * 一次启动过程中只需要解析一次，避免反复扫描 PATH / where.exe。
 *
 * @type {string | null}
 */
let cachedPnpmCommand = null

/**
 * 去掉环境变量值最外层的单双引号。
 * 例如 `.env` 中 `DATABASE_URL="..."` 这种写法需要先解包再使用。
 *
 * @param {string} value 原始字符串值
 * @returns {string} 去掉最外层引号后的结果
 */
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

/**
 * 把 `.env` 文件内容解析成 key-value 对象。
 * 这里不依赖 dotenv，是因为启动脚本只需要非常小的一组能力，
 * 自己解析更可控，也能避免额外引入运行时差异。
 *
 * @param {string} content `.env` 文件原始文本内容
 * @returns {Record<string, string>} 解析后的环境变量映射
 */
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

/**
 * 从 `packages/database/.env` 读取环境变量，并只填充当前进程里还没有值的字段。
 * 这样开发者在 shell 里手动覆盖的值会优先生效，不会被脚本反向覆盖。
 *
 * @param {NodeJS.ProcessEnv} [targetEnv=process.env] 需要被写入的目标环境变量对象
 * @returns {NodeJS.ProcessEnv} 写入后的环境变量对象
 */
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

/**
 * 确保 DATABASE_URL 已经可用。
 * 启动链的后续步骤都会依赖数据库连接，因此这里直接做硬校验。
 *
 * @param {NodeJS.ProcessEnv} [targetEnv=process.env] 待校验的环境变量对象
 * @returns {NodeJS.ProcessEnv} 原样返回，便于链式复用
 */
function ensureDatabaseUrl(targetEnv = process.env) {
  const current = targetEnv.DATABASE_URL?.trim()
  if (!current) {
    throw new Error(
      `[dev] DATABASE_URL is required. Configure it in ${databaseEnvPath} or export it in your shell. Example: ${databaseEnvExamplePath}`,
    )
  }

  return targetEnv
}

/**
 * 为当前启动流程准备数据库环境变量。
 * 这是 root dev / backend dev / Prisma 预检查共用的前置步骤。
 *
 * @param {NodeJS.ProcessEnv} [targetEnv=process.env] 待准备的环境变量对象
 * @returns {NodeJS.ProcessEnv} 准备完成后的环境变量对象
 */
function prepareDatabaseEnv(targetEnv = process.env) {
  loadDatabaseEnv(targetEnv)
  ensureDatabaseUrl(targetEnv)
  return targetEnv
}

/**
 * 标准化 PATH 字符串。
 * Windows 上可能出现 Path / PATH 混用、带引号、带空白项等情况，
 * 这里统一洗成“可遍历目录数组”。
 *
 * @param {string} [envPath=process.env.Path || process.env.PATH || ""] 原始 PATH 文本
 * @returns {string[]} 清洗后的 PATH 目录列表
 */
function getPathEntries(envPath = process.env.Path || process.env.PATH || "") {
  return envPath
    .split(path.delimiter)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => unquote(entry))
}

/**
 * 判断某个路径是否是实际存在的文件。
 *
 * @param {string} filePath 待检查的文件路径
 * @returns {boolean} 是否存在且为文件
 */
function isExistingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

/**
 * 在 PATH 中按目录顺序查找指定可执行文件。
 * Windows 上优先找 `pnpm.exe`，避免优先走到 `pnpm.cmd`。
 *
 * @param {string} fileName 可执行文件名，例如 `pnpm.exe`
 * @returns {string | null} 命中的绝对路径；没找到返回 null
 */
function findExecutableInPath(fileName) {
  for (const directory of getPathEntries()) {
    const candidate = path.join(directory, fileName)
    if (isExistingFile(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * 使用 Windows 自带的 `where.exe` 解析可执行文件路径。
 * 这是 PATH 枚举失败后的兜底手段，适合处理 shim / 版本管理器场景。
 *
 * @param {string} fileName 待解析的命令名，例如 `pnpm`
 * @returns {string | null} 命中的绝对路径；没找到返回 null
 */
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

/**
 * 解析 Windows 下应该使用哪个 pnpm 可执行文件。
 * 优先顺序：
 * 1. PATH 里的 `pnpm.exe`
 * 2. `where.exe` 找到的 `pnpm.exe`
 * 3. PATH 里的 `pnpm.cmd`
 * 4. `where.exe` 找到的 `pnpm.cmd`
 * 5. `where.exe` 直接解析 `pnpm`
 *
 * @returns {string} 可用于 spawn 的命令路径
 */
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

/**
 * 获取当前平台应使用的 pnpm 启动命令。
 * macOS / Linux 直接返回 `pnpm`；
 * Windows 则返回解析后的绝对路径，避免继续踩 `.cmd` 兼容坑。
 *
 * @returns {string} 可用于 child_process.spawn 的命令
 */
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

/**
 * 判断当前错误是否需要退回 Windows shell 模式。
 * 当前已知只有 win32 下的同步 `spawn EINVAL` 需要这样处理。
 *
 * @param {unknown} error spawn 抛出的错误对象
 * @returns {boolean} 是否应该启用 shell 回退
 */
function shouldFallbackToWindowsShell(error) {
  return (
    process.platform === "win32" &&
    error &&
    typeof error === "object" &&
    error.code === "EINVAL"
  )
}

/**
 * 统一的子进程启动入口。
 * 这样所有脚本都共享同一套跨平台兼容逻辑，不会各自实现一遍。
 *
 * @param {string} command 要执行的命令
 * @param {string[]} args 命令参数数组
 * @param {import("node:child_process").SpawnOptions} [options={}] spawn 选项
 * @returns {import("node:child_process").ChildProcess} 已启动的子进程对象
 */
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

/**
 * 以 Promise 形式执行一个命令。
 * 供“预检查 / 预构建 / 预同步”这类需要顺序等待完成的脚本复用。
 *
 * @param {string} command 要执行的命令
 * @param {string[]} args 命令参数数组
 * @param {import("node:child_process").SpawnOptions} [options={}] spawn 选项
 * @returns {Promise<void>} 命令成功结束则 resolve，失败则 reject
 */
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

/**
 * 判断数据库地址是否指向本机。
 * 仅本地数据库才允许某些更激进的 dev fallback，例如 db push baseline。
 *
 * @param {string} databaseUrl 数据库连接串
 * @returns {boolean} 是否为 localhost / 127.0.0.1 / ::1
 */
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

/**
 * 从 DATABASE_URL 中解析 schema 名。
 * 如果 URL 里没有显式 schema，默认按 PostgreSQL 的 public 处理。
 *
 * @param {string} databaseUrl 数据库连接串
 * @returns {string} schema 名称
 */
function getSchemaFromDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    return parsed.searchParams.get("schema") || "public"
  } catch {
    return "public"
  }
}

/**
 * 读取 Prisma migration 目录下的所有 migration 名称。
 * 返回结果会按名称排序，保证 resolve 顺序稳定。
 *
 * @returns {string[]} migration 目录名称列表
 */
function listMigrationNames() {
  if (!fs.existsSync(migrationsRoot)) return []

  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right))
}

/**
 * 递归获取某个文件或目录下最新的修改时间。
 * 用于做“源码是否比产物更新”的轻量判断。
 *
 * @param {string} targetPath 目标文件或目录路径
 * @returns {number} 最新修改时间戳（毫秒）
 */
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

/**
 * 判断目录中是否至少存在一个文件/子目录。
 *
 * @param {string} targetPath 待检查目录路径
 * @returns {boolean} 是否存在可见内容
 */
function hasFiles(targetPath) {
  try {
    return fs.readdirSync(targetPath).length > 0
  } catch {
    return false
  }
}

/**
 * 判断 shared-types 的 dist 是否仍可复用。
 * 这里只做轻量时间戳判断：如果 dist 的最新时间晚于 src 和 tsconfig，
 * 就认为当前产物仍然足够新，不需要在启动时重复 build。
 *
 * @returns {boolean} 是否可以跳过 shared-types 重建
 */
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

function isDatabaseBuildCurrent() {
  if (!isExistingFile(databaseIndexDtsPath)) {
    return false
  }

  const newestSourceTime = Math.max(
    getNewestMtimeMs(databaseSrcRoot),
    getNewestMtimeMs(databaseTsconfigPath),
    getNewestMtimeMs(generatedClientPath),
  )

  return getNewestMtimeMs(databaseIndexDtsPath) >= newestSourceTime
}

async function ensureDatabaseBuilt() {
  if (isDatabaseBuildCurrent()) {
    console.log("[types-sync] @erp/database is up to date, skipping build")
    return
  }

  if (!hasFiles(generatedClientPath)) {
    throw new Error(
      `[types-sync] Prisma Client output not found at ${generatedClientPath}. Run prisma sync/generate first.`,
    )
  }

  const tscBinPath = require.resolve("typescript/bin/tsc", {
    paths: [databaseRoot],
  })

  console.log("[types-sync] building @erp/database")
  await runCommand(process.execPath, [tscBinPath, "-p", databaseTsconfigPath], {
    cwd: databaseRoot,
    env: process.env,
  })
}

/**
 * 启动前自动确保 shared-types 已经构建。
 * 这样 backend / frontend 都不会再因为消费到过期 dist 而报类型缺失。
 *
 * @returns {Promise<void>} 构建完成或确认无需构建后结束
 */
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
  ensureDatabaseBuilt,
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
