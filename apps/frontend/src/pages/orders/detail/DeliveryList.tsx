/**
 * DeliveryList.tsx
 *
 * 职责：
 * - 渲染订单关联的发货单列表
 * - 在无数据时展示空状态
 */

import type { DeliveryNote } from "@/hooks/api/useOrders"
import { formatDeliveryNo } from "@/hooks/api/useOrders"
import { formatDateTime } from "./utils"

interface DeliveryListProps {
  /** 订单关联发货单集合。 */
  deliveries: DeliveryNote[]
}

export function DeliveryList({ deliveries }: DeliveryListProps) {
  return (
    <div className="p-3 sm:p-4 flex flex-col gap-2">
      {deliveries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
          <i className="ri-truck-line text-2xl opacity-30" />
          <p className="mt-2 text-sm">暂无发货记录</p>
        </div>
      ) : (
        deliveries.map(delivery => (
          <div
            key={delivery.id}
            className="rounded-lg border border-border bg-background px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm">{formatDeliveryNo(delivery.id)}</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {delivery.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              发货时间：{formatDateTime(delivery.deliveryDate)}
            </p>
            {delivery.remark && (
              <p className="mt-1 text-xs text-muted-foreground">备注：{delivery.remark}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
