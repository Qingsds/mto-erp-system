/**
 * 对账详情桌面端布局。
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import { BillingDetailDocumentsSection } from "./BillingDetailDocumentsSection"
import { BillingDetailItemsSection } from "./BillingDetailItemsSection"
import { BillingDetailSummary } from "./BillingDetailSummary"
import type { BillingDetailStats } from "./types"

interface BillingDetailDesktopProps {
  billing: BillingDetail
  stats: BillingDetailStats
  isFetching: boolean
  onOpenDelivery: (deliveryId: number) => void
}

export function BillingDetailDesktop({
  billing,
  stats,
  isFetching,
  onOpenDelivery,
}: BillingDetailDesktopProps) {
  return (
    <div className='flex flex-col gap-4'>
      <BillingDetailSummary
        billing={billing}
        stats={stats}
        isFetching={isFetching}
      />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <BillingDetailItemsSection
          billing={billing}
          onOpenDelivery={onOpenDelivery}
        />
        <BillingDetailDocumentsSection billing={billing} />
      </div>
    </div>
  )
}
