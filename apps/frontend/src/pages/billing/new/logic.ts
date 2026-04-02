import { resolveUnitPrice } from "@/domain/orders/pricing"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"

/**
 * 计算对账单预估总额。
 */
export function calculateEstimatedTotal(
  allDetailItems: DeliveryDetail["items"],
  selectedItemIds: Set<number>,
  extraItems: { desc: string; amount: string }[]
): number {
  let total = 0
  for (const item of allDetailItems) {
    if (selectedItemIds.has(item.id)) {
      const unitPrice = resolveUnitPrice(item.orderItem.unitPrice, item.orderItem.part.commonPrices)
      total += item.shippedQty * unitPrice
    }
  }
  for (const extra of extraItems) {
    const v = parseFloat(extra.amount)
    if (!isNaN(v) && v > 0) total += v
  }
  return total
}

/**
 * 校验对账单是否可以提交。
 */
export function validateCanSubmit(
  selectedItemIds: Set<number>,
  searchedCustomer: string
): boolean {
  return selectedItemIds.size > 0 && searchedCustomer.length > 0
}
