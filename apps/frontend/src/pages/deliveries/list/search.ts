/**
 * 发货列表查询参数。
 *
 * 统一负责：
 * - URL query 的校验与归一化
 * - 页面内部使用的筛选状态转换
 */

import type {
  DeliveryFilters,
  DeliveryStatusFilter,
  RemarkFilter,
} from "./filters"

export interface DeliveriesPageSearch {
  keyword?: string
  orderId?: number
  customerName?: string
  deliveryDateStart?: string
  deliveryDateEnd?: string
  hasRemark?: Exclude<RemarkFilter, "all">
  status?: Exclude<DeliveryStatusFilter, "all">
  page?: number
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizePositiveInt(value: unknown) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined
  }

  return parsed
}

function normalizeStatus(value: unknown): DeliveriesPageSearch["status"] {
  return value === "SHIPPED" ? value : undefined
}

function normalizeHasRemark(
  value: unknown,
): DeliveriesPageSearch["hasRemark"] {
  return value === "yes" || value === "no" ? value : undefined
}

export function validateDeliveriesPageSearch(
  search: Record<string, unknown>,
): DeliveriesPageSearch {
  const keyword = normalizeString(search.keyword)
  const orderId = normalizePositiveInt(search.orderId)
  const customerName = normalizeString(search.customerName)
  const deliveryDateStart = normalizeString(search.deliveryDateStart)
  const deliveryDateEnd = normalizeString(search.deliveryDateEnd)
  const hasRemark = normalizeHasRemark(search.hasRemark)
  const status = normalizeStatus(search.status)
  const page = normalizePositiveInt(search.page)

  return {
    ...(keyword ? { keyword } : {}),
    ...(orderId ? { orderId } : {}),
    ...(customerName ? { customerName } : {}),
    ...(deliveryDateStart ? { deliveryDateStart } : {}),
    ...(deliveryDateEnd ? { deliveryDateEnd } : {}),
    ...(hasRemark ? { hasRemark } : {}),
    ...(status ? { status } : {}),
    ...(page && page > 1 ? { page } : {}),
  }
}

export function getDeliveriesSearchState(
  search: DeliveriesPageSearch,
): DeliveryFilters & { page: number } {
  return {
    keyword: search.keyword ?? "",
    orderId: search.orderId ? String(search.orderId) : "",
    customerName: search.customerName ?? "",
    deliveryDateStart: search.deliveryDateStart ?? "",
    deliveryDateEnd: search.deliveryDateEnd ?? "",
    hasRemark: search.hasRemark ?? "all",
    status: search.status ?? "all",
    page: search.page ?? 1,
  }
}

export function buildDeliveriesPageSearch(input: {
  filters: DeliveryFilters
  page: number
}): DeliveriesPageSearch {
  const keyword = input.filters.keyword.trim()
  const customerName = input.filters.customerName.trim()
  const orderId = Number(input.filters.orderId)

  return {
    ...(keyword ? { keyword } : {}),
    ...(Number.isInteger(orderId) && orderId > 0 ? { orderId } : {}),
    ...(customerName ? { customerName } : {}),
    ...(input.filters.deliveryDateStart
      ? { deliveryDateStart: input.filters.deliveryDateStart }
      : {}),
    ...(input.filters.deliveryDateEnd
      ? { deliveryDateEnd: input.filters.deliveryDateEnd }
      : {}),
    ...(input.filters.hasRemark !== "all"
      ? { hasRemark: input.filters.hasRemark }
      : {}),
    ...(input.filters.status !== "all"
      ? { status: input.filters.status }
      : {}),
    ...(input.page > 1 ? { page: input.page } : {}),
  }
}
