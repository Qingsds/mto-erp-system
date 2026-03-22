/**
 * OrderDetailSections.tsx
 *
 * 职责：
 * - 提供订单详情分段切换（BOM/发货记录/操作日志）
 * - 根据当前 tab 渲染对应内容区块
 */

import { cn } from "@/lib/utils"
import type { DeliveryNote } from "@/hooks/api/useOrders"
import { DeliveryList } from "./DeliveryList"
import { OrderItemsTable } from "./OrderItemsTable"
import { OrderTimeline } from "./OrderTimeline"
import type { DetailTab, OrderItemStatsVM, TimelineEvent } from "./types"

interface OrderDetailSectionsProps {
  /** 当前选中的分段。 */
  tab: DetailTab
  /** 分段切换回调。 */
  onChangeTab: (tab: DetailTab) => void
  /** 订单明细统计结果。 */
  itemStats: OrderItemStatsVM
  /** 发货单列表。 */
  deliveries: DeliveryNote[]
  /** 打开发货单详情回调。 */
  onOpenDelivery?: (deliveryId: number) => void
  /** 时间线事件列表。 */
  timeline: TimelineEvent[]
}

export function OrderDetailSections({
  tab,
  onChangeTab,
  itemStats,
  deliveries,
  onOpenDelivery,
  timeline,
}: OrderDetailSectionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {([
          { key: "items", label: "BOM 明细", icon: "ri-list-check-3" },
          { key: "deliveries", label: "发货记录", icon: "ri-truck-line" },
          { key: "timeline", label: "操作日志", icon: "ri-time-line" },
        ] as const).map(seg => (
          <button
            key={seg.key}
            type="button"
            onClick={() => onChangeTab(seg.key)}
            className={cn(
              "flex-1 h-8 rounded-md text-xs font-medium transition-colors border-none cursor-pointer bg-transparent",
              "inline-flex items-center justify-center gap-1",
              tab === seg.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <i className={`${seg.icon} text-sm`} />
            {seg.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        {tab === "items" && <OrderItemsTable lines={itemStats.lines} />}
        {tab === "deliveries" && (
          <DeliveryList
            deliveries={deliveries}
            onOpenDelivery={onOpenDelivery}
          />
        )}
        {tab === "timeline" && <OrderTimeline timeline={timeline} />}
      </div>
    </div>
  )
}
