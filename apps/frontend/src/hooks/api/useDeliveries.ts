import { useQuery } from "@tanstack/react-query"
import type { ApiResponse } from "@erp/shared-types"
import request from "@/lib/utils/request"

export interface DeliveryListItem {
  id: number
  orderId: number
  deliveryDate: string
  status: string
  remark?: string | null
  totalAmount?: number
  order?: {
    id: number
    customerName: string
    createdAt: string
  }
}

export interface PaginatedDeliveries {
  total: number
  data: DeliveryListItem[]
  page: number
  pageSize: number
}

export interface DeliveryDetailItem {
  id: number
  deliveryNoteId: number
  orderItemId: number
  shippedQty: number
  remark?: string | null
  billingItem?: { id: number; billingId: number } | null
  orderItem: {
    id: number
    orderId: number
    partId: number
    unitPrice: string
    orderedQty: number
    shippedQty: number
    part: {
      id: number
      partNumber: string
      name: string
      material: string
      spec?: string | null
      commonPrices: Record<string, number>
    }
  }
}

export interface DeliveryDetail {
  id: number
  orderId: number
  deliveryDate: string
  status: string
  remark?: string | null
  order?: {
    id: number
    customerName: string
    createdAt: string
  }
  items: DeliveryDetailItem[]
}

export interface DeliveriesParams {
  page?: number
  pageSize?: number
  orderId?: number
  customerId?: number
  customerName?: string
  deliveryDateStart?: string
  deliveryDateEnd?: string
  hasRemark?: boolean
}

export const DELIVERIES_KEYS = {
  list: (p: DeliveriesParams) => ["deliveries", p] as const,
  detail: (id: number) => ["delivery", id] as const,
}

export function useGetDeliveries(params: DeliveriesParams) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedDeliveries>>("/api/deliveries", {
          params,
        })
        .then(res => res.data!),
    placeholderData: prev => prev,
  })
}

export function useGetDelivery(id?: number) {
  return useQuery({
    queryKey: DELIVERIES_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<DeliveryDetail>>(`/api/deliveries/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function decimalToNum(value: string | number): number {
  return typeof value === "string" ? parseFloat(value) : value
}
