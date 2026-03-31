/**
 * 订单详情页移动端底部操作栏。
 *
 * 复用通用移动端底栏壳，展示待发摘要和主操作。
 */

import { Button } from "@/components/ui/button"
import { MobileActionBar } from "@/components/common/MobileActionBar"

interface OrderDetailMobileActionsProps {
  totalOrderedQty: number
  totalShippedQty: number
  totalPendingQty: number
  canCreateDelivery: boolean
  canCloseShort: boolean
  isClosingShort: boolean
  onOpenCreate: () => void
  onCloseShort: () => void
}

export function OrderDetailMobileActions({
  totalOrderedQty,
  totalShippedQty,
  totalPendingQty,
  canCreateDelivery,
  canCloseShort,
  isClosingShort,
  onOpenCreate,
  onCloseShort,
}: OrderDetailMobileActionsProps) {
  return (
    <MobileActionBar
      summary={
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='text-muted-foreground'>
            待发 {totalPendingQty} 件
          </span>
          <span className='font-mono font-semibold text-foreground'>
            {totalShippedQty} / {totalOrderedQty}
          </span>
        </div>
      }
    >
      <Button
        className='h-10 min-w-0 basis-0 shrink grow overflow-hidden'
        onClick={onOpenCreate}
        disabled={!canCreateDelivery}
      >
        <i className='ri-truck-line mr-1.5 shrink-0' />
        <span className='truncate'>创建发货单</span>
      </Button>
      {canCloseShort && (
        <Button
          className='h-10 shrink-0'
          variant='destructive'
          onClick={onCloseShort}
          disabled={isClosingShort}
        >
          <i className='ri-close-circle-line mr-1.5 shrink-0' />
          <span className='truncate'>短交结案</span>
        </Button>
      )}
    </MobileActionBar>
  )
}
