/**
 * 通用移动端底部操作栏。
 *
 * 提供统一的：
 * - 固定在底部导航上方
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
        "fixed inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur",
        className,
      )}
      style={{ bottom: "var(--erp-bottom-nav-safe-h)" }}
    >
      <div className='mx-auto w-full max-w-[var(--erp-shell-max-w)] px-4 py-3 sm:px-[var(--erp-page-px)]'>
        {summary && (
          <div className={cn("mb-2", summaryClassName)}>
            {summary}
          </div>
        )}

        <div className={cn("flex items-stretch gap-2", actionsClassName)}>
          {children}
        </div>
      </div>
    </div>
  )
}
