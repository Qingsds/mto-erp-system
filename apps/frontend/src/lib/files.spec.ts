import { afterEach, describe, expect, it, vi } from "vitest"
import { downloadBlob, resolveActionMessage } from "./files"

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("downloadBlob", () => {
  it("触发浏览器下载并回收 object URL", () => {
    const blob = new Blob(["test"])
    const createObjectURL = vi.fn(() => "blob:test")
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const append = vi.fn()
    const remove = vi.fn()

    vi.stubGlobal("window", {
      URL: {
        createObjectURL,
        revokeObjectURL,
      },
    })
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        href: "",
        download: "",
        click,
        remove,
      })),
      body: {
        append,
      },
    })

    downloadBlob("test.txt", blob)

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledOnce()
    expect(append).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test")
  })
})

describe("resolveActionMessage", () => {
  it("优先解析 Blob 中的业务 message", async () => {
    const error = {
      response: {
        data: new Blob([JSON.stringify({ message: "后端失败" })], {
          type: "application/json",
        }),
      },
    }

    await expect(resolveActionMessage(error, "默认失败")).resolves.toBe("后端失败")
  })

  it("Blob 无法解析时回退到 Error.message", async () => {
    const error = Object.assign(new Error("网络失败"), {
      response: {
        data: new Blob(["not-json"], { type: "text/plain" }),
      },
    })

    await expect(resolveActionMessage(error, "默认失败")).resolves.toBe("网络失败")
  })

  it("无可用错误信息时回退到默认文案", async () => {
    await expect(resolveActionMessage(null, "默认失败")).resolves.toBe("默认失败")
  })
})
