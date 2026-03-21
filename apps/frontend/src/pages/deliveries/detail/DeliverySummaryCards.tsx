/**
 * DeliverySummaryCards.tsx
 *
 * 职责：
 * - 渲染发货单详情顶部摘要卡片
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
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="发货单号"
        value={formatDeliveryNo(delivery.id)}
        hint={formatDateTime(delivery.deliveryDate)}
      />
      <StatCard
        label="关联订单"
        value={formatOrderNo(delivery.orderId)}
        hint={
          delivery.order
            ? `${delivery.order.customerName} · ${formatDateTime(delivery.order.createdAt)}`
            : `${stats.uniquePartCount} 个零件`
        }
      />
      <StatCard
        label="发货件数"
        value={`${stats.totalShippedQty} 件`}
        hint={`${stats.lineCount} 条明细`}
      />
      <StatCard
        label="金额估算"
        value={`¥${stats.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`}
        hint={isFetching ? "刷新中…" : "按订单锁定单价估算"}
      />
    </div>
  )
}
