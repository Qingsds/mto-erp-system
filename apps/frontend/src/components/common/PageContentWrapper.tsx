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
    <div className={cn("flex-1 overflow-auto", scrollClassName)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8",
          withMobileBottomInset && "pb-[calc(var(--erp-bottom-nav-safe-h)+104px)] sm:pb-6",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
