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
  isActive: boolean
}

export interface UploadedSealFile {
  fileKey: string
  fileName: string
  contentType: string
  size: number
}

export interface SealUsageLogItem {
  id: number
  actionTime: string
  ipAddress?: string | null
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

export const SEALS_KEYS = {
  list: () => ["seals"] as const,
  logs: (id: number) => ["seals", "logs", id] as const,
}

export function buildSealFileUrl(sealId: number): string {
  return resolveApiUrl(`/api/seals/${sealId}/file`)
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
    onSuccess: (_, variables) => {
      toast.success("盖章成功，归档文件已生成")
      if (variables.targetType === "BILLING") {
        qc.invalidateQueries({ queryKey: ["billing"] })
      }
      if (variables.targetType === "ORDER") {
        qc.invalidateQueries({ queryKey: ["orders"] })
      }
      if (variables.targetType === "DELIVERY") {
        qc.invalidateQueries({ queryKey: ["deliveries"] })
      }
      qc.invalidateQueries({ queryKey: SEALS_KEYS.list() })
    },
    onError: (e: Error) => toast.error(`盖章失败：${e.message}`),
  })
}
