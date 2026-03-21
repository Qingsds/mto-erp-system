/**
 * detail/types.ts
 *
 * 职责：
 * - 定义发货单详情页面专用的视图层类型
 */

import type { DeliveryDetail } from "@/hooks/api/useDeliveries"

/**
 * 发货明细行视图模型。
 */
export type DeliveryLineVM = DeliveryDetail["items"][number] & {
  /** 行金额估算（本次发货数量 * 订单单价）。 */
  lineAmount: number
  /** 订单剩余待发数量（orderedQty - shippedQty）。 */
  pendingQty: number
}

/**
 * 发货单详情聚合统计。
 */
export interface DeliveryStatsVM {
  /** 发货明细行。 */
  lines: DeliveryLineVM[]
  /** 发货明细行数量。 */
  lineCount: number
  /** 关联零件去重数量。 */
  uniquePartCount: number
  /** 本次发货总件数。 */
  totalShippedQty: number
  /** 本次发货金额估算。 */
  totalAmount: number
}
