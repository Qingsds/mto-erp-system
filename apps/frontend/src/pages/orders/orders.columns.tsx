import { createColumnHelper } from "@tanstack/react-table"
import { Button }             from "@/components/ui/button"
import { cn }                 from "@/lib/utils"
import { STATUS_LABEL, STATUS_STYLE, STATUS_ICON } from "./orders.schema"
import type { OrderStatusType }  from "@erp/shared-types"
import type { OrderListItem }    from "@/hooks/api/useOrders"
import { formatOrderNo, decimalToNum } from "@/hooks/api/useOrders"

// ─── StatusBadge（导出供 OrdersPage 复用）────────────────
export function StatusBadge({ status }: { status: OrderStatusType }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap",
      STATUS_STYLE[status],
    )}>
      <i className={cn(STATUS_ICON[status], "text-[11px]")} />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Columns ──────────────────────────────────────────────
const col = createColumnHelper<OrderListItem>()

export function getOrdersColumns(
  onView:   (o: OrderListItem) => void,
  onDelete: (o: OrderListItem) => void,
) {
  return [
    col.display({
      id:   "orderNo",
      header: "订单编号",
      size: 120,
      cell: i => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {formatOrderNo(i.row.original.id)}
        </span>
      ),
    }),

    col.accessor("customerName", {
      header: "客户",
      size:   150,
      cell:   i => (
        <span className="font-medium text-foreground text-sm">{i.getValue()}</span>
      ),
    }),

    col.accessor("status", {
      header: "状态",
      size:   115,
      cell:   i => <StatusBadge status={i.getValue()} />,
    }),

    col.accessor("items", {
      header:        "零件明细",
      size:          210,
      enableSorting: false,
      cell:          i => {
        const items = i.getValue()
        const total = items.reduce((s, it) => s + it.orderedQty, 0)
        return (
          <div className="flex flex-wrap gap-1">
            {items.slice(0, 3).map(item => (
              <span key={item.id} className="inline-flex items-center text-xs bg-muted rounded px-1.5 py-0.5 whitespace-nowrap">
                <span className="text-muted-foreground font-mono">P-{String(item.partId).padStart(4,"0")}</span>
                <span className="mx-1 text-border">·</span>
                <span className="text-foreground">×{item.orderedQty}</span>
              </span>
            ))}
            {items.length > 3 && (
              <span className="text-xs text-muted-foreground px-1">+{items.length - 3}</span>
            )}
          </div>
        )
      },
    }),

    col.display({
      id:   "totalAmount",
      header: "金额",
      size: 100,
      cell: i => {
        const total = i.row.original.items.reduce(
          (s, it) => s + it.orderedQty * decimalToNum(it.unitPrice), 0,
        )
        return (
          <span className="font-mono text-sm font-medium tabular-nums whitespace-nowrap">
            ¥{total.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        )
      },
    }),

    col.accessor("createdAt", {
      header: "创建日期",
      size:   100,
      cell:   i => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {i.getValue().slice(0, 10)}
        </span>
      ),
    }),

    col.display({
      id:   "actions",
      size: 80,
      cell: i => (
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
            onClick={e => { e.stopPropagation(); onView(i.row.original) }}>
            <i className="ri-eye-line mr-1" />详情
          </Button>
        </div>
      ),
    }),
  ]
}