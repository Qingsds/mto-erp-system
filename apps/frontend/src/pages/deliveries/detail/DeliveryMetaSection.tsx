/**
 * DeliveryMetaSection.tsx
 *
 * 职责：
 * - 统一渲染发货备注与关联订单信息
 * - 使用紧凑键值布局减少详情页高度
 */

import type { ReactNode } from "react"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { formatDateTime } from "../deliveries.utils"

interface DeliveryMetaSectionProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
}

function MetaRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className='flex items-start justify-between gap-3 text-xs'>
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <div className='min-w-0 text-right text-foreground'>{value}</div>
    </div>
  )
}

export function DeliveryMetaSection({
  delivery,
}: DeliveryMetaSectionProps) {
  return (
    <div className='flex flex-col gap-2.5 text-xs'>
      <MetaRow label='订单号' value={formatOrderNo(delivery.orderId)} />
      <MetaRow label='客户' value={delivery.order?.customerName || "-"} />
      <MetaRow
        label='下单时间'
        value={
          delivery.order?.createdAt
            ? formatDateTime(delivery.order.createdAt)
            : "-"
        }
      />
      <div className='border-t border-dashed border-border pt-2'>
        <p className='mb-1 text-xs text-muted-foreground'>发货备注</p>
        <p className='text-xs text-foreground whitespace-pre-wrap break-words'>
          {delivery.remark || "无"}
        </p>
      </div>
    </div>
  )
}
