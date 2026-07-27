import type { ColumnDef } from "@tanstack/react-table"
import type { MergedOrderListItem } from "@erp/shared-types"

export function formatMergedOrderDateRange(item: MergedOrderListItem) {
  if (!item.orderDateStart) return "—"
  const start = item.orderDateStart.slice(0, 10)
  const end = item.orderDateEnd?.slice(0, 10) ?? start
  return start === end ? start : `${start} 至 ${end}`
}

export function getMergedOrderColumns(
  onOpen: (item: MergedOrderListItem) => void,
): ColumnDef<MergedOrderListItem>[] {
  return [
    {
      accessorKey: "mergedNo",
      header: "合并单号",
      size: 190,
      cell: ({ row }) => (
        <button
          type='button'
          className='font-mono text-sm font-medium hover:text-primary'
          onClick={event => {
            event.stopPropagation()
            onOpen(row.original)
          }}
        >
          {row.original.mergedNo}
        </button>
      ),
    },
    { accessorKey: "customerName", header: "客户", size: 240 },
    {
      id: "orderCount",
      header: "原订单",
      size: 100,
      cell: ({ row }) => (
        <span className='font-mono text-sm'>{row.original.orderCount} 张</span>
      ),
    },
    {
      id: "dateRange",
      header: "订单日期范围",
      size: 210,
      cell: ({ row }) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {formatMergedOrderDateRange(row.original)}
        </span>
      ),
    },
    {
      accessorKey: "remark",
      header: "备注",
      size: 280,
      cell: ({ row }) => (
        <span className='line-clamp-2 text-sm text-muted-foreground'>
          {row.original.remark || "—"}
        </span>
      ),
    },
  ]
}

interface MergedOrderMobileCardProps {
  item: MergedOrderListItem
  onClick: () => void
}

export function MergedOrderMobileCard({
  item,
  onClick,
}: MergedOrderMobileCardProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='w-full border border-border bg-card px-3 py-3 text-left'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='font-mono text-sm font-medium'>{item.mergedNo}</p>
          <p className='mt-1 truncate text-sm'>{item.customerName}</p>
        </div>
        <span className='shrink-0 text-xs text-muted-foreground'>
          {item.orderCount} 张订单
        </span>
      </div>
      <p className='mt-3 font-mono text-xs text-muted-foreground'>
        {formatMergedOrderDateRange(item)}
      </p>
      {item.remark && (
        <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
          {item.remark}
        </p>
      )}
    </button>
  )
}
