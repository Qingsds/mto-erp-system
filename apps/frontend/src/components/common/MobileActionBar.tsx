/**
 * 通用移动端底部操作栏。
 *
 * 提供统一的：
 * - 吸底样式
 * - 安全区内边距
 * - 摘要区
 * - 按钮区
 *
 * 业务页面只负责传入自己的摘要内容和操作按钮。
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MobileActionBarProps {
  summary?: ReactNode
  children: ReactNode
  className?: string
  actionsClassName?: string
  summaryClassName?: string
}

export function MobileActionBar({
  summary,
  children,
  className,
  actionsClassName,
  summaryClassName,
}: MobileActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur",
        className,
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      {summary && (
        <div className={cn("mb-2", summaryClassName)}>
          {summary}
        </div>
      )}

      <div className={cn("flex items-stretch gap-2", actionsClassName)}>
        {children}
      </div>
    </div>
  )
}
