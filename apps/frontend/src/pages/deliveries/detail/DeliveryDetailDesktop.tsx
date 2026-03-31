/**
 * DeliveryDetailDesktop.tsx
 *
 * 职责：
 * - 桌面端发货单详情布局
 * - 左侧明细 + 右侧信息面板
 */

import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { DeliveryItemsTable } from "./DeliveryItemsTable"
import { DeliveryInfoPanel } from "./DeliveryInfoPanel"
import { DeliverySummaryCards } from "./DeliverySummaryCards"
import type { DeliveryStatsVM } from "./types"

interface DeliveryDetailDesktopProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
  /** 发货单聚合统计。 */
  stats: DeliveryStatsVM
  /** 详情数据是否在后台刷新。 */
  isFetching: boolean
}

/**
 * 桌面端发货单详情。
 */
export function DeliveryDetailDesktop({
  delivery,
  stats,
  isFetching,
}: DeliveryDetailDesktopProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <DeliverySummaryCards delivery={delivery} stats={stats} isFetching={isFetching} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section className="border border-border bg-card">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-sm font-semibold">发货明细</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              本次发货共 {stats.lineCount} 条，合计 {stats.totalShippedQty} 件
            </p>
          </div>
          <DeliveryItemsTable lines={stats.lines} />
        </section>

        <aside className="lg:sticky lg:top-4">
          <DeliveryInfoPanel delivery={delivery} />
        </aside>
      </div>
    </div>
  )
}
