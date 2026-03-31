/**
 * 订单列表页查询参数。
 *
 * 统一负责：
 * - URL query 的校验与归一化
 * - 页面内部使用的筛选状态转换
 */

import type { OrderStatusType } from "@erp/shared-types"

export type OrderStatusFilter = OrderStatusType | "all"

export interface OrdersPageSearch {
  keyword?: string
  status?: OrderStatusType
  page?: number
}

const ORDER_STATUS_SET = new Set<OrderStatusType>([
  "PENDING",
  "PARTIAL_SHIPPED",
  "SHIPPED",
  "CLOSED_SHORT",
])

function normalizeKeyword(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const keyword = value.trim()
  return keyword ? keyword : undefined
}

function normalizeStatus(value: unknown): OrderStatusType | undefined {
  return typeof value === "string" && ORDER_STATUS_SET.has(value as OrderStatusType)
    ? (value as OrderStatusType)
    : undefined
}

function normalizePage(value: unknown): number | undefined {
  const page = Number(value)
  if (!Number.isInteger(page) || page <= 1) {
    return undefined
  }
  return page
}

export function validateOrdersPageSearch(
  search: Record<string, unknown>,
): OrdersPageSearch {
  const keyword = normalizeKeyword(search.keyword)
  const status = normalizeStatus(search.status)
  const page = normalizePage(search.page)

  return {
    ...(keyword ? { keyword } : {}),
    ...(status ? { status } : {}),
    ...(page ? { page } : {}),
  }
}

export function getOrdersSearchState(search: OrdersPageSearch) {
  return {
    keyword: search.keyword ?? "",
    status: (search.status ?? "all") as OrderStatusFilter,
    page: search.page ?? 1,
  }
}

export function buildOrdersPageSearch(input: {
  keyword: string
  status: OrderStatusFilter
  page: number
}): OrdersPageSearch {
  const keyword = input.keyword.trim()

  return {
    ...(keyword ? { keyword } : {}),
    ...(input.status !== "all" ? { status: input.status } : {}),
    ...(input.page > 1 ? { page: input.page } : {}),
  }
}
