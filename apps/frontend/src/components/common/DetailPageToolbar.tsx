/**
 * 通用详情页顶栏。
 *
 * 只负责：
 * - 返回入口
 * - 标题 / 副标题
 * - 状态槽位
 * - 右侧操作槽位
 *
 * 业务页面各自传入状态和按钮，避免把不同模块的操作逻辑硬揉进同一个组件。
 */

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface DetailPageToolbarProps {
  title: string
  subtitle?: string
  backLabel: string
  onBack: () => void
  meta?: ReactNode
  actions?: ReactNode
}

export function DetailPageToolbar({
  title,
  subtitle,
  backLabel,
  onBack,
  meta,
  actions,
}: DetailPageToolbarProps) {
  return (
    <div className='sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-6 sm:py-3 lg:px-8'>
        <div className='min-w-0 flex flex-1 items-center gap-2 sm:gap-2.5'>
          <Button
            variant='ghost'
            size='sm'
            className='-ml-1 h-8 shrink-0 px-2 text-xs'
            onClick={onBack}
          >
            <i className='ri-arrow-left-line sm:mr-1.5' />
            <span className='hidden sm:inline'>{backLabel}</span>
          </Button>

          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
              <h1 className='truncate text-sm font-semibold tracking-tight sm:text-base'>
                {title}
              </h1>
              {meta}
            </div>
            {subtitle && (
              <p className='truncate text-[11px] text-muted-foreground sm:text-xs'>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
