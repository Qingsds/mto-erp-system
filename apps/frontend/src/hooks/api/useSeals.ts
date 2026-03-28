import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse, CreateSealRequest, ExecuteSealRequest } from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

export interface SealListItem {
  id: number
  name: string
  fileKey: string
  isActive: boolean
}

export const SEALS_KEYS = {
  list: () => ["seals"] as const,
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

export function useExecuteSeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ExecuteSealRequest) =>
      request.post<unknown, ApiResponse<unknown>>("/api/documents/seal", payload),
    onSuccess: () => {
      toast.success("盖章成功，对账单已流转为已盖章状态")
      qc.invalidateQueries({ queryKey: ["billing"] })
    },
    onError: (e: Error) => toast.error(`盖章失败：${e.message}`),
  })
}
