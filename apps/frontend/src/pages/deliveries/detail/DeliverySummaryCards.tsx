/**
 * DeliverySummaryCards.tsx
 *
 * 职责：
 * - 渲染发货单详情顶部紧凑摘要
 * - 只保留首屏最有价值的数量与关联信息
 */

import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import type { DeliveryStatsVM } from "./types"
import { formatDateTime } from "../deliveries.utils"

interface StatCardProps {
  /** 卡片标题。 */
  label: string
  /** 卡片主值。 */
  value: string
  /** 卡片辅助说明。 */
  hint?: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="border border-border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface DeliverySummaryCardsProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
  /** 发货单聚合统计。 */
  stats: DeliveryStatsVM
  /** 详情数据是否在后台刷新。 */
  isFetching: boolean
}

/**
 * 发货单摘要卡片区。
 */
export function DeliverySummaryCards({
  delivery,
  stats,
  isFetching,
}: DeliverySummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      <StatCard
        label="本次发货"
        value={`${stats.totalShippedQty} 件`}
        hint={`${stats.lineCount} 条明细 · ${stats.uniquePartCount} 个零件`}
      />
      <StatCard
        label="关联订单"
        value={formatOrderNo(delivery.orderId)}
        hint={
          delivery.order
            ? `${delivery.order.customerName} · ${formatDateTime(delivery.order.createdAt)}`
            : formatDeliveryNo(delivery.id)
        }
      />
      <StatCard
        label="当前状态"
        value={`已完成 ${stats.completedLineCount} 条`}
        hint={
          isFetching
            ? "刷新中…"
            : `已计费 ${stats.billedLineCount}/${stats.lineCount} 条 · ${formatDateTime(delivery.deliveryDate)}`
        }
      />
    </div>
  )
}
