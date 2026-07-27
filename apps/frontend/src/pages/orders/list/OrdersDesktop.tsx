import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import type { MergedOrderListItem } from "@erp/shared-types"
import { DataTable } from "@/components/common/DataTable"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { StatusFilterBar, TableToolbar } from "@/components/common/TableToolbar"
import { Button } from "@/components/ui/button"
import type { OrderListItem } from "@/hooks/api/useOrders"
import { useCanViewMoney, useIsAdmin } from "@/lib/permissions"
import { getOrdersColumns } from "../orders.columns"
import { CreateMergedOrderDialog } from "./CreateMergedOrderDialog"
import { getMergedOrderColumns } from "./mergedOrdersList"
import type { OrdersPageSearch } from "./search"
import { useOrderMergeSelection } from "./useOrderMergeSelection"
import { useOrdersPageController } from "./useOrdersPageController"

const PAGE_SIZE = 20

interface OrdersDesktopProps {
  search: OrdersPageSearch
}

type DraftRow = {
  id: number
  customerName?: string | null
  targetDate?: string | null
  updatedAt: string
  itemCount: number
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10)
}

export function OrdersDesktop({ search }: OrdersDesktopProps) {
  const navigate = useNavigate()
  const canViewMoney = useCanViewMoney()
  const isAdmin = useIsAdmin()
  const [sorting, setSorting] = useState<SortingState>([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const mergeSelection = useOrderMergeSelection()
  const {
    keyword,
    statusFilter,
    tab,
    page,
    orders,
    drafts,
    mergedOrders,
    totalCount,
    totalPages,
    statusTabs,
    hasActiveFilters,
    isLoading,
    isFetching,
    setKeyword,
    setStatusFilter,
    setPage,
    resetFilters,
    openDetail,
    openDraft,
    openMergedOrder,
    openCreate,
  } = useOrdersPageController({ search, pageSize: PAGE_SIZE })

  const draftColumns = useMemo<ColumnDef<DraftRow>[]>(() => [
    {
      accessorKey: "customerName",
      header: "客户",
      size: 280,
      cell: ({ row }) => (
        <div className='min-w-0'>
          <button
            type='button'
            className='truncate text-left text-sm font-medium hover:text-primary'
            onClick={event => {
              event.stopPropagation()
              openDraft(row.original.id)
            }}
          >
            {row.original.customerName?.trim() || "未选择客户"}
          </button>
          <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
            最近更新：{formatDate(row.original.updatedAt)}
          </p>
        </div>
      ),
    },
    {
      id: "targetDate",
      header: "交期",
      size: 120,
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground'>
          {formatDate(row.original.targetDate)}
        </span>
      ),
    },
    {
      id: "items",
      header: "明细",
      size: 100,
      cell: ({ row }) => (
        <span className='font-mono text-sm text-muted-foreground'>
          {row.original.itemCount}
        </span>
      ),
    },
  ], [openDraft])

  const orderColumns = useMemo<ColumnDef<OrderListItem>[]>(() => {
    const businessColumns = getOrdersColumns(
      order => openDetail(order.id),
      { canViewMoney },
    )
    if (!isAdmin) return businessColumns

    const selectableOrders = orders.filter(
      order => !mergeSelection.getDisabledReason(order),
    )
    const allVisibleSelected = selectableOrders.length > 0
      && selectableOrders.every(order => mergeSelection.selectedIds.has(order.id))
    const selectionColumn: ColumnDef<OrderListItem> = {
      id: "select",
      size: 44,
      enableSorting: false,
      header: () => (
        <input
          type='checkbox'
          aria-label='选择当前页可合并订单'
          checked={allVisibleSelected}
          disabled={selectableOrders.length === 0}
          onChange={() => mergeSelection.toggleVisibleOrders(orders)}
          onClick={event => event.stopPropagation()}
          className='size-4 accent-primary disabled:opacity-30'
        />
      ),
      cell: ({ row }) => {
        const reason = mergeSelection.getDisabledReason(row.original)
        return (
          <span title={reason ?? undefined}>
            <input
              type='checkbox'
              aria-label={`选择订单 ${row.original.id}`}
              checked={mergeSelection.selectedIds.has(row.original.id)}
              disabled={!!reason}
              onChange={() => mergeSelection.toggleOrder(row.original)}
              onClick={event => event.stopPropagation()}
              className='size-4 accent-primary disabled:opacity-30'
            />
          </span>
        )
      },
    }
    return [selectionColumn, ...businessColumns]
  }, [canViewMoney, isAdmin, mergeSelection, openDetail, orders])

  const mergedColumns = useMemo(
    () => getMergedOrderColumns(item => openMergedOrder(item.id)),
    [openMergedOrder],
  )

  const ordersTable = useReactTable({
    data: orders,
    columns: orderColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })
  const draftsTable = useReactTable<DraftRow>({
    data: drafts as DraftRow[],
    columns: draftColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })
  const mergedTable = useReactTable<MergedOrderListItem>({
    data: mergedOrders,
    columns: mergedColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })

  const pagination = totalPages > 1 ? (
    <div className='ml-auto flex items-center gap-2 border-l border-border px-2 text-xs text-muted-foreground'>
      <button
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
      >
        <i className='ri-arrow-left-s-line' />
      </button>
      <span>{page} / {totalPages}</span>
      <button
        onClick={() => setPage(page + 1)}
        disabled={page >= totalPages}
        className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
      >
        <i className='ri-arrow-right-s-line' />
      </button>
    </div>
  ) : undefined

  const toolbar = (
    <TableToolbar
      title='订单管理'
      count={
        isFetching && !isLoading
          ? "加载中…"
          : tab === "drafts"
            ? `共 ${totalCount} 条草稿`
            : tab === "merged"
              ? `共 ${totalCount} 条合并订单`
              : `共 ${totalCount} 条订单`
      }
      globalFilter={keyword}
      onFilterChange={setKeyword}
      searchPlaceholder={
        tab === "merged" ? "搜索合并单号、客户或备注…" : "搜索客户名称…"
      }
      extra={
        <div className='flex items-center gap-1'>
          {isAdmin && tab === "orders" && mergeSelection.selectedOrders.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs'
              onClick={mergeSelection.clearSelection}
            >
              清除已选 {mergeSelection.selectedOrders.length} 张
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-2 text-xs'
              onClick={resetFilters}
            >
              重置筛选
            </Button>
          )}
        </div>
      }
      actions={tab !== "merged" ? (
        <div className='flex gap-2'>
          {isAdmin && tab === "orders" && (
            <Button
              size='sm'
              variant='outline'
              disabled={mergeSelection.selectedOrders.length < 2}
              onClick={() => setMergeDialogOpen(true)}
            >
              <i className='ri-links-line mr-1.5' />
              合并订单
              {mergeSelection.selectedOrders.length > 0
                ? ` (${mergeSelection.selectedOrders.length})`
                : ""}
            </Button>
          )}
          <Button
            size='sm'
            variant='outline'
            onClick={() => navigate({ to: "/orders/quick" })}
          >
            <i className='ri-file-upload-line mr-1.5' />
            快捷图纸建单
          </Button>
          <Button size='sm' onClick={openCreate}>
            <i className='ri-add-line mr-1.5' />
            新建订单
          </Button>
        </div>
      ) : undefined}
    />
  )
  const filterBar = (
    <StatusFilterBar
      tabs={statusTabs}
      value={statusFilter}
      onChange={setStatusFilter}
      footer={pagination}
    />
  )

  return (
    <TopLevelPageWrapper fillHeight inset='flush'>
      {tab === "drafts" ? (
        <DataTable
          table={draftsTable}
          columns={draftColumns}
          isLoading={isLoading}
          emptyIcon='ri-file-list-3-line'
          emptyText='暂无订单草稿'
          globalFilter={keyword}
          onRowClick={row => openDraft(row.id)}
          toolbar={toolbar}
          filterBar={filterBar}
        />
      ) : tab === "merged" ? (
        <DataTable
          table={mergedTable}
          columns={mergedColumns}
          isLoading={isLoading}
          emptyIcon='ri-links-line'
          emptyText='暂无合并订单'
          globalFilter={keyword}
          onRowClick={row => openMergedOrder(row.id)}
          toolbar={toolbar}
          filterBar={filterBar}
        />
      ) : (
        <DataTable
          table={ordersTable}
          columns={orderColumns}
          isLoading={isLoading}
          emptyIcon='ri-file-list-3-line'
          emptyText='暂无订单数据'
          globalFilter={keyword}
          onRowClick={row => openDetail(row.id)}
          toolbar={toolbar}
          filterBar={filterBar}
        />
      )}

      <CreateMergedOrderDialog
        open={mergeDialogOpen}
        orders={mergeSelection.selectedOrders}
        onOpenChange={setMergeDialogOpen}
        onCreated={mergedOrder => {
          mergeSelection.clearSelection()
          openMergedOrder(mergedOrder.id)
        }}
      />
    </TopLevelPageWrapper>
  )
}
