/**
 * 发货列表页共享状态编排。
 *
 * 统一处理：
 * - URL query 与筛选状态同步
 * - 列表查询
 * - 关键字过滤、状态过滤
 */

import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  useGetDeliveries,
  type DeliveryListItem,
} from "@/hooks/api/useDeliveries"
import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import { normalizeKeyword } from "../deliveries.utils"
import {
  DEFAULT_DELIVERY_FILTERS,
  type DeliveryFilters,
  type DeliveryStatusFilter,
} from "./filters"
import {
  buildDeliveriesPageSearch,
  getDeliveriesSearchState,
  type DeliveriesPageSearch,
} from "./search"

const EMPTY_DELIVERIES: DeliveryListItem[] = []

interface UseDeliveriesPageControllerOptions {
  search: DeliveriesPageSearch
  pageSize: number
}

export function useDeliveriesPageController({
  search,
  pageSize,
}: UseDeliveriesPageControllerOptions) {
  const navigate = useNavigate()
  const state = getDeliveriesSearchState(search)

  const { data, isLoading, isFetching } = useGetDeliveries({
    page: state.page,
    pageSize,
    orderId: state.orderId ? Number(state.orderId) : undefined,
    customerName: state.customerName || undefined,
    deliveryDateStart: state.deliveryDateStart || undefined,
    deliveryDateEnd: state.deliveryDateEnd || undefined,
    hasRemark:
      state.hasRemark === "all"
        ? undefined
        : state.hasRemark === "yes",
  })

  const deliveries = data?.data ?? EMPTY_DELIVERIES
  const totalCount = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const keyword = normalizeKeyword(state.keyword)

  const filteredByKeyword = useMemo(() => {
    if (!keyword) return deliveries

    return deliveries.filter(delivery => {
      const deliveryNo = formatDeliveryNo(delivery.id).toLowerCase()
      const orderNo = formatOrderNo(delivery.orderId).toLowerCase()
      const customerName = (delivery.order?.customerName ?? "").toLowerCase()
      const remark = (delivery.remark ?? "").toLowerCase()

      return (
        deliveryNo.includes(keyword) ||
        orderNo.includes(keyword) ||
        customerName.includes(keyword) ||
        remark.includes(keyword)
      )
    })
  }, [deliveries, keyword])

  const visibleDeliveries = useMemo(() => {
    if (state.status === "all") return filteredByKeyword
    return filteredByKeyword.filter(item => item.status === state.status)
  }, [filteredByKeyword, state.status])

  const hasActiveFilters =
    state.keyword.length > 0 ||
    state.orderId.length > 0 ||
    state.customerName.length > 0 ||
    state.deliveryDateStart.length > 0 ||
    state.deliveryDateEnd.length > 0 ||
    state.hasRemark !== "all" ||
    state.status !== "all"

  const statusTabs = useMemo(
    () => [
      {
        value: "all" as DeliveryStatusFilter,
        label: "全部",
        count: filteredByKeyword.length,
      },
      {
        value: "SHIPPED" as DeliveryStatusFilter,
        label: "已发货",
        count: filteredByKeyword.filter(
          item => item.status === "SHIPPED",
        ).length,
      },
    ],
    [filteredByKeyword],
  )

  const filters = useMemo(() => ({
    keyword: state.keyword,
    orderId: state.orderId,
    customerName: state.customerName,
    deliveryDateStart: state.deliveryDateStart,
    deliveryDateEnd: state.deliveryDateEnd,
    hasRemark: state.hasRemark,
    status: state.status,
  } satisfies DeliveryFilters), [
    state.customerName,
    state.deliveryDateEnd,
    state.deliveryDateStart,
    state.hasRemark,
    state.keyword,
    state.orderId,
    state.status,
  ])

  const commitSearch = useCallback((next: {
    filters?: DeliveryFilters
    page?: number
  }) => {
    const filters = next.filters ?? {
      keyword: state.keyword,
      orderId: state.orderId,
      customerName: state.customerName,
      deliveryDateStart: state.deliveryDateStart,
      deliveryDateEnd: state.deliveryDateEnd,
      hasRemark: state.hasRemark,
      status: state.status,
    }

    void navigate({
      to: "/deliveries",
      replace: true,
      search: buildDeliveriesPageSearch({
        filters,
        page: next.page ?? state.page,
      }),
    })
  }, [
    navigate,
    state.customerName,
    state.deliveryDateEnd,
    state.deliveryDateStart,
    state.hasRemark,
    state.keyword,
    state.orderId,
    state.page,
    state.status,
  ])

  useEffect(() => {
    if (data && state.page > totalPages) {
      commitSearch({ page: totalPages })
    }
  }, [commitSearch, data, state.page, totalPages])

  const setPage = useCallback((page: number) => {
    commitSearch({ page: Math.max(1, page) })
  }, [commitSearch])

  const applyFilters = useCallback((filters: DeliveryFilters) => {
    commitSearch({ filters, page: 1 })
  }, [commitSearch])

  const setStatusFilter = useCallback((status: DeliveryStatusFilter) => {
    commitSearch({
      filters: {
        keyword: state.keyword,
        orderId: state.orderId,
        customerName: state.customerName,
        deliveryDateStart: state.deliveryDateStart,
        deliveryDateEnd: state.deliveryDateEnd,
        hasRemark: state.hasRemark,
        status,
      },
      page: 1,
    })
  }, [
    commitSearch,
    state.customerName,
    state.deliveryDateEnd,
    state.deliveryDateStart,
    state.hasRemark,
    state.keyword,
    state.orderId,
  ])

  const resetFilters = useCallback(() => {
    commitSearch({
      filters: DEFAULT_DELIVERY_FILTERS,
      page: 1,
    })
  }, [commitSearch])

  const openDetail = useCallback((deliveryId: number) => {
    void navigate({
      to: "/deliveries/$id",
      params: { id: String(deliveryId) },
    })
  }, [navigate])

  const openOrders = useCallback(() => {
    void navigate({ to: "/orders" })
  }, [navigate])

  return {
    page: state.page,
    filters,
    deliveries,
    visibleDeliveries,
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading,
    isFetching,
    setPage,
    applyFilters,
    setStatusFilter,
    resetFilters,
    openDetail,
    openOrders,
  }
}
