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
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
      <DeliverySummaryCards delivery={delivery} stats={stats} isFetching={isFetching} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
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
