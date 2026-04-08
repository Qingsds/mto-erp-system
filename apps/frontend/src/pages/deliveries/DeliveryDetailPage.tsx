/**
 * DeliveryDetailPage.tsx
 *
 * 职责：
 * - 发货单详情容器页，负责数据拉取、聚合与端类型切换
 * - 提供单据状态与异常状态展示
 * - 文档导出动作交给独立组件维护，避免页面容器继续变胖
 */

import { useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { useGetDelivery } from "@/hooks/api/useDeliveries"
import { DeliveryDetailDesktop } from "./detail/DeliveryDetailDesktop"
import { DeliveryExportAction } from "./detail/DeliveryExportAction"
import { DeliveryDetailMobile } from "./detail/DeliveryDetailMobile"
import { DeliveryDetailMobileActions } from "./detail/DeliveryDetailMobileActions"
import { DeliveryDetailToolbar } from "./detail/DeliveryDetailToolbar"
import type { DeliveryStatsVM } from "./detail/types"

/**
 * 发货单详情页面。
 */
export function DeliveryDetailPage() {
  const { id } = useParams({ from: "/deliveries/$id" })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const deliveryId = Number(id)

  const {
    data: delivery,
    isLoading,
    isFetching,
  } = useGetDelivery(deliveryId)

  const stats = useMemo<DeliveryStatsVM | null>(() => {
    if (!delivery) return null

    const lines = delivery.items.map(item => {
      const pendingQty = Math.max(
        item.orderItem.orderedQty - item.orderItem.shippedQty,
        0,
      )

      return {
        ...item,
        pendingQty,
      }
    })

    return {
      lines,
      lineCount: lines.length,
      uniquePartCount: new Set(
        lines.map(line => line.orderItem.partId),
      ).size,
      billedLineCount: lines.filter(line => !!line.billingItem).length,
      completedLineCount: lines.filter(line => line.pendingQty === 0).length,
      totalShippedQty: lines.reduce(
        (sum, line) => sum + line.shippedQty,
        0,
      ),
    }
  }, [delivery])

  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='h-14 border-b border-border bg-background' />
        <div className='flex-1 overflow-auto p-4 sm:p-6 lg:p-8'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className='h-20 rounded-lg bg-muted animate-pulse'
              />
            ))}
          </div>
          <div className='mt-6 h-72 rounded-lg bg-muted animate-pulse' />
        </div>
      </div>
    )
  }

  if (!delivery || !stats) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>发货单不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/deliveries" })}
        >
          返回发货单列表
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <DeliveryDetailToolbar
        delivery={delivery}
        onBack={() => navigate({ to: "/deliveries" })}
        actions={<DeliveryExportAction delivery={delivery} />}
      />

      <PageContentWrapper withMobileBottomInset={isMobile}>
        {isMobile ? (
          <DeliveryDetailMobile
            delivery={delivery}
            stats={stats}
            isFetching={isFetching}
          />
        ) : (
          <DeliveryDetailDesktop
            delivery={delivery}
            stats={stats}
            isFetching={isFetching}
          />
        )}
      </PageContentWrapper>

      {isMobile && (
        <DeliveryDetailMobileActions
          orderId={delivery.orderId}
          totalShippedQty={stats.totalShippedQty}
        />
      )}
    </div>
  )
}
