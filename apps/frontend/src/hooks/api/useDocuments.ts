/**
 * 文档模块共享接口辅助。
 *
 * 统一负责：
 * - 受保护文档的预览 / 下载地址构造
 * - 通用上传盖章文档的草稿创建
 * - 盖章工作台预览 PDF 的二进制加载
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  DocumentSourceType,
  DocumentStatusType,
} from "@erp/shared-types"
import request, { resolveApiUrl } from "@/lib/utils/request"

export interface ManagedDocumentItem {
  id: number
  fileName: string
  sourceFileName: string | null
  sourceMimeType: string | null
  sourceType: DocumentSourceType | string
  status: DocumentStatusType | string
  createdAt: string
  sealLogs?: ManagedDocumentSealLog[]
}

export interface ManagedDocumentSealLog {
  id: number
  actionTime: string
  ipAddress?: string | null
  pageIndex?: number | null
  xRatio?: string | number | null
  yRatio?: string | number | null
  widthRatio?: string | number | null
  seal: {
    id: number
    name: string
  }
  user: {
    id: number
    username: string
    realName: string
  }
}

export interface ManagedDocumentDetail extends ManagedDocumentItem {
  sourceType: DocumentSourceType | string
  sealLogs: ManagedDocumentSealLog[]
}

export interface ManagedDocumentsParams {
  status?: DocumentStatusType
}

export const DOCUMENTS_KEYS = {
  list: (params: ManagedDocumentsParams) => ["documents", params] as const,
  detail: (id: number) => ["documents", "detail", id] as const,
}

export function buildDocumentFileUrl(documentId: number): string {
  return resolveApiUrl(`/api/documents/${documentId}/file`)
}

export function buildDocumentPreviewUrl(documentId: number): string {
  return resolveApiUrl(`/api/documents/${documentId}/preview`)
}

export function buildBillingPreviewUrl(billingId: number): string {
  return resolveApiUrl(`/api/documents/billing/${billingId}/preview`)
}

export function useUploadSourceDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      return request
        .post<unknown, ApiResponse<ManagedDocumentItem>>(
          "/api/documents/upload-source",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        )
        .then(res => res.data!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] })
    },
  })
}

export function useGetManagedDocuments(params: ManagedDocumentsParams = {}) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<ManagedDocumentItem[]>>("/api/documents", {
          params,
        })
        .then(res => res.data ?? []),
  })
}

export function useGetManagedDocument(id?: number) {
  return useQuery({
    queryKey: DOCUMENTS_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<ManagedDocumentDetail>>(`/api/documents/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

function usePdfPreviewQuery(
  queryKey: readonly unknown[],
  urlFactory: () => string,
  enabled: boolean,
) {
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Uint8Array> => {
      const blob = await request.get<Blob, Blob>(urlFactory(), {
        responseType: "blob",
      })

      return new Uint8Array(await blob.arrayBuffer())
    },
    enabled,
  })

  return {
    pdfBytes: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

export function useBillingSealPreview(billingId?: number) {
  return usePdfPreviewQuery(
    ["billing", "seal-preview", billingId],
    () => buildBillingPreviewUrl(billingId!),
    !!billingId,
  )
}

export function useDocumentSealPreview(documentId?: number) {
  return usePdfPreviewQuery(
    ["documents", "preview", documentId],
    () => buildDocumentPreviewUrl(documentId!),
    !!documentId,
  )
}
