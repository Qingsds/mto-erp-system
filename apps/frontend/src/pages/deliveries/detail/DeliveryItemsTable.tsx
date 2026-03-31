/**
 * DeliveryItemsTable.tsx
 *
 * 职责：
 * - 渲染发货单明细列表
 * - 展示零件信息、发货数量、订单累计进度和备注状态
 */

import { cn } from "@/lib/utils"
import type { DeliveryLineVM } from "./types"

interface DeliveryItemsTableProps {
  /** 发货明细行视图模型。 */
  lines: DeliveryLineVM[]
}

function getProgressPercent(shippedQty: number, orderedQty: number) {
  if (orderedQty <= 0) return 0
  return Math.min((shippedQty / orderedQty) * 100, 100)
}

/**
 * 发货明细列表。
 */
export function DeliveryItemsTable({ lines }: DeliveryItemsTableProps) {
  return (
    <div className="p-3 sm:p-4 flex flex-col gap-2">
      {lines.map(line => (
        <div
          key={line.id}
          className="border border-border bg-background px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{line.orderItem.part.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                {line.orderItem.part.partNumber} · {line.orderItem.part.material}
              </p>
              {line.orderItem.part.spec && (
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  规格：{line.orderItem.part.spec}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2 py-0.5 bg-primary/10 text-primary">
              本次发货 {line.shippedQty}
            </span>
            <span className="px-2 py-0.5 bg-muted text-muted-foreground">
              订单累计 {line.orderItem.shippedQty} / {line.orderItem.orderedQty}
            </span>
            <span
              className={cn(
                "px-2 py-0.5",
                line.pendingQty > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              剩余待发 {line.pendingQty}
            </span>
            <span
              className={cn(
                "px-2 py-0.5",
                line.billingItem
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {line.billingItem ? "已计费" : "待开票"}
            </span>
          </div>

          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>订单发货进度</span>
              <span className="font-mono">
                {Math.round(
                  getProgressPercent(
                    line.orderItem.shippedQty,
                    line.orderItem.orderedQty,
                  ),
                )}
                %
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  line.pendingQty > 0 ? "bg-primary" : "bg-emerald-500",
                )}
                style={{
                  width: `${getProgressPercent(
                    line.orderItem.shippedQty,
                    line.orderItem.orderedQty,
                  )}%`,
                }}
              />
            </div>
          </div>

          {line.remark && (
            <div className="mt-2 border border-dashed border-border px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                备注：{line.remark}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
