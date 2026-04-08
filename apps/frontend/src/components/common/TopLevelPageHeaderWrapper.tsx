/**
 * 一级页面顶部容器。
 *
 * 只统一顶部区域的：
 * - 边框与背景
 * - 横向留白
 * - 标题区 / 搜索区 / 操作区的对齐方式
 *
 * 标题文案本身继续交给 TopLevelPageTitle，
 * 搜索、筛选、按钮也保持由业务页自己传入。
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TopLevelPageHeaderWrapperProps {
  children: ReactNode
  className?: string
  bodyClassName?: string
  inset?: "inherit" | "page"
  bordered?: boolean
  padding?: "none" | "desktop" | "mobile"
}

export function TopLevelPageHeaderWrapper({
  children,
  className,
  bodyClassName,
  inset = "inherit",
  bordered = true,
  padding = "none",
}: TopLevelPageHeaderWrapperProps) {
  return (
    <div
      className={cn(
        "w-full shrink-0",
        bordered && "border-b border-border bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 gap-3",
          inset === "page" && "px-4 sm:px-[var(--erp-page-px)]",
          padding === "desktop" && "py-3",
          padding === "mobile" && "pb-3 pt-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
