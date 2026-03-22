/**
 * types.ts
 *
 * 职责：
 * - 定义订单详情模块专用的视图层类型
 */

import type { OrderDetail } from "@/hooks/api/useOrders"

/** 详情页内容分段键。 */
export type DetailTab = "items" | "deliveries" | "timeline"

/** 订单行视图模型（在原始订单行基础上追加派生字段）。 */
export type OrderLineVM = OrderDetail["items"][number] & {
  /** 待发数量（orderedQty - shippedQty）。 */
  pendingQty: number
  /** 行金额小计（短交结案时按已发数量结算）。 */
  lineTotal: number
}

/** 订单明细聚合统计。 */
export interface OrderItemStatsVM {
  /** 订单行列表。 */
  lines: OrderLineVM[]
  /** 总需求数量。 */
  totalOrderedQty: number
  /** 总已发数量。 */
  totalShippedQty: number
  /** 总待发数量。 */
  totalPendingQty: number
  /** 订单总金额。 */
  totalAmount: number
}

/** 时间线事件。 */
export interface TimelineEvent {
  /** 事件时间。 */
  time: string
  /** 事件标题。 */
  title: string
  /** 事件描述。 */
  desc: string
}
