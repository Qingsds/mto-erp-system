import type { ReactNode } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ExpandablePanelCellProps<T> {
  items: T[]
  summary: string
  extraCount?: number
  panelTitle: string
  panelSubtitle?: string
  contentClassName?: string
  listClassName?: string
  getKey: (item: T, index: number) => string | number
  renderItem: (item: T, index: number) => ReactNode
}

export function ExpandablePanelCell<T>({
  items,
  summary,
  extraCount = 0,
  panelTitle,
  panelSubtitle,
  contentClassName,
  listClassName,
  getKey,
  renderItem,
}: ExpandablePanelCellProps<T>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-9 w-full min-w-0 flex items-center gap-1.5 text-left bg-transparent border-none p-0 cursor-pointer"
          onClick={e => e.stopPropagation()}
          aria-label="点击展开小面板"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {summary}
          </span>
          {extraCount > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              +{extraCount}
            </span>
          )}
          <i className="ri-arrow-down-s-line shrink-0 text-base text-muted-foreground/80" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn(
          "w-[380px] max-w-[88vw] rounded-xl border border-border bg-background p-0 text-foreground shadow-xl",
          contentClassName,
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="border-b border-border/70 px-3.5 py-2.5">
          <p className="text-xs font-semibold text-foreground">{panelTitle}</p>
          {panelSubtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{panelSubtitle}</p>
          )}
        </div>

        <div className={cn("max-h-64 overflow-auto px-3.5 py-2.5", listClassName)}>
          {items.map((item, index) => (
            <div
              key={getKey(item, index)}
              className="rounded-md px-1.5 py-1 text-[13px] leading-5 hover:bg-muted/35"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
