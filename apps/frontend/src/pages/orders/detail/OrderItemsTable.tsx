/**
 * OrderItemsTable.tsx
 *
 * 职责：
 * - 渲染订单 BOM 明细列表
 * - 以更直观的进度结构展示需求 / 已发 / 待发数量
 */

import { decimalToNum } from "@/hooks/api/useOrders"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import type { OrderLineVM } from "./types"

interface OrderItemsTableProps {
  /** 已加工过的订单行视图模型列表。 */
  lines: OrderLineVM[]
}

type BomFilter = "all" | "pending" | "completed"

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

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function resolveProgress(line: OrderLineVM) {
  if (line.orderedQty <= 0) return 0
  return Math.min(
    100,
    Math.round((line.shippedQty / line.orderedQty) * 100),
  )
}

export function OrderItemsTable({ lines }: OrderItemsTableProps) {
  const [filter, setFilter] = useState<BomFilter>("all")

  const filterTabs = useMemo(() => [
    {
      value: "all" as BomFilter,
      label: "全部",
      count: lines.length,
    },
    {
      value: "pending" as BomFilter,
      label: "待发",
      count: lines.filter(line => line.pendingQty > 0).length,
    },
    {
      value: "completed" as BomFilter,
      label: "已发完",
      count: lines.filter(line => line.pendingQty <= 0).length,
    },
  ], [lines])

  const filteredLines = useMemo(() => {
    if (filter === "pending") {
      return lines.filter(line => line.pendingQty > 0)
    }
    if (filter === "completed") {
      return lines.filter(line => line.pendingQty <= 0)
    }
    return lines
  }, [filter, lines])

  return (
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 border px-2.5 text-xs transition-colors",
              filter === tab.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <span>{tab.label}</span>
            <span className="font-mono">{tab.count}</span>
          </button>
        ))}
      </div>

      {filteredLines.length === 0 ? (
        <div className="border border-dashed border-border px-4 py-10 text-center text-muted-foreground">
          <i className="ri-filter-off-line text-2xl opacity-30" />
          <p className="mt-2 text-sm">当前筛选下没有零件项</p>
        </div>
      ) : filteredLines.map(line => (
        <section
          key={line.id}
          className="border border-border bg-background px-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {line.part.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                {line.part.partNumber} · {line.part.material}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm text-foreground">
                ¥{formatCurrency(
                  resolveUnitPrice(line.unitPrice, line.part.commonPrices),
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                小计 ¥{formatCurrency(line.lineTotal)}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>发货进度</span>
              <span>{resolveProgress(line)}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden bg-muted">
              <div
                className={cn(
                  "h-full transition-[width] duration-300",
                  line.pendingQty > 0 ? "bg-primary" : "bg-emerald-600",
                )}
                style={{ width: `${resolveProgress(line)}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="border border-border bg-card px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                需求
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {line.orderedQty}
              </p>
            </div>
            <div className="border border-border bg-card px-3 py-2">
              <p className="text-[11px] text-muted-foreground">
                已发
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {line.shippedQty}
              </p>
            </div>
            <div
              className={cn(
                "border px-3 py-2",
                line.pendingQty > 0
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
              )}
            >
              <p className="text-[11px] opacity-80">
                待发
              </p>
              <p className="mt-1 text-sm font-semibold">
                {line.pendingQty}
              </p>
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
