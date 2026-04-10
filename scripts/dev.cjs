#!/usr/bin/env node

const {
  getPnpmCommand,
  prepareDatabaseEnv,
  spawnProcess,
  workspaceRoot,
} = require("./dev-utils.cjs")
const { syncPrismaDatabase } = require("../apps/backend/scripts/prisma-sync.cjs")

function startManagedProcess(name, args) {
  const child = spawnProcess(getPnpmCommand(), args, {
    cwd: workspaceRoot,
    env: process.env,
  })

  child.on("error", error => {
    console.error(`[dev] failed to start ${name}:`, error)
    process.exitCode = 1
  })

  return child
}

async function run() {
  prepareDatabaseEnv()
  await syncPrismaDatabase()

  const children = [
    {
      name: "backend",
      child: startManagedProcess("backend", [
        "--filter",
        "backend",
        "dev",
        "--",
        "--skip-db-sync",
      ]),
    },
    {
      name: "frontend",
      child: startManagedProcess("frontend", ["--filter", "frontend", "dev"]),
    },
  ]

  let shuttingDown = false

  const shutdown = signal => {
    if (shuttingDown) return
    shuttingDown = true

    for (const { child } of children) {
      if (!child.killed) {
        child.kill(signal)
      }
    }
  }

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
