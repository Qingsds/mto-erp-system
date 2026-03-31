/**
 * 发货单详情页顶栏。
 *
 * 复用通用详情页顶栏壳，只保留发货单自己的标题、状态和导出动作。
 */

import type { ReactNode } from "react"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { formatDeliveryNo } from "@/hooks/api/useOrders"
import { DeliveryStatusBadge } from "./DeliveryStatusBadge"

interface DeliveryDetailToolbarProps {
  delivery: DeliveryDetail
  actions?: ReactNode
  onBack: () => void
}

export function DeliveryDetailToolbar({
  delivery,
  actions,
  onBack,
}: DeliveryDetailToolbarProps) {
  return (
    <DetailPageToolbar
      title={formatDeliveryNo(delivery.id)}
      subtitle={delivery.order?.customerName ?? `关联订单 ${delivery.orderId}`}
      backLabel=''
      onBack={onBack}
      meta={<DeliveryStatusBadge status={delivery.status} />}
      actions={actions}
    />
  )
}
