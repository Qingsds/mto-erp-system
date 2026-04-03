import type { BillingDetail, BillingDocument } from "@/hooks/api/useBilling"

/**
 * 对账详情页聚合摘要。
 */
export interface BillingDetailStats {
  totalAmount: number
  linkedItemCount: number
  extraItemCount: number
  deliveryCount: number
  latestDocument: BillingDocument | null
}

export function buildBillingDetailStats(detail: BillingDetail): BillingDetailStats {
  const linkedItems = detail.items.filter(item => !!item.deliveryItem)
  const deliveryIds = new Set(
    linkedItems.map(item => item.deliveryItem!.deliveryNoteId),
  )

  return {
    totalAmount: typeof detail.totalAmount === "string"
      ? parseFloat(detail.totalAmount)
      : detail.totalAmount,
    linkedItemCount: linkedItems.length,
    extraItemCount: detail.items.length - linkedItems.length,
    deliveryCount: deliveryIds.size,
    latestDocument: detail.documents[0] ?? null,
  }
}
