/**
 * 对账详情页下载动作。
 *
 * 统一处理：
 * - Excel 本地导出
 * - 归档 PDF 下载
 * - 页面内错误提示
 */

import { useState } from "react"
import type { BillingDetail, BillingDocument } from "@/hooks/api/useBilling"
import { buildDocumentFileUrl } from "@/hooks/api/useBilling"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(objectUrl)
}

async function resolveActionMessage(
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

export function useBillingDetailDownloads(billing?: BillingDetail) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null)

  const exportExcel = async () => {
    if (!billing) return

    try {
      setActionError(null)
      setIsExportingExcel(true)
      const { exportBillingStatement } = await import("@/lib/documentExport")
      const filename = exportBillingStatement(billing)
      toast.success(`导出成功：${filename}`)
    } catch (error) {
      const message = await resolveActionMessage(error, "Excel 导出失败")
      setActionError(`Excel 导出失败：${message}`)
      toast.error(`Excel 导出失败：${message}`)
    } finally {
      setIsExportingExcel(false)
    }
  }

  const downloadPdf = async (document: BillingDocument) => {
    try {
      setActionError(null)
      setDownloadingDocumentId(document.id)
      const blob = await request.get<Blob, Blob>(buildDocumentFileUrl(document.id), {
        responseType: "blob",
      })
      triggerBrowserDownload(blob, document.fileName)
      toast.success(`下载成功：${document.fileName}`)
    } catch (error) {
      const message = await resolveActionMessage(error, "归档 PDF 下载失败")
      setActionError(`归档 PDF 下载失败：${message}`)
      toast.error(`归档 PDF 下载失败：${message}`)
    } finally {
      setDownloadingDocumentId(null)
    }
  }

  return {
    actionError,
    isExportingExcel,
    downloadingDocumentId,
    exportExcel,
    downloadPdf,
    clearActionError: () => setActionError(null),
  }
}
