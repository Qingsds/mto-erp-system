import { Link, useRouterState } from "@tanstack/react-router"
import { cn }                   from "@/lib/utils"

const ITEMS = [
  { to: "/",       label: "首页", icon: "ri-home-4-line",     iconActive: "ri-home-4-fill"     },
  { to: "/parts",  label: "零件", icon: "ri-settings-3-line", iconActive: "ri-settings-3-fill" },
  null, // FAB slot
  { to: "/orders", label: "订单", icon: "ri-file-list-3-line",iconActive: "ri-file-list-3-fill"},
  { to: "/deliveries", label: "发货", icon: "ri-truck-line", iconActive: "ri-truck-fill" },
]

interface BottomNavProps {
  onFabClick?: () => void
}

export function BottomNav({ onFabClick }: BottomNavProps) {
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90"
      style={{
        height: "var(--erp-bottom-nav-safe-h)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="grid h-full grid-cols-5 items-stretch"
        style={{ minHeight: "var(--erp-bottom-nav-h, 60px)" }}
      >
        {ITEMS.map((item) => {
          // FAB center slot
          if (!item) {
            return (
              <div key="fab" className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onFabClick}
                  aria-label="快速添加"
                  className={cn(
                    "relative -top-4 size-13",
                    "bg-primary text-primary-foreground",
                    "flex items-center justify-center",
                    "border-4 border-background",
                    "active:scale-95 transition-transform cursor-pointer",
                    "shadow-lg",
                  )}
                >
                  <i className="ri-add-line text-[22px]" />
                </button>
              </div>
            )
          }

          const active =
            path === item.to || (item.to !== "/" && path.startsWith(item.to))

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1",
                "no-underline transition-colors select-none",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <i className={cn("text-xl", active ? item.iconActive : item.icon)} />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
