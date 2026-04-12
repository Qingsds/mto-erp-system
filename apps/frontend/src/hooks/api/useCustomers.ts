import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse } from "@erp/shared-types"
import request from "@/lib/utils/request"
import { toast } from "@/lib/toast"

export interface CustomerListItem {
  id: number
  name: string
  address?: string | null
  contactName?: string | null
  contactPhone?: string | null
  invoiceInfo?: string | null
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CustomerSubmitted = Pick<CustomerListItem, "id" | "name">

export interface CustomerPartItem {
  customerId: number
  partId: number
  createdAt: string
  part: {
    id: number
    partNumber: string
    name: string
    material: string
    spec?: string | null
    commonPrices: Record<string, number>
  }
}

export interface CustomerDetail extends CustomerListItem {
  isActive: boolean
  createdAt: string
  updatedAt: string
  parts: CustomerPartItem[]
  _count: {
    orders: number
  }
}

export interface PaginatedCustomers {
  total: number
  data: CustomerListItem[]
  page: number
  pageSize: number
}

export interface CustomersParams {
  page?: number
  pageSize?: number
  keyword?: string
  isActive?: "true" | "false"
}

interface CustomersQueryOptions {
  enabled?: boolean
}

export const CUSTOMERS_KEYS = {
  list: (p: CustomersParams) => ["customers", p] as const,
  detail: (id: number) => ["customer", id] as const,
}

export function useGetCustomers(
  params: CustomersParams,
  options?: CustomersQueryOptions,
) {
  return useQuery({
    queryKey: CUSTOMERS_KEYS.list(params),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<PaginatedCustomers>>("/api/customers", { params })
        .then(res => res.data!),
    enabled: options?.enabled ?? true,
    placeholderData: prev => prev,
  })
}

export function useGetCustomer(id?: number) {
  return useQuery({
    queryKey: CUSTOMERS_KEYS.detail(id!),
    queryFn: () =>
      request
        .get<unknown, ApiResponse<CustomerDetail>>(`/api/customers/${id}`)
        .then(res => res.data!),
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      name: string
      address?: string | null
      contactName?: string | null
      contactPhone?: string | null
      invoiceInfo?: string | null
    }) => request.post<unknown, ApiResponse<CustomerDetail>>("/api/customers", payload),
    onSuccess: response => {
      const customer = response.data
      if (customer) {
        qc.setQueryData(CUSTOMERS_KEYS.detail(customer.id), customer)
      }
      toast.success("客户创建成功")
      qc.invalidateQueries({ queryKey: ["customers"] })
    },
    onError: (e: Error) => toast.error(`创建失败：${e.message}`),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      id: number
      name?: string
      address?: string | null
      contactName?: string | null
      contactPhone?: string | null
      invoiceInfo?: string | null
    }) => {
      const { id, ...body } = payload
      return request.patch<unknown, ApiResponse<CustomerDetail>>(`/api/customers/${id}`, body)
    },
    onSuccess: (response, vars) => {
      const customer = response.data
      if (customer) {
        qc.setQueryData(CUSTOMERS_KEYS.detail(customer.id), customer)
      }
      toast.success("客户信息已更新")
      qc.invalidateQueries({ queryKey: ["customers"] })
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`更新失败：${e.message}`),
  })
}

export function useUpdateCustomerStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { id: number; isActive: boolean }) =>
      request.patch<unknown, ApiResponse<CustomerDetail>>(
        `/api/customers/${payload.id}/status`,
        { isActive: payload.isActive },
      ),
    onSuccess: (response, vars) => {
      const customer = response.data
      if (customer) {
        qc.setQueryData(CUSTOMERS_KEYS.detail(customer.id), customer)
      }
      toast.success(vars.isActive ? "客户已启用" : "客户已停用")
      qc.invalidateQueries({ queryKey: ["customers"] })
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.detail(vars.id) })
    },
    onError: (e: Error) => toast.error(`状态更新失败：${e.message}`),
  })
}

export function useAddCustomerPart() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { customerId: number; partId: number }) =>
      request.post<unknown, ApiResponse<{ customerId: number; partId: number }>>(
        `/api/customers/${payload.customerId}/parts`,
        { partId: payload.partId },
      ),
    onSuccess: (_, vars) => {
      toast.success("关联零件成功")
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.detail(vars.customerId) })
    },
    onError: (e: Error) => toast.error(`关联失败：${e.message}`),
  })
}

export function useRemoveCustomerPart() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { customerId: number; partId: number }) =>
      request.delete<unknown, ApiResponse<{ customerId: number; partId: number }>>(
        `/api/customers/${payload.customerId}/parts/${payload.partId}`,
      ),
    onSuccess: (_, vars) => {
      toast.success("已解除关联")
      qc.invalidateQueries({ queryKey: CUSTOMERS_KEYS.detail(vars.customerId) })
    },
    onError: (e: Error) => toast.error(`解除失败：${e.message}`),
  })
}
