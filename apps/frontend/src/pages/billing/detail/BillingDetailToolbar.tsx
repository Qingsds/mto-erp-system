/**
 * 对账详情页顶栏。
 *
 * 复用通用详情页顶栏，只承载单号、客户和状态。
 */

import type { ReactNode } from "react"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import type { BillingDetail } from "@/hooks/api/useBilling"
import { BillingStatusBadge } from "../list/BillingStatusBadge"
import { formatBillingNo } from "../list/shared"

interface BillingDetailToolbarProps {
  billing: BillingDetail
  actions?: ReactNode
  onBack: () => void
}

export function BillingDetailToolbar({
  billing,
  actions,
  onBack,
}: BillingDetailToolbarProps) {
  return (
    <DetailPageToolbar
      title={formatBillingNo(billing.id)}
      subtitle={billing.customerName}
      backLabel=''
      onBack={onBack}
      meta={<BillingStatusBadge status={billing.status} />}
      actions={actions}
    />
  )
}
