/**
 * OrderSummaryCards.tsx
 *
 * 职责：
 * - 渲染订单详情顶部摘要卡片（客户、金额、发货进度、发货单数量）
 */

import type { OrderDetail } from "@/hooks/api/useOrders"
import type { OrderItemStatsVM } from "./types"
import { formatDateTime } from "./utils"

interface StatCardProps {
  /** 卡片标题。 */
  label: string
  /** 卡片主值。 */
  value: string
  /** 卡片辅助说明。 */
  hint?: string
}

function StatCard({
  label,
  value,
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface OrderSummaryCardsProps {
  /** 订单详情实体。 */
  order: OrderDetail
  /** 订单明细聚合统计。 */
  stats: OrderItemStatsVM
  /** 订单详情是否正在后台刷新。 */
  isFetching: boolean
  /** 是否允许查看金额信息。 */
  canViewMoney: boolean
}

export function OrderSummaryCards({
  order,
  stats,
  isFetching,
  canViewMoney,
}: OrderSummaryCardsProps) {
  const summaryCards = [
    {
      label: "客户",
      value: order.customerName,
      hint: formatDateTime(order.createdAt),
    },
    ...(canViewMoney
      ? [
          {
            label: "金额总计",
            value: `¥${stats.totalAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`,
            hint: `${order.items.length} 项零件`,
          },
        ]
      : []),
    {
      label: "发货进度",
      value: `${stats.totalShippedQty} / ${stats.totalOrderedQty}`,
      hint: stats.totalPendingQty > 0 ? `待发 ${stats.totalPendingQty}` : "已全部发完",
    },
    {
      label: "负责人 / 创建人",
      value: `${order.responsibleUser?.realName ?? "--"} / ${order.createdBy?.realName ?? "--"}`,
      hint: isFetching ? "刷新中…" : `${order.deliveries.length} 张发货单`,
    },
  ]

  return (
    <div className={`grid grid-cols-2 gap-3 ${canViewMoney ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {summaryCards.map(card => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
        />
      ))}
    </div>
  )
}
