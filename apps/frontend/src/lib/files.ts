export function downloadBlob(fileName: string, blob: Blob) {
  const objectUrl = window.URL.createObjectURL(blob)

  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = fileName
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    window.URL.revokeObjectURL(objectUrl)
  }
}

export async function resolveActionMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const payload = error.response.data

    if (payload instanceof Blob) {
      try {
        const text = await payload.text()
        const parsed = JSON.parse(text) as { message?: string }

        if (parsed.message?.trim()) {
          return parsed.message
        }
      } catch {
        // 下载接口失败时优先尝试解析业务消息，解析失败则回退默认文案。
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
