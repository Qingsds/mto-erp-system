/**
 * 订单详情页顶栏。
 *
 * 复用通用详情页顶栏壳，只保留订单自身的标题、状态和导出动作。
 */

import type { ReactNode } from "react"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { StatusBadge } from "./StatusBadge"
import type { OrderDetail } from "@/hooks/api/useOrders"

interface OrderDetailToolbarProps {
  order: OrderDetail
  actions?: ReactNode
  onBack: () => void
}

export function OrderDetailToolbar({
  order,
  actions,
  onBack,
}: OrderDetailToolbarProps) {
  return (
    <DetailPageToolbar
      title={formatOrderNo(order.id)}
      subtitle={order.customerName}
      backLabel=''
      onBack={onBack}
      meta={<StatusBadge status={order.status} />}
      actions={actions}
    />
  )
}
