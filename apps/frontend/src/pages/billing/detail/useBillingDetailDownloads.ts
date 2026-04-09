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
import { buildDocumentFileUrl } from "@/hooks/api/useDocuments"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"
import { downloadBlob, resolveActionMessage } from "@/lib/files"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

async function fetchBillingDocumentBlob(documentId: number) {
  return request.get<Blob, Blob>(buildDocumentFileUrl(documentId), {
    responseType: "blob",
  })
}

export function useBillingDetailDownloads(billing?: BillingDetail) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null)
  const [previewingDocumentId, setPreviewingDocumentId] = useState<number | null>(null)
  const previewDialog = useFilePreviewDialog()

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
      const blob = await fetchBillingDocumentBlob(document.id)
      downloadBlob(document.fileName, blob)
      toast.success(`下载成功：${document.fileName}`)
    } catch (error) {
      const message = await resolveActionMessage(error, "归档 PDF 下载失败")
      setActionError(`归档 PDF 下载失败：${message}`)
      toast.error(`归档 PDF 下载失败：${message}`)
    } finally {
      setDownloadingDocumentId(null)
    }
  }

  const previewPdf = async (document: BillingDocument) => {
    try {
      setActionError(null)
      setPreviewingDocumentId(document.id)
      await previewDialog.openPreview({
        title: document.fileName,
        fileKind: "pdf",
        loadPreview: () => fetchBillingDocumentBlob(document.id),
        onDownload: () => downloadPdf(document),
      })
    } catch (error) {
      const message = await resolveActionMessage(error, "归档 PDF 预览失败")
      setActionError(`归档 PDF 预览失败：${message}`)
      toast.error(`归档 PDF 预览失败：${message}`)
    } finally {
      setPreviewingDocumentId(null)
    }
  }

  return {
    actionError,
    isExportingExcel,
    downloadingDocumentId,
    previewingDocumentId,
    exportExcel,
    downloadPdf,
    previewPdf,
    previewDialog,
    clearActionError: () => setActionError(null),
  }
}
