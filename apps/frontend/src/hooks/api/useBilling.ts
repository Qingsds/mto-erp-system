import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ApiResponse,
  BillingStatusType,
  CreateBillingRequest,
  DocumentStatusType,
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
  createdBy?: {
    id: number
    realName: string
    role: string
  } | null
  items: BillingItem[]
}

export interface BillingDetailItem {
  id: number
  billingId: number
  deliveryItemId?: number | null
  description?: string | null
  amount: string | number
  deliveryItem?: {
    id: number
    deliveryNoteId: number
    shippedQty: number
    remark?: string | null
    deliveryNote: {
      id: number
      orderId: number
      deliveryDate: string
      status: string
      remark?: string | null
    }
    orderItem: {
      id: number
      orderId: number
      orderedQty: number
      shippedQty: number
      unitPrice: string | number
      part: {
        id: number
        partNumber: string
        name: string
        material: string
        spec?: string | null
      }
    }
  } | null
}

export interface BillingDocumentLog {
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

export interface BillingDocument {
  id: number
  fileName: string
  status: DocumentStatusType | string
  createdAt: string
  fileHash?: string | null
  sealLogs: BillingDocumentLog[]
}

export interface BillingDetail {
  id: number
  customerName: string
  totalAmount: string | number
  status: BillingStatusType
  createdAt: string
  createdBy?: {
    id: number
    realName: string
    role: string
  } | null
  items: BillingDetailItem[]
  documents: BillingDocument[]
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

interface BillingQueryOptions {
  enabled?: boolean
}

export const BILLING_KEYS = {
  list: (p: BillingParams) => ["billing", p] as const,
  detail: (id: number) => ["billing", "detail", id] as const,
}

export function formatBillingNo(id: number): string {
  return `BIL-${String(id).padStart(6, "0")}`
}

export function useGetBilling(
  params: BillingParams,
  options?: BillingQueryOptions,
) {
  return useQuery({
    queryKey: BILLING_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedBilling>>("/api/billing", {
          params,
        })
        .then(res => res.data!),
    enabled: options?.enabled ?? true,
    placeholderData: prev => prev,
  })
}

export function useGetBillingDetail(id?: number) {
  return useQuery({
    queryKey: BILLING_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<BillingDetail>>(`/api/billing/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}

export function useCreateBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBillingRequest) =>
      request
        .post<unknown, ApiResponse<BillingListItem>>("/api/billing", payload)
        .then(res => res.data!),
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
      request
        .patch<unknown, ApiResponse<BillingListItem>>(
          `/api/billing/${id}/status`,
          { status } satisfies UpdateBillingStatusRequest,
        )
        .then(res => res.data!),
    onSuccess: () => {
      toast.success("状态已更新")
      qc.invalidateQueries({ queryKey: ["billing"] })
    },
    onError: (e: Error) => toast.error(`操作失败：${e.message}`),
  })
}
