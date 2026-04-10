/**
 * 文档盖章一级页状态编排。
 *
 * 统一处理：
 * - 状态筛选
 * - 列表摘要
 * - 已归档 PDF 预览 / 下载
 * - 跳转到继续盖章工作台
 */

import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useFilePreviewDialog } from "@/hooks/common/useFilePreviewDialog"
import {
  buildDocumentFileUrl,
  buildDocumentPreviewUrl,
  useGetManagedDocuments,
  type ManagedDocumentItem,
} from "@/hooks/api/useDocuments"
import { downloadBlob, resolveActionMessage } from "@/lib/files"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"
import {
  MANAGED_DOCUMENT_STATUS_LABEL,
  type ManagedDocumentFilter,
} from "./shared"

async function fetchSignedDocumentBlob(documentId: number) {
  return request.get<Blob, Blob>(buildDocumentFileUrl(documentId), {
    responseType: "blob",
  })
}

async function fetchDraftDocumentBlob(documentId: number) {
  return request.get<Blob, Blob>(buildDocumentPreviewUrl(documentId), {
    responseType: "blob",
  })
}

export function useDocumentsPageController() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ManagedDocumentFilter>("all")
  const [actionError, setActionError] = useState<string | null>(null)
  const [previewingDocumentId, setPreviewingDocumentId] = useState<number | null>(null)
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number | null>(null)
  const previewDialog = useFilePreviewDialog()

  const listQuery = useGetManagedDocuments()
  const documents = useMemo(
    () => listQuery.data ?? [],
    [listQuery.data],
  )

  const filteredDocuments = useMemo(
    () =>
      statusFilter === "all"
        ? documents
        : documents.filter(document => document.status === statusFilter),
    [documents, statusFilter],
  )

  const counts = useMemo(() => {
    const draft = documents.filter(document => document.status === "DRAFT").length
    const signed = documents.filter(document => document.status === "SIGNED").length

    return {
      all: documents.length,
      DRAFT: draft,
      SIGNED: signed,
    } satisfies Record<ManagedDocumentFilter, number>
  }, [documents])

  const statusTabs = useMemo(
    () =>
      (["all", "DRAFT", "SIGNED"] as const).map(status => ({
        value: status,
        label: MANAGED_DOCUMENT_STATUS_LABEL[status],
        count: counts[status],
      })),
    [counts],
  )

  const subtitle = listQuery.isFetching && !listQuery.isLoading
    ? "刷新中…"
    : `共 ${counts.all} 份文档 · 待盖章 ${counts.DRAFT} 份 · 已归档 ${counts.SIGNED} 份`

  const openCreate = () => {
    void navigate({ to: "/documents/seal" })
  }

  const continueSeal = (id: number) => {
    void navigate({
      to: "/documents/seal",
      search: { documentId: id },
    })
  }

  const downloadPdf = async (document: ManagedDocumentItem) => {
    try {
      setActionError(null)
      setDownloadingDocumentId(document.id)
      const blob = await fetchSignedDocumentBlob(document.id)
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

  const previewPdf = async (document: ManagedDocumentItem) => {
    try {
      setActionError(null)
      setPreviewingDocumentId(document.id)
      const isDraftDocument = document.status === "DRAFT"
      await previewDialog.openPreview({
        title: document.fileName,
        fileKind: "pdf",
        loadPreview: () =>
          isDraftDocument
            ? fetchDraftDocumentBlob(document.id)
            : fetchSignedDocumentBlob(document.id),
        onDownload:
          document.status === "SIGNED"
            ? () => downloadPdf(document)
            : undefined,
      })
    } catch (error) {
      const actionLabel =
        document.status === "DRAFT" ? "草稿 PDF 预览失败" : "归档 PDF 预览失败"
      const message = await resolveActionMessage(error, actionLabel)
      setActionError(`${actionLabel}：${message}`)
      toast.error(`${actionLabel}：${message}`)
    } finally {
      setPreviewingDocumentId(null)
    }
  }

  return {
    documents: filteredDocuments,
    total: counts.all,
    subtitle,
    statusFilter,
    statusTabs,
    actionError,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    previewingDocumentId,
    downloadingDocumentId,
    previewDialog,
    openCreate,
    continueSeal,
    previewPdf,
    downloadPdf,
    clearActionError: () => setActionError(null),
    setStatusFilter,
  }
}
