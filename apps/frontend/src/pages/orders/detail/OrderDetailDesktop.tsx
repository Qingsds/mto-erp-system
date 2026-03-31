/**
 * OrderDetailDesktop.tsx
 *
 * 职责：
 * - 桌面端订单详情布局
 * - 左侧内容区 + 右侧联动操作侧栏
 */

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { OrderDetail } from "@/hooks/api/useOrders"
import { OrderDetailSections } from "./OrderDetailSections"
import { OrderSummaryCards } from "./OrderSummaryCards"
import type { DetailTab, OrderItemStatsVM, TimelineEvent } from "./types"

interface OrderDetailDesktopProps {
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

export function OrderDetailDesktop({
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
}: OrderDetailDesktopProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <OrderSummaryCards order={order} stats={itemStats} isFetching={isFetching} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <OrderDetailSections
          tab={tab}
          onChangeTab={onChangeTab}
          itemStats={itemStats}
          deliveries={order.deliveries}
          onOpenDelivery={onOpenDelivery}
          timeline={timeline}
        />

        <aside className="lg:sticky lg:top-4">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold">发货联动</p>
            <p className="text-xs text-muted-foreground">
              当前待发总量 {itemStats.totalPendingQty} 件。创建发货单后，系统会自动回写已发数量并更新订单状态。
            </p>
            <Separator />
            <Button className="w-full" onClick={onOpenCreate} disabled={!canCreateDelivery}>
              <i className="ri-truck-line mr-1.5" />
              创建发货单
            </Button>
            {canCloseShort && (
              <Button
                className="w-full"
                variant="destructive"
                onClick={onCloseShort}
                disabled={isClosingShort}
              >
                <i className="ri-close-circle-line mr-1.5" />
                短交结案
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
