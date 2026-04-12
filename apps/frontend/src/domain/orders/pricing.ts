/**
 * domain/orders/pricing.ts
 *
 * 职责：订单金额与结算逻辑的领域纯函数
 * 统一列表、详情、导出等处的金额计算口径，确保业务规则单一事实来源。
 */

import { decimalToNum, type OrderDetail, type OrderListItem } from "@/hooks/api/useOrders"
import type { OrderItemStatsVM } from "@/pages/orders/detail/types"

/**
 * 解析单价：
 * 1) 优先使用快照单价（unitPrice > 0）
 * 2) 兜底使用零件价格字典中的“标准价”
 * 3) 兜底使用零件价格字典中的任意有效数值
 */
export function resolveUnitPrice(
  unitPrice: string | number,
  commonPrices?: Record<string, number>,
): number {
  const n = typeof unitPrice === "string" ? parseFloat(unitPrice) : unitPrice
  if (Number.isFinite(n) && n > 0) return n

  if (commonPrices) {
    const std = commonPrices["标准价"]
    if (typeof std === "number" && Number.isFinite(std)) return std
    for (const v of Object.values(commonPrices)) {
      if (typeof v === "number" && Number.isFinite(v)) return v
    }
  }

  return Number.isFinite(n) ? n : 0
}

/**
 * 结算数量规则：
 * - 正常订单：按下单数量结算
 * - 短交结案：按已发数量结算，但限制在 [0, orderedQty] 区间
 */
export function resolveSettlementQty(
  orderedQty: number,
  shippedQty: number,
  isClosedShort: boolean,
): number {
  if (!isClosedShort) return orderedQty
  return Math.max(Math.min(shippedQty, orderedQty), 0)
}

/**
 * 计算列表页订单总金额：
 * 优先使用后端聚合的 totalAmount，缺失时按明细回退计算。
 */
export function computeListOrderAmount(order: OrderListItem): number {
  if (typeof order.totalAmount === "number") return order.totalAmount

  const isClosedShort = order.status === "CLOSED_SHORT"
  return order.items.reduce((sum, it) => {
    const qty = resolveSettlementQty(it.orderedQty, it.shippedQty, isClosedShort)
    // 列表页通常不带零件价格字典，仅按快照价计算
    return sum + qty * decimalToNum(it.unitPrice)
  }, 0)
}

/**
 * 计算订单详情统计：
 * 聚合行明细、总数量、总发货数、总待发数与结算总金额。
 */
export function computeOrderStats(order: OrderDetail): OrderItemStatsVM {
  const isClosedShort = order.status === "CLOSED_SHORT"

  const lines = order.items.map(it => {
    const unitPrice = resolveUnitPrice(it.unitPrice, it.part.commonPrices)
    const pendingQty = Math.max(it.orderedQty - it.shippedQty, 0)
    const settlementQty = resolveSettlementQty(it.orderedQty, it.shippedQty, isClosedShort)

    return {
      ...it,
      unitPrice, // 解析后的数值单价
      pendingQty,
      lineTotal: settlementQty * unitPrice,
    }
  })

  return {
    lines,
    totalOrderedQty: lines.reduce((s, it) => s + it.orderedQty, 0),
    totalShippedQty: lines.reduce((s, it) => s + it.shippedQty, 0),
    totalPendingQty: lines.reduce((s, it) => s + it.pendingQty, 0),
    totalAmount:     lines.reduce((s, it) => s + it.lineTotal, 0),
  }
}
