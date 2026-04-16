/**
 * 移动端订单首屏概览。
 *
 * 首屏优先展示发货进度、待发数量、金额和关键时间，
 * 避免直接复用桌面端四宫格卡片导致信息碎片化。
 */

import type { OrderDetail } from "@/hooks/api/useOrders"
import type { OrderItemStatsVM } from "./types"
import { formatDateTime } from "./utils"

interface OrderMobileOverviewProps {
  order: OrderDetail
  stats: OrderItemStatsVM
  isFetching: boolean
  canViewMoney: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function OrderMobileOverview({
  order,
  stats,
  isFetching,
  canViewMoney,
}: OrderMobileOverviewProps) {
  const progress =
    stats.totalOrderedQty > 0
      ? Math.min(
          100,
          Math.round((stats.totalShippedQty / stats.totalOrderedQty) * 100),
        )
      : 0

  return (
    <section className='border border-border bg-card'>
      <div className='flex items-start justify-between gap-3 border-b border-border px-3 py-2.5'>
        <div>
          <p className='text-[11px] text-muted-foreground'>发货进度</p>
          <p className='mt-1 text-lg font-semibold leading-none text-foreground'>
            {stats.totalShippedQty} / {stats.totalOrderedQty}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[11px] text-muted-foreground'>待发数量</p>
          <p className='mt-1 text-base font-semibold text-foreground'>
            {stats.totalPendingQty}
          </p>
        </div>
      </div>

      <div className={`grid gap-px bg-border ${canViewMoney ? "grid-cols-3" : "grid-cols-2"}`}>
        <div className='bg-background px-3 py-2'>
          <p className='text-[11px] text-muted-foreground'>完成比例</p>
          <p className='mt-1 text-sm font-semibold text-foreground'>{progress}%</p>
        </div>
        <div className='bg-background px-3 py-2'>
          <p className='text-[11px] text-muted-foreground'>零件项数</p>
          <p className='mt-1 text-sm font-semibold text-foreground'>{order.items.length}</p>
        </div>
        {canViewMoney && (
          <div className='bg-background px-3 py-2'>
            <p className='text-[11px] text-muted-foreground'>订单金额</p>
            <p className='mt-1 truncate text-sm font-semibold text-foreground'>
              ¥{formatCurrency(stats.totalAmount)}
            </p>
          </div>
        )}
      </div>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[11px] text-muted-foreground'>
        <span>下单时间 {formatDateTime(order.createdAt)}</span>
        <span>{isFetching ? "刷新中…" : `${order.deliveries.length} 张发货单`}</span>
        {order.responsibleUser?.realName && <span>负责人 {order.responsibleUser.realName}</span>}
      </div>
    </section>
  )
}
