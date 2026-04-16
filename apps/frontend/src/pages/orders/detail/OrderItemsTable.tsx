/**
 * OrderItemsTable.tsx
 *
 * 职责：
 * - 渲染订单 BOM 明细列表
 * - 以更直观的进度结构展示需求 / 已发 / 待发数量
 */

import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { resolveUnitPrice } from "@/domain/orders/pricing"
import type { OrderLineVM } from "./types"
import { TaskStatusBadge, TaskUrgencyBadge } from "../shared/TaskBadge"
import { Button } from "@/components/ui/button"
import { ErpSheet } from "@/components/common/ErpSheet"
import { TaskDetailPanel } from "./TaskDetailPanel"

interface OrderItemsTableProps {
  /** 已加工过的订单行视图模型列表。 */
  lines: OrderLineVM[]
  /** 是否允许查看金额信息。 */
  canViewMoney: boolean
}

type BomFilter = "all" | "pending" | "completed"

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

export function OrderItemsTable({ lines, canViewMoney }: OrderItemsTableProps) {
  const [filter, setFilter] = useState<BomFilter>("all")
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

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
          className="border border-border bg-background px-3 py-2.5"
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
            {canViewMoney && (
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
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-muted text-muted-foreground">
              需求 {line.orderedQty}
            </span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary">
              已发 {line.shippedQty}
            </span>
            <span
              className={cn(
                "px-2 py-0.5",
                line.pendingQty > 0
                  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
              )}
            >
              待发 {line.pendingQty}
            </span>
            <span className="text-[11px] text-muted-foreground">
              进度 {resolveProgress(line)}%
            </span>
          </div>

          {line.productionTask && (
            <div className="mt-2 border-t border-border pt-2 flex items-center justify-between gap-3">
              <div className="min-w-0 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-foreground">生产任务:</span>
                <TaskStatusBadge status={line.productionTask.status as any} />
                <TaskUrgencyBadge urgency={line.productionTask.urgency as any} />
                <span className="text-[11px] text-muted-foreground">
                  交期 {new Date(line.productionTask.targetDate).toLocaleDateString()}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setSelectedTaskId(line.productionTask!.id)}>
                任务详情/沟通
              </Button>
            </div>
          )}
        </section>
      ))}

      <ErpSheet
        open={!!selectedTaskId}
        onOpenChange={(o) => !o && setSelectedTaskId(null)}
        title="生产任务详情"
        description="查看状态与业务沟通留言"
      >
        {selectedTaskId && <TaskDetailPanel taskId={selectedTaskId} />}
      </ErpSheet>
    </div>
  )
}
