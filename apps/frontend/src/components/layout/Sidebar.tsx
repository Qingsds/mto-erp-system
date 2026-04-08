import { Link, useRouterState } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { useIsAdmin } from "@/lib/permissions"

// ─── Nav config ───────────────────────────────────────────
const NAV = [
  {
    section: "概览",
    items: [
      {
        to: "/",
        label: "仪表盘",
        icon: "ri-dashboard-line",
        iconActive: "ri-dashboard-fill",
      },
    ],
  },
  {
    section: "业务管理",
    items: [
      {
        to: "/parts",
        label: "零件库",
        icon: "ri-settings-3-line",
        iconActive: "ri-settings-3-fill",
        badge: undefined,
      },
      {
        to: "/orders",
        label: "订单管理",
        icon: "ri-file-list-3-line",
        iconActive: "ri-file-list-3-fill",
        badge: "24",
      },
      {
        to: "/deliveries",
        label: "发货管理",
        icon: "ri-truck-line",
        iconActive: "ri-truck-fill",
      },
      {
        to: "/billing",
        label: "财务对账",
        icon: "ri-bank-card-line",
        iconActive: "ri-bank-card-fill",
        badge: "4",
        adminOnly: true,
      },
    ],
  },
  {
    section: "文件归档",
    items: [
      {
        to: "/seals",
        label: "印章管理",
        icon: "ri-award-line",
        iconActive: "ri-award-fill",
        adminOnly: true,
      },
      {
        to: "/users",
        label: "用户管理",
        icon: "ri-user-settings-line",
        iconActive: "ri-user-settings-fill",
        adminOnly: true,
      },
    ],
  },
]

// ─── Nav item ─────────────────────────────────────────────
function NavItem({
  to,
  label,
  icon,
  iconActive,
  badge,
  collapsed,
}: {
  to: string
  label: string
  icon: string
  iconActive: string
  badge?: string
  collapsed: boolean
}) {
  const path = useRouterState({ select: s => s.location.pathname })
  const isActive = path === to || (to !== "/" && path.startsWith(to))

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        "no-underline whitespace-nowrap select-none",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <i
        className={cn(
          "text-base shrink-0",
          isActive ? iconActive : icon,
        )}
      />

      {!collapsed && (
        <>
          <span className='flex-1 truncate'>{label}</span>
          {badge && (
            <span className='text-[10px] font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5'>
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────
export function Sidebar() {
  const { collapsed, toggleCollapsed } = useUIStore()
  const isAdmin = useIsAdmin()

  const navSections = NAV.map(section => ({
    ...section,
    items: section.items.filter(item => !item.adminOnly || isAdmin),
  })).filter(section => section.items.length > 0)

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 overflow-hidden",
        "bg-sidebar border-r border-sidebar-border",
        "transition-[width] duration-200",
      )}
      style={{
        width: collapsed
          ? "var(--erp-sidebar-w-collapsed)"
          : "var(--erp-sidebar-w)",
      }}
    >
      {/* Logo */}
      <button
        onClick={toggleCollapsed}
        className={cn(
          "flex items-center gap-2.5 px-3 border-b border-sidebar-border",
          "bg-transparent cursor-pointer w-full text-left",
          "hover:bg-sidebar-accent transition-colors",
        )}
        style={{ height: "var(--erp-header-h, 56px)" }}
        title='切换侧边栏'
      >
        <div className='flex items-center justify-center w-6 h-6 rounded bg-primary shrink-0'>
          <i className='ri-grid-fill text-primary-foreground text-xs' />
        </div>
        {!collapsed && (
          <>
            <span className='text-sm font-semibold text-sidebar-foreground tracking-tight flex-1'>
              瑞海隆鑫ERP
            </span>
            <span className='text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded'>
              v1.0
            </span>
          </>
        )}
      </button>

      {/* Nav */}
      <nav className='flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5'>
        {navSections.map(section => (
          <div key={section.section}>
            {!collapsed && (
              <p className='text-[10.5px] font-medium tracking-widest text-muted-foreground/60 px-2.5 pt-3 pb-1 uppercase'>
                {section.section}
              </p>
            )}
            {section.items.map(item => (
              <NavItem
                key={item.to}
                {...item}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
