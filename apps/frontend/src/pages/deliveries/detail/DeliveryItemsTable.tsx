/**
 * DeliveryItemsTable.tsx
 *
 * 职责：
 * - 渲染发货单明细列表
 * - 展示零件信息、发货数量、订单累计进度、金额估算
 */

import { decimalToNum } from "@/hooks/api/useDeliveries"
import { cn } from "@/lib/utils"
import type { DeliveryLineVM } from "./types"

interface DeliveryItemsTableProps {
  /** 发货明细行视图模型。 */
  lines: DeliveryLineVM[]
}

function resolveUnitPrice(unitPrice: string, commonPrices: Record<string, number>): number {
  const snapshotPrice = decimalToNum(unitPrice)
  if (snapshotPrice > 0) {
    return snapshotPrice
  }

  const standardPrice = commonPrices["标准价"]
  if (typeof standardPrice === "number" && Number.isFinite(standardPrice)) {
    return standardPrice
  }

  for (const value of Object.values(commonPrices)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return snapshotPrice
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
          className="rounded-lg border border-border bg-background px-3 py-2.5"
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

            <div className="text-right">
              <p className="font-mono text-sm">
                ¥
                {resolveUnitPrice(
                  line.orderItem.unitPrice,
                  line.orderItem.part.commonPrices,
                ).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                小计 ¥
                {line.lineAmount.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              本次发货 {line.shippedQty}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              订单累计 {line.orderItem.shippedQty} / {line.orderItem.orderedQty}
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full",
                line.pendingQty > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              剩余待发 {line.pendingQty}
            </span>
          </div>

          {line.remark && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">备注：{line.remark}</p>
          )}
        </div>
      ))}
    </div>
  )
}
