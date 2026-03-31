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
import { DeliveryMetaSection } from "./DeliveryMetaSection"

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
    <div className="border border-border bg-card p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">发货状态</p>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      <DeliveryMetaSection delivery={delivery} />

      <Button
        className="w-full h-10"
        onClick={() =>
          navigate({
            to: "/orders/$id",
            params: { id: String(delivery.orderId) },
          })
        }
      >
        <i className="ri-file-list-3-line mr-1.5" />
        查看订单 {formatOrderNo(delivery.orderId)}
      </Button>
      <Button
        className="w-full h-10"
        variant="outline"
        onClick={() => navigate({ to: "/deliveries" })}
      >
        <i className="ri-list-check mr-1.5" />
        返回列表
      </Button>
    </div>
  )
}
