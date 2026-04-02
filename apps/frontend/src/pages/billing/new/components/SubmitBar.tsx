import { MobileActionBar } from "@/components/common/MobileActionBar"
import { Button } from "@/components/ui/button"

interface SubmitBarProps {
  itemCount: number
  estimatedTotal: number
  isSubmitting: boolean
  canSubmit: boolean
  onSubmit: () => void
}

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function SubmitBar({
  itemCount,
  estimatedTotal,
  isSubmitting,
  canSubmit,
  onSubmit,
}: SubmitBarProps) {
  return (
    <MobileActionBar
      summary={
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='text-muted-foreground'>
            已选 {itemCount} 条明细
          </span>
          <span className='font-mono font-semibold text-foreground'>
            预估 ¥{formatCurrency(estimatedTotal)}
          </span>
        </div>
      }
    >
      <Button
        type='button'
        className='h-11 flex-1'
        disabled={!canSubmit || isSubmitting}
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
            创建对账单
          </>
        )}
      </Button>
    </MobileActionBar>
  )
}
