/**
 * 移动端发货单卡片。
 *
 * 卡片只保留移动端高价值信息：
 * - 状态
 * - 发货单号 / 订单号
 * - 客户
 * - 发货日期
 * - 备注摘要
 */

import { formatDeliveryNo, formatOrderNo } from "@/hooks/api/useOrders"
import type { DeliveryListItem } from "@/hooks/api/useDeliveries"
import { UserIdentityInline } from "@/components/common/UserIdentityInline"
import { DeliveryStatusBadge } from "../shared/DeliveryStatusBadge"
import { formatDateTime } from "../deliveries.utils"

interface DeliveriesMobileCardProps {
  delivery: DeliveryListItem
  onClick: () => void
}

export function DeliveriesMobileCard({
  delivery,
  onClick,
}: DeliveriesMobileCardProps) {
  return (
    <div
      className="border border-border bg-card px-3.5 py-3 active:bg-muted/50"
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            {formatDeliveryNo(delivery.id)}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {delivery.order?.customerName || "-"}
          </p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="truncate">订单 {formatOrderNo(delivery.orderId)}</span>
        <span>发货 {formatDateTime(delivery.deliveryDate)}</span>
      </div>

      {delivery.createdBy && (
        <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
          <span>创建人</span>
          <UserIdentityInline
            user={delivery.createdBy}
            className='min-w-0'
            textClassName='text-xs'
          />
        </div>
      )}

      {delivery.remark && (
        <div className="mt-2 border border-dashed border-border px-2.5 py-2">
          <p className="line-clamp-2 text-xs text-muted-foreground">
            备注：{delivery.remark}
          </p>
        </div>
      )}
    </div>
  )
}
