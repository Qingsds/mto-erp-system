/**
 * OrderDetailMobile.tsx
 *
 * 职责：
 * - 移动端订单详情布局
 * - 单列内容 + 底部固定主操作栏
 */

import type { OrderDetail } from "@/hooks/api/useOrders"
import { OrderDetailMobileActions } from "./OrderDetailMobileActions"
import { OrderDetailSections } from "./OrderDetailSections"
import { OrderMobileOverview } from "./OrderMobileOverview"
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
  /** 是否允许查看金额信息。 */
  canViewMoney: boolean
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
  canViewMoney,
}: OrderDetailMobileProps) {
  return (
    <div className="flex min-h-full flex-col gap-4 sm:gap-5">
      <OrderMobileOverview
        order={order}
        stats={itemStats}
        isFetching={isFetching}
        canViewMoney={canViewMoney}
      />

      <OrderDetailSections
        tab={tab}
        onChangeTab={onChangeTab}
        itemStats={itemStats}
        deliveries={order.deliveries}
        onOpenDelivery={onOpenDelivery}
        timeline={timeline}
        canViewMoney={canViewMoney}
      />

      <OrderDetailMobileActions
        totalOrderedQty={itemStats.totalOrderedQty}
        totalShippedQty={itemStats.totalShippedQty}
        totalPendingQty={itemStats.totalPendingQty}
        canCreateDelivery={canCreateDelivery}
        canCloseShort={canCloseShort}
        isClosingShort={isClosingShort}
        onOpenCreate={onOpenCreate}
        onCloseShort={onCloseShort}
      />
    </div>
  )
}
