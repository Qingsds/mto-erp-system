import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useUIStore }       from "@/store/ui.store"
import { cn }               from "@/lib/utils"
import { Button }           from "@/components/ui/button"

type RoutePath = "/" | "/parts" | "/orders" | "/deliveries" | "/billing" | "/seals"

interface BreadcrumbItem {
  label: string
  to?: RoutePath
}

const SECTION_LABELS: Record<string, string> = {
  "": "仪表盘",
  parts: "零件库",
  orders: "订单管理",
  deliveries: "发货管理",
  billing: "财务对账",
  seals: "印章管理",
}

const SECTION_PATHS: Record<string, RoutePath | undefined> = {
  parts: "/parts",
  orders: "/orders",
  deliveries: "/deliveries",
  billing: "/billing",
  seals: "/seals",
}

function getDetailLabel(section: string) {
  if (section === "orders") return "订单详情"
  if (section === "parts") return "零件详情"
  if (section === "deliveries") return "发货详情"
  return "详情"
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: SECTION_LABELS[""], to: "/" }]
  }

  const [section, ...rest] = segments
  const sectionPath = SECTION_PATHS[section]
  const sectionLabel = SECTION_LABELS[section] ?? "MTO ERP"
  const items: BreadcrumbItem[] = [{ label: sectionLabel, to: sectionPath }]

  if (rest.length === 0) {
    return items
  }

  const tail = rest[rest.length - 1]

  if (tail === "new" && section === "orders") {
    items.push({ label: "新建订单" })
    return items
  }

  items.push({ label: getDetailLabel(section) })
  return items
}

// ─── Header ───────────────────────────────────────────────
export function Header() {
  const { isMobile, toggleCollapsed, toggleSettings, showSettings } = useUIStore()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const breadcrumbs = getBreadcrumbItems(pathname)
  const mobileLabel = breadcrumbs[breadcrumbs.length - 1]?.label ?? "MTO ERP"

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
        <div className="flex items-center justify-center w-6 h-6 bg-primary shrink-0">
          <i className="ri-grid-fill text-primary-foreground text-xs" />
        </div>
      )}

      {/* Breadcrumb / page title */}
      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        {isMobile ? (
          <span className="font-medium text-foreground truncate">{mobileLabel}</span>
        ) : (
          <>
            <span className="text-muted-foreground shrink-0">MTO ERP</span>
            <span className="text-muted-foreground/40 shrink-0">/</span>
            {breadcrumbs.map((item, index) => (
              <div key={`${item.label}-${index}`} className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  disabled={!item.to}
                  onClick={() => item.to && navigate({ to: item.to })}
                  className={cn(
                    "truncate bg-transparent border-none p-0",
                    item.to ? "cursor-pointer hover:text-foreground transition-colors" : "cursor-default",
                    index === breadcrumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <span className="text-muted-foreground/40 shrink-0">/</span>
                )}
              </div>
            ))}
          </>
        )}
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
          <kbd className="text-[10px] font-mono bg-muted border border-border px-1">
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
          title="张三 · 管理员"
        >
          <div className="w-7 h-7 bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
            张
          </div>
        </Button>
      </div>
    </header>
  )
}
