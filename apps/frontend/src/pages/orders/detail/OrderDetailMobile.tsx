/**
 * OrderDetailMobile.tsx
 *
 * 职责：
 * - 移动端订单详情布局
 * - 单列内容 + 底部固定主操作栏
 */

import { Button } from "@/components/ui/button"
import type { OrderDetail } from "@/hooks/api/useOrders"
import { OrderDetailSections } from "./OrderDetailSections"
import { OrderSummaryCards } from "./OrderSummaryCards"
import type { DetailTab, OrderItemStatsVM, TimelineEvent } from "./types"

interface OrderDetailMobileProps {
  /** 订单详情实体。 */
  order: OrderDetail
  /** 订单明细聚合统计。 */
  itemStats: OrderItemStatsVM
  /** 时间线事件。 */
  timeline: TimelineEvent[]
  /** 当前内容分段。 */
  tab: DetailTab
  /** 是否正在刷新订单详情。 */
  isFetching: boolean
  /** 是否允许创建发货单。 */
  canCreateDelivery: boolean
  /** 是否允许短交结案。 */
  canCloseShort: boolean
  /** 短交结案动作是否提交中。 */
  isClosingShort: boolean
  /** 分段切换回调。 */
  onChangeTab: (tab: DetailTab) => void
  /** 打开发货单抽屉回调。 */
  onOpenCreate: () => void
  /** 短交结案回调。 */
  onCloseShort: () => void
  /** 打开发货单详情回调。 */
  onOpenDelivery: (deliveryId: number) => void
}

export function OrderDetailMobile({
  order,
  itemStats,
  timeline,
  tab,
  isFetching,
  canCreateDelivery,
  canCloseShort,
  isClosingShort,
  onChangeTab,
  onOpenCreate,
  onCloseShort,
  onOpenDelivery,
}: OrderDetailMobileProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-4 sm:gap-6">
      <OrderSummaryCards order={order} stats={itemStats} isFetching={isFetching} />

      <OrderDetailSections
        tab={tab}
        onChangeTab={onChangeTab}
        itemStats={itemStats}
        deliveries={order.deliveries}
        onOpenDelivery={onOpenDelivery}
        timeline={timeline}
      />

      <div className="sticky bottom-0 -mx-4 px-4 py-3 border-t border-border bg-background/95 backdrop-blur">
        <div
          className="flex items-center gap-2"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <Button className="flex-1 h-10" onClick={onOpenCreate} disabled={!canCreateDelivery}>
            <i className="ri-truck-line mr-1.5" />
            创建发货单
          </Button>
          {canCloseShort && (
            <Button
              className="h-10"
              variant="destructive"
              onClick={onCloseShort}
              disabled={isClosingShort}
            >
              <i className="ri-close-circle-line mr-1.5" />
              短交结案
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
