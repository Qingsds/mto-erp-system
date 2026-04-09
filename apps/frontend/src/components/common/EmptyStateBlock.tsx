/**
 * 通用空状态区块。
 *
 * 用于收口列表页、弹层、详情附件区中重复出现的
 * “图标 + 标题 + 说明 + 动作”结构，避免各页面继续手写一套。
 */

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface EmptyStateBlockProps {
  icon: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
  contentClassName?: string
}

export function EmptyStateBlock({
  icon,
  title,
  description,
  action,
  className,
  contentClassName,
}: EmptyStateBlockProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center px-6 py-12 text-center",
          contentClassName,
        )}
      >
        <i className={cn(icon, "text-3xl text-muted-foreground/40")} />
        <p className='mt-3 text-sm font-medium text-foreground'>{title}</p>
        {description && (
          <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
        )}
        {action && <div className='mt-4'>{action}</div>}
      </CardContent>
    </Card>
  )
}
