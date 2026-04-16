import { useNavigate, useRouterState } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { HeaderAccountMenu } from "./HeaderAccountMenu"
import { getLayoutLocation, type LayoutRoutePath } from "./layoutNavigation"
import { NotificationBell } from "./NotificationBell"

interface HeaderProps {
  bordered?: boolean
}

function DesktopSearchTrigger() {
  const openCommandPalette = useUIStore(state => state.openCommandPalette)

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn(
        "flex h-9 min-w-0 items-center gap-2 border border-input bg-background px-3 text-left",
        "transition-colors hover:border-ring hover:bg-muted/20",
        "w-[240px] lg:w-[320px] xl:w-[380px]",
      )}
      title="打开全局搜索"
    >
      <i className="ri-search-line text-sm text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        搜索页面、动作或快捷入口
      </span>
      <kbd className="hidden border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground xl:inline-flex">
        Ctrl K
      </kbd>
    </button>
  )
}

function HeaderBreadcrumbs({
  items,
}: {
  items: Array<{ label: string; to?: LayoutRoutePath }>
}) {
  const navigate = useNavigate()

  if (items.length <= 1) {
    return null
  }

  return (
    <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            disabled={!item.to}
            onClick={() => item.to && navigate({ to: item.to })}
            className={cn(
              "truncate border-none bg-transparent p-0",
              item.to ? "cursor-pointer hover:text-foreground" : "cursor-default",
              index === items.length - 1 && "text-foreground",
            )}
          >
            {item.label}
          </button>
          {index < items.length - 1 && (
            <span className="shrink-0 text-muted-foreground/50">/</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function Header({ bordered = true }: HeaderProps) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const {
    isMobile,
    toggleCollapsed,
    openSettings,
    closeSettings,
    openCommandPalette,
    showSettings,
  } = useUIStore()
  const location = getLayoutLocation(pathname)

  return (
    <header
      className={cn(
        "shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90",
        bordered && "border-b border-border",
      )}
      style={{ height: "var(--erp-header-h, 56px)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-[var(--erp-shell-max-w)] items-center gap-3 px-4 sm:px-[var(--erp-page-px)]">
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 shrink-0"
            title="切换侧边栏"
          >
            <i className="ri-menu-line text-base" />
          </Button>
        )}

        <div className="min-w-0 flex-1">
          {isMobile ? (
            <p className="truncate text-sm font-medium text-foreground">
              {location.mobileLabel}
            </p>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <p className="truncate text-sm font-medium text-foreground">
                {location.pageLabel}
              </p>
              <div className="min-w-0 flex-1">
                <HeaderBreadcrumbs items={location.breadcrumbs} />
              </div>
            </div>
          )}
        </div>

        {!isMobile && <DesktopSearchTrigger />}

        <div className="flex items-center gap-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={openCommandPalette}
              title="打开全局搜索"
              className="h-8 w-8"
            >
              <i className="ri-search-line text-base" />
            </Button>
          )}

          <Button
            variant={showSettings ? "secondary" : "ghost"}
            size="icon"
            onClick={() => (showSettings ? closeSettings() : openSettings())}
            title="外观设置"
            className="h-8 w-8"
          >
            <i className="ri-equalizer-2-line text-base" />
          </Button>

          <NotificationBell />

          {isMobile && <HeaderAccountMenu compact />}
        </div>
      </div>
    </header>
  )
}
