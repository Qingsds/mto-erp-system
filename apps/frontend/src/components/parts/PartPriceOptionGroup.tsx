/**
 * 零件参考价格选项组。
 *
 * 统一展示一个零件的价格字典，并提供点击切换当前参考价的交互。
 */

import { cn } from "@/lib/utils"

interface PartPriceOption {
  label: string
  value: number
}

interface PartPriceOptionGroupProps {
  prices: PartPriceOption[]
  activeValue: number
  onChange: (value: number) => void
}

function formatPrice(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PartPriceOptionGroup({
  prices,
  activeValue,
  onChange,
}: PartPriceOptionGroupProps) {
  if (prices.length === 0) return null

  if (prices.length === 1) {
    return (
      <div className='border border-border bg-background px-3 py-2'>
        <p className='text-[11px] text-muted-foreground'>
          参考单价
        </p>
        <p className='mt-1 font-mono text-sm font-semibold text-foreground'>
          ¥{formatPrice(prices[0].value)}
        </p>
        <p className='mt-0.5 text-[11px] text-muted-foreground'>
          {prices[0].label}
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <div>
        <p className='text-[11px] text-muted-foreground'>
          参考单价
        </p>
        <p className='mt-0.5 text-xs text-muted-foreground'>
          请选择本次录入使用的价格类型
        </p>
      </div>

      <div className='flex flex-wrap gap-1.5'>
        {prices.map(price => {
          const isActive = Math.abs(activeValue - price.value) < 0.001

          return (
            <button
              key={price.label}
              type='button'
              onClick={() => onChange(price.value)}
              className={cn(
                "inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors cursor-pointer",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              <span>{price.label}</span>
              <span className='font-mono'>
                ¥{formatPrice(price.value)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
