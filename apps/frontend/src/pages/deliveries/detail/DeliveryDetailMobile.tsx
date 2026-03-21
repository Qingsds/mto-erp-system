/**
 * DeliveryDetailMobile.tsx
 *
 * 职责：
 * - 移动端发货单详情布局
 * - 单列内容 + 底部联动按钮
 */

import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { DeliveryItemsTable } from "./DeliveryItemsTable"
import { DeliveryStatusBadge } from "./DeliveryStatusBadge"
import { DeliverySummaryCards } from "./DeliverySummaryCards"
import type { DeliveryStatsVM } from "./types"
import { formatDateTime } from "../deliveries.utils"

interface DeliveryDetailMobileProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
  /** 发货单聚合统计。 */
  stats: DeliveryStatsVM
  /** 详情数据是否在后台刷新。 */
  isFetching: boolean
}

/**
 * 移动端发货单详情。
 */
export function DeliveryDetailMobile({
  delivery,
  stats,
  isFetching,
}: DeliveryDetailMobileProps) {
  const navigate = useNavigate()

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
      <DeliverySummaryCards delivery={delivery} stats={stats} isFetching={isFetching} />

      <section className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">发货明细</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              本次发货共 {stats.lineCount} 条，合计 {stats.totalShippedQty} 件
            </p>
          </div>
          <DeliveryStatusBadge status={delivery.status} />
        </div>
        <DeliveryItemsTable lines={stats.lines} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">发货备注</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{delivery.remark || "无"}</p>
        <p className="mt-3 text-sm font-semibold">关联订单信息</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          客户：{delivery.order?.customerName || "-"}
        </p>
        <p className="text-sm text-muted-foreground">
          下单时间：
          {delivery.order?.createdAt ? formatDateTime(delivery.order.createdAt) : "-"}
        </p>
      </section>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 border-t border-border bg-background/95 backdrop-blur">
        <div
          className="flex items-center gap-2"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <Button
            className="flex-1 h-10"
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
            className="h-10"
            variant="outline"
            onClick={() => navigate({ to: "/deliveries" })}
          >
            <i className="ri-list-check mr-1.5" />
            列表
          </Button>
        </div>
      </div>
    </div>
  )
}
