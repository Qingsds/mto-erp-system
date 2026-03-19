/**
 * DataTable
 *
 * 封装 TanStack Table 的通用渲染层，统一处理：
 *  - 加载骨架（isLoading）
 *  - 表头排序图标（自动注入）
 *  - 空数据状态（emptyIcon / emptyText / globalFilter 感知）
 *  - 行点击（onRowClick）
 *  - toolbar / filterBar 插槽（由调用方传入，保持灵活）
 *
 * 用法：
 *   <DataTable
 *     table={table}
 *     columns={columns}
 *     isLoading={isLoading}
 *     emptyIcon="ri-file-list-3-line"
 *     emptyText="暂无订单数据"
 *     globalFilter={globalFilter}
 *     onRowClick={row => openDetail(row)}
 *     toolbar={<OrdersToolbar ... />}
 *     filterBar={<StatusTabs ... />}
 *   />
 */

import { flexRender, type Table, type ColumnDef } from "@tanstack/react-table"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn }       from "@/lib/utils"
import type { ReactNode } from "react"

// ─── SortIcon（单独导出供 columns 文件使用）────────────────
export function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return <i className="ri-sort-asc text-xs text-foreground ml-1" />
  if (sorted === "desc")
    return <i className="ri-sort-desc text-xs text-foreground ml-1" />
  return (
    <i className="ri-expand-up-down-line text-xs text-muted-foreground/40 ml-1" />
  )
}

// ─── Skeleton rows ────────────────────────────────────────
function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return Array.from({ length: rows }).map((_, i) => (
    <TableRow key={i} className="pointer-events-none">
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-3.5 w-full max-w-[160px] rounded" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

// ─── Props ────────────────────────────────────────────────
interface DataTableProps<TData> {
  table:          Table<TData>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns:        ColumnDef<TData, any>[]
  isLoading?:     boolean
  /** 骨架行数，默认 6 */
  skeletonRows?:  number
  /** remixicon 类名，默认 ri-inbox-line */
  emptyIcon?:     string
  /** 无数据时的提示文字 */
  emptyText?:     string
  /** 有搜索词时展示 "没有匹配 xxx 的结果"；若不传则只显示 emptyText */
  globalFilter?:  string
  /** 点击行回调，传入则整行可点击 */
  onRowClick?:    (row: TData) => void
  /** 表格上方工具栏插槽（搜索框、按钮等） */
  toolbar?:       ReactNode
  /** 工具栏下方筛选栏插槽（Tab 状态过滤等） */
  filterBar?:     ReactNode
}

// ─── Component ────────────────────────────────────────────
export function DataTable<TData>({
  table,
  columns,
  isLoading      = false,
  skeletonRows   = 6,
  emptyIcon      = "ri-inbox-line",
  emptyText      = "暂无数据",
  globalFilter,
  onRowClick,
  toolbar,
  filterBar,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar slot */}
      {toolbar && (
        <div className="shrink-0 px-5 py-3.5 border-b border-border bg-background flex items-center gap-3 flex-wrap gap-y-2">
          {toolbar}
        </div>
      )}

      {/* FilterBar slot */}
      {filterBar && (
        <div className="shrink-0 border-b border-border bg-background overflow-x-auto">
          {filterBar}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <UITable style={{ minWidth: table.getTotalSize(), width: "100%" }}>
          {/* Header */}
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead
                    key={h.id}
                    style={{ width: h.getSize() }}
                    onClick={
                      h.column.getCanSort()
                        ? h.column.getToggleSortingHandler()
                        : undefined
                    }
                    className={
                      h.column.getCanSort()
                        ? "cursor-pointer select-none hover:bg-muted/80 whitespace-nowrap"
                        : "whitespace-nowrap"
                    }
                  >
                    <span className="inline-flex items-center">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getCanSort() && (
                        <SortIcon sorted={h.column.getIsSorted()} />
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          {/* Body */}
          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={skeletonRows} cols={columns.length} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-16 text-muted-foreground"
                >
                  <i className={cn(emptyIcon, "text-3xl block mb-3 opacity-30")} />
                  {globalFilter
                    ? `没有匹配 "${globalFilter}" 的结果`
                    : emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow
                  key={row.id}
                  className={cn("group/row", onRowClick && "cursor-pointer")}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </UITable>
      </div>
    </div>
  )
}