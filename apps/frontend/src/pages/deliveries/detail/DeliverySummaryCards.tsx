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
  const metaItems = [
    `发货时间 ${formatDateTime(delivery.deliveryDate)}`,
    `已计费 ${stats.billedLineCount}/${stats.lineCount} 条`,
    `零件 ${stats.uniquePartCount} 个`,
    isFetching ? "刷新中…" : null,
    delivery.createdBy?.realName ? `创建人 ${delivery.createdBy.realName}` : null,
  ].filter(Boolean) as string[]

  return (
    <section className="border border-border bg-card">
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-background px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">本次发货</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {stats.totalShippedQty} 件
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {stats.lineCount} 条明细
          </p>
        </div>
        <div className="bg-background px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">关联订单</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {formatOrderNo(delivery.orderId)}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {delivery.order?.customerName ?? formatDeliveryNo(delivery.id)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[11px] text-muted-foreground">
        {metaItems.map(item => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  )
}
