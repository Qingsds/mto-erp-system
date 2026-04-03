/**
 * 财务对账列表页共享状态编排。
 *
 * 统一处理：
 * - 状态筛选
 * - 分页
 * - 页面摘要
 * - 卡片级操作 loading
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  decimalToNum,
  useGetBilling,
  useUpdateBillingStatus,
} from "@/hooks/api/useBilling"
import {
  BILLING_STATUS_LABEL,
  type BillingFilter,
  formatBillingNo,
} from "./shared"

const PAGE_SIZE = 12

export function useBillingPageController() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<BillingFilter>("all")
  const [page, setPage] = useState(1)
  const [sealTarget, setSealTarget] = useState<{ id: number; no: string } | null>(null)
  const [pendingBillingId, setPendingBillingId] = useState<number | null>(null)

  const updateStatus = useUpdateBillingStatus()

  const listQuery = useGetBilling({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
  })
  const draftCountQuery = useGetBilling({ page: 1, pageSize: 1, status: "DRAFT" })
  const sealedCountQuery = useGetBilling({ page: 1, pageSize: 1, status: "SEALED" })
  const paidCountQuery = useGetBilling({ page: 1, pageSize: 1, status: "PAID" })

  const bills = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data?.data],
  )
  const filteredTotal = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE))

  useEffect(() => {
    if (listQuery.data && page > totalPages) {
      setPage(totalPages)
    }
  }, [listQuery.data, page, totalPages])

  const draftTotal = draftCountQuery.data?.total ?? 0
  const sealedTotal = sealedCountQuery.data?.total ?? 0
  const paidTotal = paidCountQuery.data?.total ?? 0
  const total = draftTotal + sealedTotal + paidTotal

  const statusCounts = {
    all: total,
    DRAFT: draftTotal,
    SEALED: sealedTotal,
    PAID: paidTotal,
  } satisfies Record<BillingFilter, number>

  const statusTabs = useMemo(
    () =>
      (["all", "DRAFT", "SEALED", "PAID"] as const).map(status => ({
        value: status,
        label: BILLING_STATUS_LABEL[status],
        count: statusCounts[status],
      })),
    [statusCounts],
  )

  const currentPageAmount = useMemo(
    () => bills.reduce((sum, bill) => sum + decimalToNum(bill.totalAmount), 0),
    [bills],
  )

  const pendingCount = statusCounts.DRAFT + statusCounts.SEALED

  const subtitle = listQuery.isFetching && !listQuery.isLoading
    ? "刷新中…"
    : `共 ${total} 张对账单 · 待处理 ${pendingCount} 张 · 当前页 ¥${currentPageAmount.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`

  const openCreate = useCallback(() => {
    void navigate({ to: "/billing/new" })
  }, [navigate])

  const handleStatusFilterChange = useCallback((status: BillingFilter) => {
    setStatusFilter(status)
    setPage(1)
  }, [])

  const openSealDialog = useCallback((id: number) => {
    setSealTarget({ id, no: formatBillingNo(id) })
  }, [])

  const closeSealDialog = useCallback(() => {
    setSealTarget(null)
  }, [])

  const markPaid = useCallback(async (id: number) => {
    try {
      setPendingBillingId(id)
      await updateStatus.mutateAsync({ id, status: "PAID" })
    } finally {
      setPendingBillingId(null)
    }
  }, [updateStatus])

  const isBillingUpdating = useCallback((id: number) => (
    pendingBillingId === id && updateStatus.isPending
  ), [pendingBillingId, updateStatus.isPending])

  return {
    page,
    totalPages,
    total,
    bills,
    subtitle,
    statusFilter,
    statusTabs,
    sealTarget,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    setPage,
    openCreate,
    handleStatusFilterChange,
    openSealDialog,
    closeSealDialog,
    markPaid,
    isBillingUpdating,
  }
}
