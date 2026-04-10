import { Link, useRouterState } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsAdmin } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { HeaderAccountMenu } from "./HeaderAccountMenu"
import { filterLayoutNavSections } from "./layoutNavigation"

function SidebarNavItem({
  to,
  label,
  icon,
  iconActive,
  collapsed,
}: {
  to: string
  label: string
  icon: string
  iconActive: string
  collapsed: boolean
}) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to))

  const content = (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 border border-transparent px-3 py-2.5 text-sm no-underline transition-colors",
        isActive
          ? "border-primary/20 bg-primary/8 text-primary"
          : "text-sidebar-foreground/72 hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <i className={cn("shrink-0 text-base", isActive ? iconActive : icon)} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )

  if (!collapsed) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const { collapsed, toggleCollapsed } = useUIStore()
  const isAdmin = useIsAdmin()
  const sections = filterLayoutNavSections(isAdmin)

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200"
      style={{
        width: collapsed
          ? "var(--erp-sidebar-w-collapsed)"
          : "var(--erp-sidebar-w)",
      }}
    >
      <div
        className={cn(
          "border-b border-sidebar-border px-3 py-3",
          collapsed ? "flex justify-center" : "space-y-3",
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "flex w-full items-center gap-3 border border-transparent bg-transparent p-0 text-left transition-colors",
            "hover:border-sidebar-border hover:bg-sidebar-accent",
            collapsed && "justify-center",
          )}
          title="切换侧边栏"
        >
          <div className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <i className="ri-grid-fill text-sm" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                MTO ERP
              </p>
              <p className="mt-1 truncate text-[11px] text-sidebar-foreground/60">
                导航壳与全局工作入口
              </p>
            </div>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map(section => (
          <div key={section.id} className="mb-4 last:mb-0">
            {!collapsed && (
              <p className="px-2 py-1 text-[10.5px] font-medium tracking-[0.14em] text-sidebar-foreground/45 uppercase">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items
                .filter(item => item.showInSidebar)
                .map(item => (
                  <SidebarNavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    iconActive={item.iconActive}
                    collapsed={collapsed}
                  />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="text-[10.5px] font-medium tracking-[0.14em] text-sidebar-foreground/45 uppercase">
              账户与系统
            </p>
            <Button
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground"
              title="通知暂未接入"
              disabled
            >
              <i className="ri-notification-3-line text-sm" />
            </Button>
          </div>
        )}

        <HeaderAccountMenu placement="sidebar" compact={collapsed} />
      </div>
    </aside>
  )
}
