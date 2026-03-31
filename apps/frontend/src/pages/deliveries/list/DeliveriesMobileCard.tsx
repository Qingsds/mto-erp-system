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

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <p className="truncate">关联订单：{formatOrderNo(delivery.orderId)}</p>
        <p className="text-right">
          发货时间：{formatDateTime(delivery.deliveryDate)}
        </p>
        <p className="truncate">
          下单时间：
          {delivery.order?.createdAt
            ? formatDateTime(delivery.order.createdAt)
            : "-"}
        </p>
        <p className="text-right">{delivery.remark ? "有备注" : "无备注"}</p>
      </div>

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
