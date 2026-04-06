/**
 * 移动端订单卡片。
 *
 * 只负责一张订单卡片的信息层级，避免移动端列表页继续膨胀。
 */

import type { OrderListItem } from "@/hooks/api/useOrders"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { computeListOrderAmount } from "@/domain/orders/pricing"
import { useCanViewMoney } from "@/lib/permissions"
import { OrderStatusBadge } from "../shared/OrderStatusBadge"

interface OrdersMobileCardProps {
  order: OrderListItem
  onClick: () => void
}

export function OrdersMobileCard({
  order,
  onClick,
}: OrdersMobileCardProps) {
  const canViewMoney = useCanViewMoney()
  const totalAmount = computeListOrderAmount(order)

  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full flex-col gap-3 border border-border bg-card px-3 py-3 text-left transition-colors active:bg-muted/50'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium text-foreground'>
            {order.customerName}
          </p>
          <p className='mt-0.5 font-mono text-[11px] text-muted-foreground'>
            {formatOrderNo(order.id)}
          </p>
        </div>

        <OrderStatusBadge status={order.status} />
      </div>

      <div className='flex items-end justify-between gap-3'>
        <div className='min-w-0 text-xs text-muted-foreground'>
          <p>{order.items.length} 项零件</p>
          <p className='mt-0.5 font-mono'>{order.createdAt.slice(0, 10)}</p>
        </div>

        {canViewMoney && (
          <div className='text-right'>
            <p className='text-[11px] text-muted-foreground'>订单金额</p>
            <p className='font-mono text-sm font-semibold text-foreground'>
              ¥
              {totalAmount.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        )}
      </div>
    </button>
  )
}
