/**
 * OrderDetailPage.tsx
 *
 * 职责：
 * - 作为订单详情容器页，负责数据拉取、状态聚合、动作编排
 * - 根据端类型切换 Desktop/Mobile 展示组件
 * - 管理「创建发货单」抽屉开关与提交回调
 */

import { useMemo, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import type { CreateDeliveryRequest } from "@erp/shared-types"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import {
  formatDeliveryNo,
  formatOrderNo,
  useCloseShortOrder,
  useCreateDelivery,
  useGetOrder,
} from "@/hooks/api/useOrders"
import { computeOrderStats, resolveUnitPrice } from "@/domain/orders/pricing"
import { CreateDeliverySheet } from "./detail/CreateDeliverySheet"
import { CloseShortDialog } from "./detail/CloseShortDialog"
import { OrderDetailDesktop } from "./detail/OrderDetailDesktop"
import { OrderExportAction } from "./detail/OrderExportAction"
import { OrderDetailMobile } from "./detail/OrderDetailMobile"
import { OrderDetailToolbar } from "./detail/OrderDetailToolbar"
import type { DetailTab, TimelineEvent } from "./detail/types"

export function OrderDetailPage() {
  const { id } = useParams({ from: "/orders/$id" })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const orderId = Number(id)

  const { data: order, isLoading, isFetching } = useGetOrder(orderId)
  const closeShort = useCloseShortOrder()
  const createDelivery = useCreateDelivery()

  const [tab, setTab] = useState<DetailTab>("items")
  const [createOpen, setCreateOpen] = useState(false)
  const [closeShortOpen, setCloseShortOpen] = useState(false)
  const [panelSeed, setPanelSeed] = useState(0)

  const openCreatePanel = () => {
    setPanelSeed(v => v + 1)
    setCreateOpen(true)
  }

  const itemStats = useMemo(() => {
    if (!order) return null
    return computeOrderStats(order)
  }, [order])

  const canCloseShort =
    order?.status === "PENDING" || order?.status === "PARTIAL_SHIPPED"

  const canCreateDelivery =
    !!order &&
    !!itemStats &&
    itemStats.totalPendingQty > 0 &&
    order.status !== "CLOSED_SHORT"

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!order) return []
    const events: TimelineEvent[] = [
      {
        time: order.createdAt,
        title: "订单创建",
        desc: `订单 ${formatOrderNo(order.id)} 已创建`,
      },
      ...order.deliveries.map(delivery => ({
        time: delivery.deliveryDate,
        title: `创建发货单 ${formatDeliveryNo(delivery.id)}`,
        desc: delivery.remark || "发货完成",
      })),
    ]

    if (order.status === "CLOSED_SHORT") {
      events.push({
        time: order.createdAt,
        title: "订单短交结案",
        desc: order.reason || "该订单已进入结案状态",
      })
    }

    return events.sort(
      (a, b) =>
        new Date(b.time).getTime() - new Date(a.time).getTime(),
    )
  }, [order])

  const shortCloseSettlementAmount = useMemo(() => {
    if (!itemStats) return 0
    return itemStats.lines.reduce(
      (sum, item) =>
        sum +
        item.shippedQty *
          resolveUnitPrice(item.unitPrice, item.part.commonPrices),
      0,
    )
  }, [itemStats])

  const handleCreateDelivery = async (
    payload: CreateDeliveryRequest,
  ) => {
    await createDelivery.mutateAsync(payload)
    setCreateOpen(false)
  }

  const handleCloseShort = () => {
    if (!order || !canCloseShort) return
    setCloseShortOpen(true)
  }

  const handleConfirmCloseShort = async (reason: string) => {
    if (!order || !canCloseShort) return
    await closeShort.mutateAsync({
      id: order.id,
      reason,
    })
    setCloseShortOpen(false)
  }

  const handleOpenDelivery = (deliveryId: number) => {
    navigate({
      to: "/deliveries/$id",
      params: { id: String(deliveryId) },
    })
  }

  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='h-14 border-b border-border bg-background' />
        <div className='flex-1 overflow-auto p-4 sm:p-6 lg:p-8'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className='h-20 rounded-lg bg-muted animate-pulse'
              />
            ))}
          </div>
          <div className='mt-6 h-72 rounded-lg bg-muted animate-pulse' />
        </div>
      </div>
    )
  }

  if (!order || !itemStats) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>订单不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/orders" })}
        >
          返回订单列表
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <OrderDetailToolbar
        order={order}
        onBack={() => navigate({ to: "/orders" })}
        actions={<OrderExportAction order={order} />}
      />

      <PageContentWrapper withMobileBottomInset={isMobile}>
        {isMobile ? (
          <OrderDetailMobile
            order={order}
            itemStats={itemStats}
            timeline={timeline}
            tab={tab}
            isFetching={isFetching}
            canCreateDelivery={canCreateDelivery}
            canCloseShort={!!canCloseShort}
            isClosingShort={closeShort.isPending}
            onChangeTab={setTab}
            onOpenCreate={openCreatePanel}
            onCloseShort={handleCloseShort}
            onOpenDelivery={handleOpenDelivery}
          />
        ) : (
          <OrderDetailDesktop
            order={order}
            itemStats={itemStats}
            timeline={timeline}
            tab={tab}
            isFetching={isFetching}
            canCreateDelivery={canCreateDelivery}
            canCloseShort={!!canCloseShort}
            isClosingShort={closeShort.isPending}
            onChangeTab={setTab}
            onOpenCreate={openCreatePanel}
            onCloseShort={handleCloseShort}
            onOpenDelivery={handleOpenDelivery}
          />
        )}
      </PageContentWrapper>

      <CreateDeliverySheet
        open={createOpen}
        seed={panelSeed}
        order={order}
        isSubmitting={createDelivery.isPending}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateDelivery}
      />

      <CloseShortDialog
        open={closeShortOpen}
        orderId={order.id}
        pendingQty={itemStats.totalPendingQty}
        settlementAmount={shortCloseSettlementAmount}
        isSubmitting={closeShort.isPending}
        onConfirm={handleConfirmCloseShort}
        onOpenChange={setCloseShortOpen}
      />
    </div>
  )
}
