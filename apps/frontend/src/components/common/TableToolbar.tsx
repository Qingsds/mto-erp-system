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

import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
    <TopLevelPageHeaderWrapper
      bordered={false}
      bodyClassName="flex-wrap items-center gap-3 gap-y-2"
      padding="none"
    >
      {/* Title + count */}
      <TopLevelPageTitle
        title={title}
        subtitle={count}
        titleClassName="text-lg"
      />

      {/* Search input */}
      <div className="ml-0 flex h-8 max-w-72 min-w-[220px] flex-1 items-center gap-2 border border-input bg-background px-2.5 sm:ml-4">
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
    </TopLevelPageHeaderWrapper>
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
  groupClassName?: string
  /** 右侧附加内容（如分页控件） */
  footer?:   ReactNode
}

export function StatusFilterBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
  groupClassName,
  footer,
}: StatusFilterBarProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto px-4 py-2 sm:px-[var(--erp-page-px)]",
        className,
      )}
    >
      <ToggleGroup
        type='single'
        value={value}
        onValueChange={nextValue => {
          if (nextValue) {
            onChange(nextValue as T)
          }
        }}
        variant='outline'
        size='sm'
        className={cn("min-w-max", groupClassName)}
      >
        {tabs.map(tab => (
          <ToggleGroupItem
            key={tab.value}
            value={tab.value}
            className='text-xs data-[state=on]:border-transparent data-[state=on]:bg-primary/12 data-[state=on]:text-primary'
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className='ml-1 font-mono text-current/70'>
                {tab.count}
              </span>
            )}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {footer}
    </div>
  )
}
