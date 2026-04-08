/**
 * 通用页面内容容器。
 *
 * 统一控制：
 * - 详情页 / 新建页的最大宽度
 * - 响应式内边距
 * - 区块间距
 * - 移动端底部操作栏预留空间
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContentWrapperProps {
  children: ReactNode
  className?: string
  scrollClassName?: string
  withMobileBottomInset?: boolean
}

export function PageContentWrapper({
  children,
  className,
  scrollClassName,
  withMobileBottomInset = false,
}: PageContentWrapperProps) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-auto", scrollClassName)}>
      <div
        className={cn(
          "erp-page erp-gap mx-auto flex w-full max-w-[var(--erp-shell-max-w)] flex-col",
          withMobileBottomInset &&
            "pb-[calc(var(--erp-bottom-nav-safe-h)+var(--erp-mobile-action-offset))] sm:pb-[var(--erp-page-py)]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
