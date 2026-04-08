/**
 * 一级页面标题块。
 *
 * 只负责统一标题与副标题的文字层级和垂直间距，
 * 不接管搜索、筛选、主操作等其他布局职责。
 */

import { cn } from "@/lib/utils"

interface TopLevelPageTitleProps {
  title: string
  subtitle: string
  className?: string
  titleClassName?: string
  subtitleClassName?: string
}

export function TopLevelPageTitle({
  title,
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
}: TopLevelPageTitleProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1
        className={cn(
          "text-lg font-semibold leading-none tracking-tight text-foreground",
          titleClassName,
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "mt-1 text-xs text-muted-foreground",
          subtitleClassName,
        )}
      >
        {subtitle}
      </p>
    </div>
  )
}
