/**
 * 一级页面外层容器。
 *
 * 负责统一：
 * - Dashboard / 列表页 / 一级主页的最大宽度
 * - 横向留白与纵向区块间距
 * - 页面级滚动容器
 * - 一级页顶部不额外加空白，首屏内容直接贴齐 Header 下沿
 *
 * 不用于详情页、创建页、工作台页，这些页面继续走 PageContentWrapper。
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TopLevelPageWrapperProps {
  children: ReactNode
  className?: string
  scrollClassName?: string
  fillHeight?: boolean
  inset?: "default" | "flush"
}

export function TopLevelPageWrapper({
  children,
  className,
  scrollClassName,
  fillHeight = false,
  inset = "default",
}: TopLevelPageWrapperProps) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0",
        fillHeight ? "overflow-hidden" : "overflow-auto",
        scrollClassName,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[var(--erp-shell-max-w)] flex-col gap-4 pb-4 pt-0 sm:gap-[var(--erp-gap)] sm:pb-[var(--erp-page-py)] sm:pt-0",
          inset === "default"
            ? "px-4 sm:px-[var(--erp-page-px)]"
            : "px-0",
          fillHeight && "h-full",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
