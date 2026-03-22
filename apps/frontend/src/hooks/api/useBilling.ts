import { useQuery } from "@tanstack/react-query"
import type {
  ApiResponse,
  BillingStatusType,
} from "@erp/shared-types"
import request from "@/lib/utils/request"

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
