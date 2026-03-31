/**
 * DeliveryDetailMobileActions.tsx
 *
 * 职责：
 * - 发货详情页移动端底部主操作
 * - 固定在页面底部，避免跟随详情内容滚动
 */

import { useNavigate } from "@tanstack/react-router"
import { MobileActionBar } from "@/components/common/MobileActionBar"
import { Button } from "@/components/ui/button"
import { formatOrderNo } from "@/hooks/api/useOrders"

interface DeliveryDetailMobileActionsProps {
  orderId: number
  totalShippedQty: number
}

export function DeliveryDetailMobileActions({
  orderId,
  totalShippedQty,
}: DeliveryDetailMobileActionsProps) {
  const navigate = useNavigate()

  return (
    <MobileActionBar
      summary={
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='text-muted-foreground'>
            本次发货 {totalShippedQty} 件
          </span>
          <span className='font-mono text-foreground'>
            {formatOrderNo(orderId)}
          </span>
        </div>
      }
    >
      <Button
        className='h-10 min-w-0 basis-0 shrink grow overflow-hidden'
        onClick={() =>
          navigate({
            to: "/orders/$id",
            params: { id: String(orderId) },
          })
        }
      >
        <i className='ri-file-list-3-line mr-1.5 shrink-0' />
        <span className='truncate'>
          查看订单 {formatOrderNo(orderId)}
        </span>
      </Button>

      <Button
        className='h-10 shrink-0'
        variant='outline'
        onClick={() => navigate({ to: "/deliveries" })}
      >
        <i className='ri-list-check mr-1.5 shrink-0' />
        <span className='truncate'>列表</span>
      </Button>
    </MobileActionBar>
  )
}
