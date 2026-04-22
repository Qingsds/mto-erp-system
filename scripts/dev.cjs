#!/usr/bin/env node

/**
 * 工作区级别的本地开发启动入口。
 *
 * 这个脚本负责统一处理整套前后端联调前的准备动作，避免开发者每次手动：
 * 1. 先补环境变量
 * 2. 再重建 shared-types
 * 3. 再跑 Prisma 预检查
 * 4. 最后分别启动 backend / frontend
 *
 * 固定启动顺序：
 * 1. 把数据库环境变量加载进当前进程
 * 2. 检查并构建 `@erp/shared-types`
 * 3. 执行 backend 的 Prisma 预检查
 * 4. 并行拉起 backend 和 frontend 的 watch/dev 进程
 */
const {
  ensureDatabaseBuilt,
  ensureSharedTypesBuilt,
  getPnpmCommand,
  prepareDatabaseEnv,
  spawnProcess,
  workspaceRoot,
} = require("./dev-utils.cjs")
const { syncPrismaDatabase } = require("../apps/backend/scripts/prisma-sync.cjs")

/**
 * 启动一个由工作区根脚本托管的子进程。
 *
 * @param {string} name 子进程名称，仅用于日志输出
 * @param {string[]} args 传给 pnpm 的参数数组
 * @param {() => void} [onError] 子进程启动失败时的收口回调
 * @returns {import("node:child_process").ChildProcess} 已启动的子进程对象
 */
function startManagedProcess(name, args, onError) {
  const child = spawnProcess(getPnpmCommand(), args, {
    cwd: workspaceRoot,
    env: process.env,
  })

  child.on("error", error => {
    console.error(`[dev] failed to start ${name}:`, error)
    process.exitCode = 1
    onError?.()
  })

  return child
}

async function run() {
  // 根启动器只做一次跨包前置准备，后续子进程就可以专注于各自的 watch 模式。
  prepareDatabaseEnv()
  await ensureSharedTypesBuilt()
  await syncPrismaDatabase()
  await ensureDatabaseBuilt()

  /** @type {boolean} 是否已经进入统一收口流程 */
  let shuttingDown = false

  /** @type {{ name: string; child: import("node:child_process").ChildProcess }[]} 当前托管的子进程列表 */
  let children = []

  /**
   * 统一关闭当前 dev 会话下的所有子进程。
   * 任意一个子进程失败时，整个 dev 会话都应该一起收口，
   * 否则另一个 watcher 会继续占端口，下一次启动看起来就像随机的端口冲突。
   *
   * @param {NodeJS.Signals} signal 发送给子进程的结束信号
   */
  const shutdown = signal => {
    if (shuttingDown) return
    shuttingDown = true

    for (const { child } of children) {
      if (!child.killed) {
        child.kill(signal)
      }
    }
  }

  children = [
    {
      name: "backend",
      child: startManagedProcess(
        "backend",
        ["--filter", "backend", "dev", "--", "--skip-db-sync"],
        () => shutdown("SIGTERM"),
      ),
    },
    {
      name: "frontend",
      child: startManagedProcess(
        "frontend",
        ["--filter", "frontend", "dev"],
        () => shutdown("SIGTERM"),
      ),
    },
  ]

  for (const { name, child } of children) {
    child.on("exit", code => {
      if (!shuttingDown) {
        console.error(`[dev] ${name} exited with code ${code ?? 0}`)
        process.exitCode = code ?? 0
        shutdown("SIGTERM")
      }
    })
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  await Promise.all(
    children.map(
      ({ child }) =>
        new Promise(resolve => {
          child.on("exit", () => resolve())
        }),
    ),
  )
}

run().catch(error => {
  console.error("[dev] startup aborted:", error.message)
  process.exit(1)
})
