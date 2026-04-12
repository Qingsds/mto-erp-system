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
import { Button } from "@/components/ui/button"
import { StatusFilterBar, TableToolbar } from "@/components/common/TableToolbar"
import type { CustomerListItem } from "@/hooks/api/useCustomers"
import { CustomerFormSheet } from "../CustomerFormSheet.tsx"
import type { CustomersPageSearch } from "./search"
import { useCustomersPageController } from "./useCustomersPageController"

const PAGE_SIZE = 20

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
          : "inline-flex border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
      }
    >
      {isActive ? "启用" : "停用"}
    </span>
  )
}

interface CustomersDesktopProps {
  search: CustomersPageSearch
}

export function CustomersDesktop({ search }: CustomersDesktopProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [createOpen, setCreateOpen] = useState(false)

  const {
    keyword,
    statusFilter,
    page,
    customers,
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
  } = useCustomersPageController({
    search,
    pageSize: PAGE_SIZE,
  })

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "客户名称",
        size: 260,
        cell: ({ row }: { row: { original: CustomerListItem } }) => (
          <div className="min-w-0">
            <button
              type="button"
              className="truncate text-left text-sm font-medium text-foreground hover:text-primary"
              onClick={event => {
                event.stopPropagation()
                openDetail(row.original.id)
              }}
            >
              {row.original.name}
            </button>
            {(row.original.contactName || row.original.contactPhone) && (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {row.original.contactName ?? "—"}
                {row.original.contactPhone ? ` · ${row.original.contactPhone}` : ""}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "address",
        header: "地址",
        size: 320,
        cell: ({ row }: { row: { original: CustomerListItem } }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.address?.trim() ? row.original.address : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "状态",
        size: 90,
        cell: ({ row }: { row: { original: CustomerListItem } }) => (
          <StatusBadge isActive={row.original.isActive ?? true} />
        ),
      },
    ],
    [openDetail],
  )

  const table = useReactTable({
    data: customers,
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
    <>
      <TopLevelPageWrapper fillHeight inset="flush">
        <DataTable
          table={table}
          columns={columns}
          isLoading={isLoading}
          emptyIcon="ri-building-line"
          emptyText="暂无客户数据"
          globalFilter={keyword}
          onRowClick={customer => openDetail(customer.id)}
          toolbar={
            <TableToolbar
              title="客户管理"
              count={
                isFetching && !isLoading
                  ? "加载中…"
                  : `共 ${totalCount} 个客户`
              }
              globalFilter={keyword}
              onFilterChange={setKeyword}
              searchPlaceholder="搜索客户名称/联系人/电话…"
              extra={
                hasActiveFilters ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={resetFilters}
                  >
                    重置筛选
                  </Button>
                ) : undefined
              }
              actions={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <i className="ri-add-line mr-1.5" />
                  新增客户
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
                totalPages > 1 ? (
                  <div className="ml-auto flex items-center gap-2 border-l border-border px-2 text-xs text-muted-foreground">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30"
                    >
                      <i className="ri-arrow-left-s-line" />
                    </button>
                    <span>
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30"
                    >
                      <i className="ri-arrow-right-s-line" />
                    </button>
                  </div>
                ) : undefined
              }
            />
          }
        />
      </TopLevelPageWrapper>

      <CustomerFormSheet
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmitted={customer => {
          setCreateOpen(false)
          openDetail(customer.id)
        }}
      />
    </>
  )
}
