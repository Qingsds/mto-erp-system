import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useUIStore } from "@/store/ui.store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HeaderAccountMenu } from "./HeaderAccountMenu"

type RoutePath =
  | "/"
  | "/parts"
  | "/orders"
  | "/deliveries"
  | "/billing"
  | "/users"
  | "/seals"

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
  users: "用户管理",
  seals: "印章管理",
}

const SECTION_PATHS: Record<string, RoutePath | undefined> = {
  parts: "/parts",
  orders: "/orders",
  deliveries: "/deliveries",
  billing: "/billing",
  users: "/users",
  seals: "/seals",
}

function getDetailLabel(section: string) {
  if (section === "orders") return "订单详情"
  if (section === "parts") return "零件详情"
  if (section === "deliveries") return "发货详情"
  return "详情"
}

/**
 * 顶部搜索入口。
 *
 * 只提供一致的视觉入口，不在这一轮接真实搜索逻辑。
 * 为了减少 Header 横向压力：
 * - 常规桌面显示紧凑入口
 * - 超宽屏再显示快捷键提示
 */
function HeaderSearchTrigger() {
  return (
    <button
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 border border-input bg-background px-3",
        "cursor-text text-sm text-muted-foreground transition-colors hover:border-ring",
        "w-[148px] lg:w-[172px] xl:w-[208px]",
      )}
      title='搜索'
    >
      <i className='ri-search-line text-sm' />
      <span className='min-w-0 flex-1 truncate text-left'>搜索</span>
      <kbd className='hidden border border-border bg-muted px-1 text-[10px] font-mono xl:inline-flex'>
        ⌘K
      </kbd>
    </button>
  )
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: SECTION_LABELS[""], to: "/" }]
  }

  const [section, ...rest] = segments
  const sectionPath = SECTION_PATHS[section]
  const sectionLabel = SECTION_LABELS[section] ?? "MTO ERP"
  const items: BreadcrumbItem[] = [
    { label: sectionLabel, to: sectionPath },
  ]

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
  const { isMobile, toggleCollapsed, toggleSettings, showSettings } =
    useUIStore()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: state => state.location.pathname,
  })
  const breadcrumbs = getBreadcrumbItems(pathname)
  const mobileLabel =
    breadcrumbs[breadcrumbs.length - 1]?.label ?? "MTO ERP"

  return (
    <header
      className='shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90'
      style={{ height: "var(--erp-header-h, 56px)" }}
    >
      <div className='mx-auto flex h-full w-full max-w-[var(--erp-shell-max-w)] items-center gap-2 px-4 sm:px-[var(--erp-page-px)]'>
        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleCollapsed}
            className='h-8 w-8 shrink-0'
            title='折叠侧边栏'
          >
            <i className='ri-menu-line text-base' />
          </Button>
        )}

        {/* Mobile: logo mark */}
        {isMobile && (
          <div className='flex h-6 w-6 shrink-0 items-center justify-center border border-primary bg-primary text-primary-foreground'>
            <i className='ri-grid-fill text-primary-foreground text-xs' />
          </div>
        )}

        {/* Breadcrumb / page title */}
        <div className='flex min-w-0 flex-1 items-center gap-1.5 text-sm'>
          {isMobile ? (
            <span className='truncate font-medium text-foreground'>
              {mobileLabel}
            </span>
          ) : (
            <>
              <span className='shrink-0 text-muted-foreground'>
                瑞海隆鑫ERP
              </span>
              <span className='shrink-0 text-muted-foreground/40'>
                /
              </span>
              {breadcrumbs.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className='flex min-w-0 items-center gap-1.5'
                >
                  <button
                    type='button'
                    disabled={!item.to}
                    onClick={() => item.to && navigate({ to: item.to })}
                    className={cn(
                      "truncate border-none bg-transparent p-0",
                      item.to
                        ? "cursor-pointer transition-colors hover:text-foreground"
                        : "cursor-default",
                      index === breadcrumbs.length - 1
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <span className='shrink-0 text-muted-foreground/40'>
                      /
                    </span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Search — desktop only */}
        {!isMobile && <HeaderSearchTrigger />}

        {/* Right actions */}
        <div className='flex items-center gap-1'>
          {/* Settings */}
          <Button
            variant={showSettings ? "secondary" : "ghost"}
            size='icon'
            onClick={toggleSettings}
            title='外观设置'
            className='h-8 w-8'
          >
            <i className='ri-equalizer-2-line text-base' />
          </Button>

          {/* Notification */}
          <div className='relative'>
            <Button
              variant='ghost'
              size='icon'
              title='通知'
              className='h-8 w-8 lg:h-9 lg:w-9'
            >
              <i className='ri-notification-3-line text-base' />
            </Button>
            <span className='absolute right-1.5 top-1.5 h-1.5 w-1.5 border-2 border-background bg-destructive' />
          </div>

          <HeaderAccountMenu compact={isMobile} />
        </div>
      </div>
    </header>
  )
}
