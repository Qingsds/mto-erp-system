/**
 * TableToolbar
 *
 * 标准表格工具栏，包含：
 *  - 左：标题 + 数据计数
 *  - 中：搜索框（图标 + input + 清除按钮）
 *  - 右：可选徽章 chips（extra）+ 操作按钮（actions）
 *
 * 用法：
 *   <TableToolbar
 *     title="零件库"
 *     count={`${filtered} / ${total} 个零件`}
 *     globalFilter={globalFilter}
 *     onFilterChange={setFilter}
 *     searchPlaceholder="搜索名称、材质、编号…"
 *     actions={<Button size="sm" onClick={onAdd}><i className="ri-add-line" />新增零件</Button>}
 *   />
 */

import { cn }        from "@/lib/utils"
import type { ReactNode } from "react"

interface TableToolbarProps {
  title:               string
  /** 显示在标题下方的计数文字，如 "12 / 50 条订单" */
  count:               string
  globalFilter:        string
  onFilterChange:      (v: string) => void
  searchPlaceholder?:  string
  /** 搜索框与操作按钮之间的自定义内容（如状态 chips）*/
  extra?:              ReactNode
  /** 工具栏最右侧按钮组 */
  actions?:            ReactNode
}

export function TableToolbar({
  title,
  count,
  globalFilter,
  onFilterChange,
  searchPlaceholder = "搜索…",
  extra,
  actions,
}: TableToolbarProps) {
  return (
    <>
      {/* Title + count */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight leading-none">{title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{count}</p>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 h-8 px-2.5 border border-input rounded-md bg-background ml-4 flex-1 max-w-72">
        <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
        <input
          value={globalFilter}
          onChange={e => onFilterChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-sm text-foreground outline-none border-none placeholder:text-muted-foreground"
        />
        {globalFilter && (
          <button
            onClick={() => onFilterChange("")}
            className="text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            <i className="ri-close-line text-xs" />
          </button>
        )}
      </div>

      {/* Extra chips（有则顶右，actions 紧随其后） */}
      {extra && <div className="flex items-center gap-1.5 ml-auto">{extra}</div>}

      {/* Actions */}
      {actions && <div className={cn("flex gap-2", !extra && "ml-auto")}>{actions}</div>}
    </>
  )
}

// ─── StatusFilterBar ──────────────────────────────────────
/**
 * 状态 Tab 筛选栏，常用于表格下方。
 *
 * 用法：
 *   <StatusFilterBar
 *     tabs={[
 *       { value: "all", label: "全部", count: orders.length },
 *       { value: "draft", label: "草稿", count: 2 },
 *     ]}
 *     value={statusFilter}
 *     onChange={setStatusFilter}
 *   />
 */
interface TabItem<T extends string> {
  value: T
  label: string
  count?: number
}

interface StatusFilterBarProps<T extends string> {
  tabs:      TabItem<T>[]
  value:     T
  onChange:  (v: T) => void
  className?: string
  /** 右侧附加内容（如分页控件） */
  footer?:   ReactNode
}

export function StatusFilterBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
  footer,
}: StatusFilterBarProps<T>) {
  return (
    <div className={cn("flex items-center gap-1 px-5 py-2 overflow-x-auto", className)}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "text-xs px-2.5 py-1 rounded whitespace-nowrap bg-transparent border-none cursor-pointer transition-colors",
            value === tab.value
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1 font-mono",
                value === tab.value ? "text-primary" : "text-muted-foreground/60",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
      {footer}
    </div>
  )
}