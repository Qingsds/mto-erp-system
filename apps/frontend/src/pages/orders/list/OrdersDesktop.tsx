/**
 * 桌面端订单列表。
 *
 * 重点保留表格扫描效率，并补齐：
 * - 搜索 / 状态 / 页码持久化到 URL
 * - 工具栏显式重置入口
 * - 列表逻辑从页面入口拆出
 */

import { useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { DataTable } from "@/components/common/DataTable"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import {
  StatusFilterBar,
  TableToolbar,
} from "@/components/common/TableToolbar"
import { Button } from "@/components/ui/button"
import { useCanViewMoney } from "@/lib/permissions"
import { getOrdersColumns } from "../orders.columns"
import type { OrdersPageSearch } from "./search"
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
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toISOString().slice(0, 10)
}

export function OrdersDesktop({ search }: OrdersDesktopProps) {
  const navigate = useNavigate()
  const canViewMoney = useCanViewMoney()
  const [sorting, setSorting] = useState<SortingState>([])
  const {
    keyword,
    statusFilter,
    tab,
    page,
    orders,
    drafts,
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
    openCreate,
  } = useOrdersPageController({
    search,
    pageSize: PAGE_SIZE,
  })

  const draftColumns = useMemo<ColumnDef<DraftRow>[]>(
    () => [
      {
        accessorKey: "customerName",
        header: "客户",
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <button
              type="button"
              className="truncate text-left text-sm font-medium text-foreground hover:text-primary"
              onClick={event => {
                event.stopPropagation()
                openDraft(row.original.id)
              }}
            >
              {row.original.customerName?.trim() ? row.original.customerName : "未选择客户"}
            </button>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
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
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.targetDate)}
          </span>
        ),
      },
      {
        id: "items",
        header: "明细",
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.itemCount}
          </span>
        ),
      },
    ],
    [openDraft],
  )

  const orderColumns = useMemo(
    () =>
      getOrdersColumns(order => {
        openDetail(order.id)
      }, { canViewMoney }),
    [canViewMoney, openDetail],
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

  return (
    <TopLevelPageWrapper fillHeight inset='flush'>
      {tab === "drafts" ? (
        <DataTable
          table={draftsTable}
          columns={draftColumns}
          isLoading={isLoading}
          emptyIcon='ri-file-list-3-line'
          emptyText="暂无订单草稿"
          globalFilter={keyword}
          onRowClick={row => openDraft(row.id)}
          toolbar={
            <TableToolbar
              title='订单管理'
              count={
                isFetching && !isLoading
                  ? "加载中…"
                  : `共 ${totalCount} 条草稿`
              }
              globalFilter={keyword}
              onFilterChange={setKeyword}
              searchPlaceholder='搜索客户名称…'
              extra={
                hasActiveFilters
                  ? (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 px-2 text-xs'
                        onClick={resetFilters}
                      >
                        重置筛选
                      </Button>
                    )
                  : undefined
              }
              actions={
                <div className="flex gap-2">
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => navigate({ to: '/orders/quick' })}
                  >
                    <i className='ri-file-upload-line mr-1.5' />
                    快捷图纸建单
                  </Button>
                  <Button
                    size='sm'
                    onClick={openCreate}
                  >
                    <i className='ri-add-line mr-1.5' />
                    新建订单
                  </Button>
                </div>
              }
            />
          }
          filterBar={
            <StatusFilterBar
              tabs={statusTabs}
              value={statusFilter}
              onChange={setStatusFilter}
              footer={
                totalPages > 1
                  ? (
                      <div className='ml-auto flex items-center gap-2 border-l border-border px-2 text-xs text-muted-foreground'>
                        <button
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                          className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                        >
                          <i className='ri-arrow-left-s-line' />
                        </button>
                        <span>
                          {page} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages}
                          className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                        >
                          <i className='ri-arrow-right-s-line' />
                        </button>
                      </div>
                    )
                  : undefined
              }
            />
          }
        />
      ) : (
        <DataTable
          table={ordersTable}
          columns={orderColumns}
          isLoading={isLoading}
          emptyIcon='ri-file-list-3-line'
          emptyText="暂无订单数据"
          globalFilter={keyword}
          onRowClick={row => openDetail(row.id)}
          toolbar={
            <TableToolbar
              title='订单管理'
              count={
                isFetching && !isLoading
                  ? "加载中…"
                  : `共 ${totalCount} 条订单`
              }
              globalFilter={keyword}
              onFilterChange={setKeyword}
              searchPlaceholder='搜索客户名称…'
              extra={
                hasActiveFilters
                  ? (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 px-2 text-xs'
                        onClick={resetFilters}
                      >
                        重置筛选
                      </Button>
                    )
                  : undefined
              }
              actions={
                <div className="flex gap-2">
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => navigate({ to: '/orders/quick' })}
                  >
                    <i className='ri-file-upload-line mr-1.5' />
                    快捷图纸建单
                  </Button>
                  <Button
                    size='sm'
                    onClick={openCreate}
                  >
                    <i className='ri-add-line mr-1.5' />
                    新建订单
                  </Button>
                </div>
              }
            />
          }
          filterBar={
            <StatusFilterBar
              tabs={statusTabs}
              value={statusFilter}
              onChange={setStatusFilter}
              footer={
                totalPages > 1
                  ? (
                      <div className='ml-auto flex items-center gap-2 border-l border-border px-2 text-xs text-muted-foreground'>
                        <button
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                          className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                        >
                          <i className='ri-arrow-left-s-line' />
                        </button>
                        <span>
                          {page} / {totalPages}
                        </span>
                        <button
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages}
                          className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                        >
                          <i className='ri-arrow-right-s-line' />
                        </button>
                      </div>
                    )
                  : undefined
              }
            />
          }
        />
      )}
    </TopLevelPageWrapper>
  )
}
