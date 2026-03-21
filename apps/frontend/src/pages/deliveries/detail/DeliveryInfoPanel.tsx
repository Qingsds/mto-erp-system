/**
 * DeliveryInfoPanel.tsx
 *
 * 职责：
 * - 渲染发货单详情右侧信息面板
 * - 展示备注与联动操作
 */

import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { DeliveryStatusBadge } from "./DeliveryStatusBadge"
import { formatDateTime } from "../deliveries.utils"

interface DeliveryInfoPanelProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
}

/**
 * 发货单信息侧栏。
 */
export function DeliveryInfoPanel({ delivery }: DeliveryInfoPanelProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">发货状态</p>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      <div className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">备注</p>
        <p>{delivery.remark || "无"}</p>
      </div>

      <div className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">关联订单信息</p>
        <p>订单号：{formatOrderNo(delivery.orderId)}</p>
        <p>客户：{delivery.order?.customerName || "-"}</p>
        <p>
          下单时间：
          {delivery.order?.createdAt ? formatDateTime(delivery.order.createdAt) : "-"}
        </p>
      </div>

      <Button
        className="w-full"
        onClick={() =>
          navigate({
            to: "/orders/$id",
            params: { id: String(delivery.orderId) },
          })
        }
      >
        <i className="ri-file-list-3-line mr-1.5" />
        查看订单详情 {formatOrderNo(delivery.orderId)}
      </Button>
    </div>
  )
}
