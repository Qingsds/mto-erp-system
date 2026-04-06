import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  CreateSealRequest,
  DocumentStatusType,
  DocumentTargetType,
  ExecuteSealRequest,
  UpdateSealStatusRequest,
} from "@erp/shared-types"
import request from "@/lib/utils/request"
import { resolveApiUrl } from "@/lib/utils/request"
import { toast } from "@/lib/toast"

export interface SealListItem {
  id: number
  name: string
  fileKey: string
  originalFileKey?: string | null
  isActive: boolean
}

export interface UploadedSealFile {
  fileKey: string
  originalFileKey: string
  fileName: string
  contentType: string
  size: number
  processedPreviewDataUrl: string
}

export interface SealUsageLogItem {
  id: number
  actionTime: string
  ipAddress?: string | null
  pageIndex?: number | null
  xRatio?: string | number | null
  yRatio?: string | number | null
  widthRatio?: string | number | null
  user: {
    id: number
    username: string
    realName: string
  }
  document: {
    id: number
    fileName: string
    status: DocumentStatusType | string
  }
  targetType: DocumentTargetType | null
  targetId: number | null
}

export interface SealLogsDetail {
  seal: SealListItem
  logs: SealUsageLogItem[]
}

export interface ReprocessSealResult {
  total: number
  updated: number
  skipped: number
  failed: number
  failures: Array<{
    id: number
    name: string
    reason: string
  }>
}

export const SEALS_KEYS = {
  list: () => ["seals"] as const,
  logs: (id: number) => ["seals", "logs", id] as const,
}

export function buildSealFileUrl(sealId: number): string {
  return resolveApiUrl(`/api/seals/${sealId}/file`)
}

async function fetchSealBlob(sealId: number) {
  return request.get<Blob, Blob>(buildSealFileUrl(sealId), {
    responseType: "blob",
  })
}

export function useGetSeals() {
  return useQuery({
    queryKey: SEALS_KEYS.list(),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<SealListItem[]>>("/api/seals")
        .then(res => res.data ?? []),
  })
}

/**
 * 印章预览地址。
 *
 * 通过带鉴权头的请求拉取 blob，再转成 object URL，
 * 避免浏览器直接访问受保护文件接口时丢失 Authorization。
 */
export function useSealPreviewUrl(sealId?: number, cacheKey?: string | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!sealId) {
      setPreviewUrl(null)
      setPreviewError(null)
      setIsLoading(false)
      return
    }

    let currentUrl: string | null = null
    let cancelled = false

    const loadPreview = async () => {
      try {
        setIsLoading(true)
        setPreviewError(null)
        const blob = await fetchSealBlob(sealId)
        if (cancelled) return
        currentUrl = window.URL.createObjectURL(blob)
        setPreviewUrl(currentUrl)
      } catch (error) {
        if (cancelled) return
        setPreviewUrl(null)
        setPreviewError(
          error instanceof Error ? error.message : "印章图片加载失败",
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl)
      }
    }
  }, [cacheKey, sealId])

  return {
    previewUrl,
    previewError,
    isLoading,
  }
}

export function useUploadSeal() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append("file", file)

      return request
        .post<unknown, ApiResponse<UploadedSealFile>>("/api/seals/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then(res => res.data!)
    },
    onError: (e: Error) => toast.error(`上传失败：${e.message}`),
  })
}

export function useDiscardUploadedSeal() {
  return useMutation({
    mutationFn: (payload: { fileKey: string; originalFileKey: string }) =>
      request.delete<unknown, ApiResponse<{ removed: boolean }>>("/api/seals/upload-temp", {
        data: payload,
      }),
  })
}

export function useCreateSeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSealRequest) =>
      request.post<unknown, ApiResponse<SealListItem>>("/api/seals", payload),
    onSuccess: () => {
      toast.success("印章注册成功")
      qc.invalidateQueries({ queryKey: ["seals"] })
    },
    onError: (e: Error) => toast.error(`注册失败：${e.message}`),
  })
}

export function useUpdateSealStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      request
        .patch<unknown, ApiResponse<SealListItem>>(
          `/api/seals/${id}/status`,
          { isActive } satisfies UpdateSealStatusRequest,
        )
        .then(res => res.data!),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "印章已启用" : "印章已停用")
      qc.invalidateQueries({ queryKey: SEALS_KEYS.list() })
      qc.invalidateQueries({ queryKey: SEALS_KEYS.logs(variables.id) })
    },
    onError: (e: Error) => toast.error(`状态更新失败：${e.message}`),
  })
}

export function useReprocessExistingSeals() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () =>
      request
        .post<unknown, ApiResponse<ReprocessSealResult>>("/api/seals/reprocess-existing")
        .then(res => res.data!),
    onSuccess: result => {
      toast.success(
        `补处理完成：更新 ${result.updated} 枚，失败 ${result.failed} 枚`,
      )
      qc.invalidateQueries({ queryKey: SEALS_KEYS.list() })
    },
    onError: (e: Error) => toast.error(`补处理失败：${e.message}`),
  })
}

export function useGetSealLogs(id?: number) {
  return useQuery({
    queryKey: SEALS_KEYS.logs(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<SealLogsDetail>>(`/api/seals/${id}/logs`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function useExecuteSeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ExecuteSealRequest) =>
      request.post<unknown, ApiResponse<unknown>>("/api/documents/seal", payload),
    onSuccess: () => {
      toast.success("盖章成功，归档文件已生成")

      // 本轮前端只开放对账单盖章，因此成功后只刷新对账上下文。
      qc.invalidateQueries({ queryKey: ["billing"] })
      qc.invalidateQueries({ queryKey: SEALS_KEYS.list() })
    },
    onError: (e: Error) => toast.error(`盖章失败：${e.message}`),
  })
}
