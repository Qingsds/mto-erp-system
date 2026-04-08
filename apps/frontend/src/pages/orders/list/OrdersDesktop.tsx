/**
 * 桌面端订单列表。
 *
 * 重点保留表格扫描效率，并补齐：
 * - 搜索 / 状态 / 页码持久化到 URL
 * - 工具栏显式重置入口
 * - 列表逻辑从页面入口拆出
 */

import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
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

export function OrdersDesktop({ search }: OrdersDesktopProps) {
  const canViewMoney = useCanViewMoney()
  const [sorting, setSorting] = useState<SortingState>([])
  const {
    keyword,
    statusFilter,
    page,
    orders,
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
    openCreate,
  } = useOrdersPageController({
    search,
    pageSize: PAGE_SIZE,
  })

  const columns = useMemo(
    () =>
      getOrdersColumns(order => {
        openDetail(order.id)
      }, { canViewMoney }),
    [canViewMoney, openDetail],
  )

  const table = useReactTable({
    data: orders,
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
    <TopLevelPageWrapper fillHeight inset='flush'>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon='ri-file-list-3-line'
        emptyText='暂无订单数据'
        globalFilter={keyword}
        onRowClick={order => openDetail(order.id)}
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
              <Button
                size='sm'
                onClick={openCreate}
              >
                <i className='ri-add-line mr-1.5' />
                新建订单
              </Button>
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
    </TopLevelPageWrapper>
  )
}
