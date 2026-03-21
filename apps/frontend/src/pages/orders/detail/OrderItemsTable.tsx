/**
 * OrderItemsTable.tsx
 *
 * 职责：
 * - 渲染订单 BOM 明细列表
 * - 展示单价、小计、需求/已发/待发数量
 */

import { decimalToNum } from "@/hooks/api/useOrders"
import { cn } from "@/lib/utils"
import type { OrderLineVM } from "./types"

interface OrderItemsTableProps {
  /** 已加工过的订单行视图模型列表。 */
  lines: OrderLineVM[]
}

export function OrderItemsTable({ lines }: OrderItemsTableProps) {
  return (
    <div className="p-3 sm:p-4 flex flex-col gap-2">
      {lines.map(line => (
        <div
          key={line.id}
          className="rounded-lg border border-border bg-background px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{line.part.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                {line.part.partNumber} · {line.part.material}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">
                ¥{decimalToNum(line.unitPrice).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                小计 ¥{line.lineTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              需求 {line.orderedQty}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              已发 {line.shippedQty}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full",
                line.pendingQty > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              待发 {line.pendingQty}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
