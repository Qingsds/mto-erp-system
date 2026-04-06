/**
 * 桌面端零件列表。
 *
 * 重点保留表格扫描效率，并补齐：
 * - 搜索激活后的显式重置入口
 * - 主操作组统一放在工具栏右侧
 */

import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { useNavigate } from "@tanstack/react-router"
import { DataTable } from "@/components/common/DataTable"
import { TableToolbar } from "@/components/common/TableToolbar"
import { Button } from "@/components/ui/button"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useCanViewMoney, useIsAdmin } from "@/lib/permissions"
import type { PartsPageProps } from "./PartsPage"
import { PartManagementSheet } from "./PartManagementSheet"
import { getPartsColumns } from "./parts.columns"
import { usePartsPageController } from "./usePartsPageController"

export function PartsDesktop({ quickAction }: PartsPageProps) {
  const navigate = useNavigate()
  const canViewMoney = useCanViewMoney()
  const canManage = useIsAdmin()
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const {
    form,
    panel,
    page,
    parts,
    totalCount,
    totalPages,
    editingPart,
    isLoading,
    isFetching,
    closePanel,
    setPage,
    openAddPanel,
    openEditPanel,
    openImportPanel,
    handleDelete,
    handleImport,
    handleSubmit,
  } = usePartsPageController({
    keyword: debouncedSearch,
    quickAction,
  })

  const columns = useMemo(() => getPartsColumns(
    openEditPanel,
    part => { void handleDelete(part) },
    { canViewMoney, canManage },
  ), [canManage, canViewMoney, handleDelete, openEditPanel])

  const table = useReactTable({
    data: parts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    rowCount: totalCount,
  })

  const resetSearch = () => {
    setSearch("")
    setPage(1)
  }

  return (
    <>
      <DataTable
        table={table}
        columns={columns}
        isLoading={isLoading}
        emptyIcon='ri-settings-3-line'
        emptyText='暂无零件数据'
        globalFilter={search}
        onRowClick={part =>
          navigate({
            to: "/parts/$id",
            params: { id: String(part.id) },
          })}
        toolbar={
          <TableToolbar
            title='零件库'
            count={
              isFetching && !isLoading
                ? "加载中…"
                : `共 ${totalCount} 个零件`
            }
            globalFilter={search}
            onFilterChange={value => {
              setSearch(value)
              setPage(1)
            }}
            searchPlaceholder='搜索零件名称、编号…'
            extra={
              search
                ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 px-2 text-xs'
                      onClick={resetSearch}
                    >
                      重置搜索
                    </Button>
                  )
                : undefined
            }
            actions={
              canManage
                ? (
                    <>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={openImportPanel}
                      >
                        <i className='ri-upload-2-line mr-1.5' />
                        批量导入
                      </Button>
                      <Button
                        size='sm'
                        onClick={openAddPanel}
                      >
                        <i className='ri-add-line mr-1.5' />
                        新增零件
                      </Button>
                    </>
                  )
                : undefined
            }
          />
        }
        filterBar={
          totalPages > 1
            ? (
                <div className='flex items-center gap-2 px-5 py-2 text-xs text-muted-foreground'>
                  <button
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className='cursor-pointer border-none bg-transparent px-1.5 py-0.5 hover:bg-muted disabled:opacity-30'
                  >
                    <i className='ri-arrow-left-s-line' />
                  </button>
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setPage(current => Math.min(totalPages, current + 1))}
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

      {canManage && (
        <PartManagementSheet
          panel={panel}
          form={form}
          editingPart={editingPart}
          onClose={closePanel}
          onImport={handleImport}
          onSubmit={handleSubmit}
          width={580}
        />
      )}
    </>
  )
}
