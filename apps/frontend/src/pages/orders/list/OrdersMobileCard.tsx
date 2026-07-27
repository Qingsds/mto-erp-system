/**
 * 移动端订单卡片。
 *
 * 只负责一张订单卡片的信息层级，避免移动端列表页继续膨胀。
 */

import type { OrderListItem } from "@/hooks/api/useOrders"
import { formatOrderNo } from "@/hooks/api/useOrders"
import { computeListOrderAmount } from "@/domain/orders/pricing"
import { useCanViewMoney } from "@/lib/permissions"
import { UserIdentityInline } from "@/components/common/UserIdentityInline"
import { OrderStatusBadge } from "../shared/OrderStatusBadge"

interface OrdersMobileCardProps {
  order: OrderListItem
  onClick: () => void
  selected?: boolean
  selectionDisabledReason?: string | null
  onSelectionChange?: () => void
}

export function OrdersMobileCard({
  order,
  onClick,
  selected = false,
  selectionDisabledReason,
  onSelectionChange,
}: OrdersMobileCardProps) {
  const canViewMoney = useCanViewMoney()
  const totalAmount = computeListOrderAmount(order)

  return (
    <div className='relative flex w-full flex-col gap-3 border border-border bg-card px-3 py-3 text-left transition-colors'>
      {onSelectionChange && (
        <input
          type='checkbox'
          checked={selected}
          disabled={!!selectionDisabledReason}
          title={selectionDisabledReason ?? undefined}
          aria-label={`选择订单 ${formatOrderNo(order.id)}`}
          onChange={onSelectionChange}
          className='absolute right-3 top-11 h-5 w-5 accent-primary disabled:opacity-30'
        />
      )}
      <button type='button' onClick={onClick} className='w-full text-left'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium text-foreground'>
            {order.customerName}
          </p>
          <p className='mt-0.5 font-mono text-[11px] text-muted-foreground'>
            {formatOrderNo(order.id)}
          </p>
          {order.mergedOrder && (
            <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
              已合并至 {order.mergedOrder.mergedNo}
            </p>
          )}
        </div>

        <div className={onSelectionChange ? 'pr-8' : ''}>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className='flex items-end justify-between gap-3'>
        <div className='min-w-0 text-xs text-muted-foreground'>
          <p>{order.items.length} 项零件</p>
          <p className='mt-0.5 font-mono'>{order.createdAt.slice(0, 10)}</p>
          <div className='mt-2 flex items-center gap-2'>
            <span>创建人</span>
            <UserIdentityInline
              user={order.createdBy}
              className='min-w-0'
              textClassName='text-xs'
            />
          </div>
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
    </div>
  )
}
