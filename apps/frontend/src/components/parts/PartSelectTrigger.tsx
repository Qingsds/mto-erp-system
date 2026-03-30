/**
 * 零件选择触发器。
 *
 * 用于表单里展示“已选零件”或“未选择零件”的入口，
 * 方便在订单、发货等业务页面复用同一套零件摘要样式。
 */

import { cn } from "@/lib/utils"
import type { PartListItem } from "@/hooks/api/useParts"

interface PartSelectTriggerProps {
  part?: PartListItem
  hasError?: boolean
  onClick: () => void
}

export function PartSelectTrigger({
  part,
  hasError = false,
  onClick,
}: PartSelectTriggerProps) {
  if (!part) {
    return (
      <button
        type='button'
        onClick={onClick}
        className={cn(
          "flex h-10 w-full items-center gap-2 border bg-background px-3 text-left transition-colors cursor-pointer hover:bg-muted/50",
          hasError ? "border-destructive" : "border-input border-dashed",
        )}
      >
        <i className='ri-add-circle-line text-sm text-muted-foreground' />
        <span className='text-sm text-muted-foreground'>
          点击选择零件…
        </span>
      </button>
    )
  }

  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full items-center gap-3 border border-input bg-background px-3 py-2 text-left transition-colors cursor-pointer hover:bg-muted/50'
    >
      <div className='flex h-7 w-7 shrink-0 items-center justify-center bg-primary/10'>
        <i className='ri-settings-3-line text-xs text-primary' />
      </div>

      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-medium leading-snug text-foreground'>
          {part.name}
        </p>
        <p className='mt-0.5 font-mono text-[11px] text-muted-foreground'>
          {part.partNumber} · {part.material}
        </p>
      </div>

      <i className='ri-pencil-line shrink-0 text-xs text-muted-foreground/40' />
    </button>
  )
}
