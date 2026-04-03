/**
 * 对账详情移动端布局。
 *
 * 移动端以摘要、明细、归档三段直排，减少横向切换成本。
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import { BillingDetailDocumentsSection } from "./BillingDetailDocumentsSection"
import { BillingDetailItemsSection } from "./BillingDetailItemsSection"
import { BillingDetailSummary } from "./BillingDetailSummary"
import type { BillingDetailStats } from "./types"

interface BillingDetailMobileProps {
  billing: BillingDetail
  stats: BillingDetailStats
  isFetching: boolean
  onOpenDelivery: (deliveryId: number) => void
}

export function BillingDetailMobile({
  billing,
  stats,
  isFetching,
  onOpenDelivery,
}: BillingDetailMobileProps) {
  return (
    <div className='flex flex-col gap-4'>
      <BillingDetailSummary
        billing={billing}
        stats={stats}
        compact
        isFetching={isFetching}
      />

      <BillingDetailItemsSection
        billing={billing}
        compact
        onOpenDelivery={onOpenDelivery}
      />

      <BillingDetailDocumentsSection billing={billing} />
    </div>
  )
}
