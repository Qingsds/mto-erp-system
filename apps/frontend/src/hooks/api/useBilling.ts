import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  BillingStatusType,
  CreateBillingRequest,
  UpdateBillingStatusRequest,
} from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

export interface BillingItem {
  id: number
  billingId: number
  deliveryItemId?: number | null
  description?: string | null
  amount: string | number
}

export interface BillingListItem {
  id: number
  customerName: string
  totalAmount: string | number
  status: BillingStatusType
  createdAt: string
  items: BillingItem[]
}

export interface PaginatedBilling {
  total: number
  data: BillingListItem[]
  page: number
  pageSize: number
}

export interface BillingParams {
  page?: number
  pageSize?: number
  status?: BillingStatusType
}

export const BILLING_KEYS = {
  list: (p: BillingParams) => ["billing", p] as const,
}

export function useGetBilling(params: BillingParams) {
  return useQuery({
    queryKey: BILLING_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedBilling>>("/api/billing", {
          params,
        })
        .then(res => res.data!),
    placeholderData: prev => prev,
  })
}

export function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}

export function useCreateBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBillingRequest) =>
      request.post<unknown, ApiResponse<BillingListItem>>("/api/billing", payload),
    onSuccess: () => {
      toast.success("对账单创建成功")
      qc.invalidateQueries({ queryKey: ["billing"] })
    },
    onError: (e: Error) => toast.error(`创建失败：${e.message}`),
  })
}

export function useUpdateBillingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: BillingStatusType }) =>
      request.patch<unknown, ApiResponse<BillingListItem>>(
        `/api/billing/${id}/status`,
        { status } satisfies UpdateBillingStatusRequest,
      ),
    onSuccess: () => {
      toast.success("状态已更新")
      qc.invalidateQueries({ queryKey: ["billing"] })
    },
    onError: (e: Error) => toast.error(`操作失败：${e.message}`),
  })
}
