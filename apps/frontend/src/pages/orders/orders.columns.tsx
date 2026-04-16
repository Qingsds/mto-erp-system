import { createColumnHelper } from "@tanstack/react-table"
import { Button }             from "@/components/ui/button"
import { ExpandablePanelCell } from "@/components/common/ExpandablePanelCell"
import { UserIdentityInline } from "@/components/common/UserIdentityInline"
import type { OrderListItem }    from "@/hooks/api/useOrders"
import { formatOrderNo }         from "@/hooks/api/useOrders"
import { computeListOrderAmount } from "@/domain/orders/pricing"
import { OrderStatusBadge }      from "./shared/OrderStatusBadge"

function resolveOrderItemLabel(item: OrderListItem["items"][number]) {
  if (item.partName && item.partName.trim()) {
    return item.partName
  }
  if (item.partNumber && item.partNumber.trim()) {
    return item.partNumber
  }
  return `P-${String(item.partId).padStart(4, "0")}`
}

// ─── Columns ──────────────────────────────────────────────
const col = createColumnHelper<OrderListItem>()

export function getOrdersColumns(
  onView:   (o: OrderListItem) => void,
  options?: { canViewMoney?: boolean },
) {
  const columns = [
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
      cell:   i => <OrderStatusBadge status={i.getValue()} />,
    }),

    col.accessor("items", {
      header:        () => (
        <span className="inline-flex items-center gap-1.5">
          零件明细
          <span className="text-[11px] font-normal text-muted-foreground">
            点击单元格展开
          </span>
        </span>
      ),
      size:          260,
      enableSorting: false,
      cell:          i => {
        const items = i.getValue()
        if (items.length === 0) {
          return <span className="text-xs text-muted-foreground">—</span>
        }

        const preview = items.slice(0, 2)
        const extraCount = Math.max(items.length - preview.length, 0)

        return (
          <ExpandablePanelCell
            items={items}
            summary={preview.map(item => `${resolveOrderItemLabel(item)} ×${item.orderedQty}`).join(" / ")}
            extraCount={extraCount}
            panelTitle="订单零件明细"
            panelSubtitle={`共 ${items.length} 项零件`}
            getKey={item => item.id}
            renderItem={item => {
              const label = resolveOrderItemLabel(item)
              const showPartNo = !!item.partNumber && item.partNumber !== label
              return (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{label}</p>
                    {showPartNo && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {item.partNumber}
                      </p>
                    )}
                  </div>
                  <span className="font-mono shrink-0 text-sm tabular-nums text-foreground">
                    ×{item.orderedQty}
                  </span>
                </div>
              )
            }}
          />
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
      id: "createdBy",
      header: "创建人",
      size: 150,
      cell: info => (
        <UserIdentityInline user={info.row.original.createdBy} />
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

  if (options?.canViewMoney ?? true) {
    columns.splice(4, 0, col.display({
      id: "totalAmount",
      header: "金额",
      size: 100,
      cell: i => {
        const total = computeListOrderAmount(i.row.original)
        return (
          <span className="font-mono text-sm font-medium tabular-nums whitespace-nowrap">
            ¥{total.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        )
      },
    }))
  }

  return columns
}
