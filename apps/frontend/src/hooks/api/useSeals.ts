import { useQuery } from "@tanstack/react-query"
import type { ApiResponse } from "@erp/shared-types"
import request from "@/lib/utils/request"

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
