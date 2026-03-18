import { useRouterState }  from "@tanstack/react-router"
import { useUIStore }       from "@/store/ui.store"
import { cn }               from "@/lib/utils"
import { Button }           from "@/components/ui/button"

// ─── Route → label ────────────────────────────────────────
const LABELS: Record<string, string> = {
  "/":            "仪表盘",
  "/parts":       "零件库",
  "/orders":      "订单管理",
  "/deliveries":  "发货管理",
  "/billing":     "财务对账",
  "/seals":       "印章管理",
}

function getLabel(p: string) {
  if (LABELS[p]) return LABELS[p]
  const match = Object.keys(LABELS)
    .filter((k) => k !== "/" && p.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return match ? LABELS[match] : "MTO ERP"
}

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const { isMobile, toggleCollapsed, toggleSettings, showSettings } = useUIStore()
  const path  = useRouterState({ select: (s) => s.location.pathname })
  const label = getLabel(path)

  return (
    <header
      className="flex items-center gap-2 px-4 bg-background border-b border-border shrink-0"
      style={{ height: "var(--erp-header-h, 56px)" }}
    >
      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="shrink-0"
          title="折叠侧边栏"
        >
          <i className="ri-menu-line text-base" />
        </Button>
      )}

      {/* Mobile: logo mark */}
      {isMobile && (
        <div className="flex items-center justify-center w-6 h-6 rounded bg-primary shrink-0">
          <i className="ri-grid-fill text-primary-foreground text-xs" />
        </div>
      )}

      {/* Breadcrumb / page title */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        {!isMobile && (
          <>
            <span className="text-muted-foreground">MTO ERP</span>
            <span className="text-muted-foreground/40">/</span>
          </>
        )}
        <span className="font-medium text-foreground truncate">{label}</span>
      </div>

      {/* Search — desktop only */}
      {!isMobile && (
        <button
          className={cn(
            "flex items-center gap-2 h-8 px-3 min-w-[160px]",
            "rounded-md border border-input bg-background",
            "text-sm text-muted-foreground",
            "hover:border-ring transition-colors cursor-text",
          )}
        >
          <i className="ri-search-line text-sm" />
          <span className="flex-1 text-left">搜索...</span>
          <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Settings */}
        <Button
          variant={showSettings ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleSettings}
          title="外观设置"
        >
          <i className="ri-equalizer-2-line text-base" />
        </Button>

        {/* Notification */}
        <div className="relative">
          <Button variant="ghost" size="icon" title="通知">
            <i className="ri-notification-3-line text-base" />
          </Button>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive border-2 border-background" />
        </div>

        {/* Avatar */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          title="张三 · 管理员"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
            张
          </div>
        </Button>
      </div>
    </header>
  )
}
