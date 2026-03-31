/**
 * 订单列表页共享状态编排。
 *
 * 统一处理：
 * - URL query 与页面筛选状态同步
 * - 列表查询
 * - 分页、状态筛选、搜索、详情跳转
 */

import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useGetOrders } from "@/hooks/api/useOrders"
import { STATUS_LABEL } from "../orders.schema"
import {
  buildOrdersPageSearch,
  getOrdersSearchState,
  type OrdersPageSearch,
  type OrderStatusFilter,
} from "./search"

interface UseOrdersPageControllerOptions {
  search: OrdersPageSearch
  pageSize: number
}

export function useOrdersPageController({
  search,
  pageSize,
}: UseOrdersPageControllerOptions) {
  const navigate = useNavigate()
  const state = getOrdersSearchState(search)
  const debouncedKeyword = useDebouncedValue(state.keyword.trim(), 300)

  const { data, isLoading, isFetching } = useGetOrders({
    page: state.page,
    pageSize,
    status: state.status === "all" ? undefined : state.status,
    customerName: debouncedKeyword || undefined,
  })

  const orders = data?.data ?? []
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasActiveFilters = state.keyword.length > 0 || state.status !== "all"

  const commitSearch = useCallback((next: {
    keyword?: string
    status?: OrderStatusFilter
    page?: number
  }) => {
    void navigate({
      to: "/orders",
      replace: true,
      search: buildOrdersPageSearch({
        keyword: next.keyword ?? state.keyword,
        status: next.status ?? state.status,
        page: next.page ?? state.page,
      }),
    })
  }, [navigate, state.keyword, state.page, state.status])

  useEffect(() => {
    if (data && state.page > totalPages) {
      commitSearch({ page: totalPages })
    }
  }, [commitSearch, data, state.page, totalPages])

  const statusTabs = useMemo(
    () => [
      { value: "all" as const, label: "全部" },
      { value: "PENDING" as const, label: STATUS_LABEL.PENDING },
      {
        value: "PARTIAL_SHIPPED" as const,
        label: STATUS_LABEL.PARTIAL_SHIPPED,
      },
      { value: "SHIPPED" as const, label: STATUS_LABEL.SHIPPED },
      {
        value: "CLOSED_SHORT" as const,
        label: STATUS_LABEL.CLOSED_SHORT,
      },
    ],
    [],
  )

  return {
    keyword: state.keyword,
    statusFilter: state.status,
    page: state.page,
    orders,
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading,
    isFetching,
    setKeyword: (keyword: string) =>
      commitSearch({ keyword, page: 1 }),
    setStatusFilter: (status: OrderStatusFilter) =>
      commitSearch({ status, page: 1 }),
    setPage: (page: number) =>
      commitSearch({ page: Math.max(1, page) }),
    resetFilters: () =>
      commitSearch({ keyword: "", status: "all", page: 1 }),
    openDetail: (orderId: number) => {
      void navigate({
        to: "/orders/$id",
        params: { id: String(orderId) },
      })
    },
    openCreate: () => {
      void navigate({ to: "/orders/new" })
    },
  }
}
