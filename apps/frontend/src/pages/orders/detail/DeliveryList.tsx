/**
 * DeliveryList.tsx
 *
 * 职责：
 * - 以时间线形式渲染订单关联的发货单记录
 * - 在无数据时展示空状态
 */

import { useMemo } from "react"
import type { DeliveryNote } from "@/hooks/api/useOrders"
import { formatDeliveryNo } from "@/hooks/api/useOrders"
import { UserIdentityInline } from "@/components/common/UserIdentityInline"
import { DeliveryStatusBadge } from "@/pages/deliveries/detail/DeliveryStatusBadge"
import { formatDateTime } from "./utils"

interface DeliveryListProps {
  /** 订单关联发货单集合。 */
  deliveries: DeliveryNote[]
  /** 点击发货单回调（用于跳转详情）。 */
  onOpenDelivery?: (deliveryId: number) => void
}

export function DeliveryList({ deliveries, onOpenDelivery }: DeliveryListProps) {
  const sortedDeliveries = useMemo(
    () =>
      [...deliveries].sort(
        (a, b) =>
          new Date(b.deliveryDate).getTime() -
          new Date(a.deliveryDate).getTime(),
      ),
    [deliveries],
  )

  return (
    <div className='p-3 sm:p-4 flex flex-col gap-2'>
      {sortedDeliveries.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground'>
          <i className='ri-truck-line text-2xl opacity-30' />
          <p className='mt-2 text-sm'>暂无发货记录</p>
        </div>
      ) : (
        sortedDeliveries.map((delivery, index) => (
          <div
            key={delivery.id}
            className='flex gap-3'
          >
            <div className='flex w-10 shrink-0 flex-col items-center pt-1'>
              <span className='h-2.5 w-2.5 bg-primary' />
              {index < sortedDeliveries.length - 1 && (
                <span className='mt-1 flex-1 w-px bg-border' />
              )}
            </div>

            <button
              type='button'
              onClick={() => onOpenDelivery?.(delivery.id)}
              className='mb-3 w-full cursor-pointer border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='font-mono text-sm text-foreground'>
                    {formatDeliveryNo(delivery.id)}
                  </p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    {formatDateTime(delivery.deliveryDate)}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <DeliveryStatusBadge status={delivery.status} />
                  <i className='ri-arrow-right-s-line text-base text-muted-foreground' />
                </div>
              </div>

              <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground'>
                <span>发货明细 {delivery.items?.length ?? 0} 条</span>
                {delivery.createdBy && (
                  <span className='inline-flex items-center gap-1.5'>
                    <span>操作人</span>
                    <UserIdentityInline
                      user={delivery.createdBy}
                      className='min-w-0'
                      textClassName='text-xs'
                    />
                  </span>
                )}
              </div>

              {delivery.remark && (
                <p className='mt-3 text-xs leading-5 text-muted-foreground'>
                  备注：{delivery.remark}
                </p>
              )}
            </button>
          </div>
        ))
      )}
    </div>
  )
}
