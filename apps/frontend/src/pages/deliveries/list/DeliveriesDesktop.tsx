/**
 * DeliveriesDesktop.tsx
 *
 * 职责：
 * - 发货单列表桌面端布局
 * - 只维护桌面端的显示与筛选输入草稿
 * - 查询、分页、状态切换统一复用 controller
 */

import { useEffect, useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/common/DataTable"
import { StatusFilterBar } from "@/components/common/TableToolbar"
import type { DeliveryListItem } from "@/hooks/api/useDeliveries"
import { getDeliveriesColumns } from "../deliveries.columns"
import {
  DEFAULT_DELIVERY_FILTERS,
  type DeliveryFilters,
} from "./filters"
import { DeliveriesDesktopFilters } from "./DeliveriesDesktopFilters"
import type { DeliveriesPageSearch } from "./search"
import { useDeliveriesPageController } from "./useDeliveriesPageController"

const PAGE_SIZE = 20

interface DeliveriesDesktopProps {
  /** 路由层传入的查询参数。 */
  search: DeliveriesPageSearch
}

/**
 * 桌面端发货单列表。
 */
export function DeliveriesDesktop({ search }: DeliveriesDesktopProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const {
    page,
    filters,
    visibleDeliveries,
    totalCount,
    totalPages,
    statusTabs,
    isLoading,
    isFetching,
    hasActiveFilters,
    setPage,
    applyFilters,
    setStatusFilter,
    resetFilters,
    openDetail,
    openOrders,
  } = useDeliveriesPageController({
    search,
    pageSize: PAGE_SIZE,
  })
  const [draftFilters, setDraftFilters] = useState<DeliveryFilters>(filters)

  useEffect(() => {
    setDraftFilters(filters)
  }, [filters])

  const columns = useMemo(
    () => getDeliveriesColumns(delivery => openDetail(delivery.id)),
    [openDetail],
  )

  const table = useReactTable<DeliveryListItem>({
    data: visibleDeliveries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-background shrink-0 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight leading-none">发货管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFetching && !isLoading
              ? "加载中…"
              : `系统总 ${totalCount} 张 · 当前页 ${visibleDeliveries.length} 张`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openOrders}>
            <i className="ri-external-link-line mr-1.5" />前往订单发货
          </Button>
        </div>
      </div>

      <DeliveriesDesktopFilters
        filters={draftFilters}
        hasActiveFilters={hasActiveFilters}
        onChange={setDraftFilters}
        onApply={() => applyFilters(draftFilters)}
        onReset={() => {
          resetFilters()
          setDraftFilters(DEFAULT_DELIVERY_FILTERS)
        }}
      />

      <DataTable<DeliveryListItem>
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon="ri-truck-line"
        emptyText={hasActiveFilters ? "当前筛选条件下暂无发货单" : "暂无发货单数据"}
        globalFilter={filters.keyword}
        onRowClick={delivery => openDetail(delivery.id)}
        filterBar={
          <StatusFilterBar
            tabs={statusTabs}
            value={filters.status}
            onChange={value => {
              setDraftFilters(prev => ({ ...prev, status: value }))
              setStatusFilter(value)
            }}
            footer={
              totalPages > 1 ? (
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground border-l border-border ml-auto">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer"
                  >
                    <i className="ri-arrow-left-s-line" />
                  </button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30 bg-transparent border-none cursor-pointer"
                  >
                    <i className="ri-arrow-right-s-line" />
                  </button>
                </div>
              ) : undefined
            }
          />
        }
      />
    </div>
  )
}
