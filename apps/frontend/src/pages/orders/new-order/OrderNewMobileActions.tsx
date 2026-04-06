/**
 * 新建订单页移动端底部操作栏。
 *
 * 把“继续添加零件”和“创建订单”收口到移动端底部，
 * 让用户在录入尾部时可以直接完成下一步动作。
 */

import { MobileActionBar } from "@/components/common/MobileActionBar"
import { Button } from "@/components/ui/button"

interface OrderNewMobileActionsProps {
  itemCount: number
  estimatedTotal: number
  canViewMoney: boolean
  isSubmitting: boolean
  onAppendItem: () => void
  onSubmit: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function OrderNewMobileActions({
  itemCount,
  estimatedTotal,
  canViewMoney,
  isSubmitting,
  onAppendItem,
  onSubmit,
}: OrderNewMobileActionsProps) {
  return (
    <MobileActionBar
      summary={
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='text-muted-foreground'>
            已添加 {itemCount} 项零件
          </span>
          {canViewMoney && (
            <span className='font-mono font-semibold text-foreground'>
              ¥{formatCurrency(estimatedTotal)}
            </span>
          )}
        </div>
      }
    >
      <Button
        type='button'
        variant='outline'
        className='h-11 flex-1'
        onClick={onAppendItem}
      >
        <i className='ri-add-line mr-1.5' />
        继续添加
      </Button>
      <Button
        type='button'
        className='h-11 flex-[1.4]'
        disabled={isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? (
          <>
            <i className='ri-loader-4-line mr-1.5 animate-spin' />
            提交中…
          </>
        ) : (
          <>
            <i className='ri-check-line mr-1.5' />
            创建订单
          </>
        )}
      </Button>
    </MobileActionBar>
  )
}
