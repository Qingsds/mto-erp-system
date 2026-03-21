import { Link, useRouterState } from "@tanstack/react-router"
import { cn }                   from "@/lib/utils"

const ITEMS = [
  { to: "/",       label: "首页", icon: "ri-home-4-line",     iconActive: "ri-home-4-fill"     },
  { to: "/parts",  label: "零件", icon: "ri-settings-3-line", iconActive: "ri-settings-3-fill" },
  null, // FAB slot
  { to: "/orders", label: "订单", icon: "ri-file-list-3-line",iconActive: "ri-file-list-3-fill"},
]

interface BottomNavProps {
  onFabClick?: () => void
}

export function BottomNav({ onFabClick }: BottomNavProps) {
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className="bg-background border-t border-border shrink-0"
      style={{ height: "var(--erp-bottom-nav-h, 60px)" }}
    >
      <div className="flex h-full items-stretch">
        {ITEMS.map((item) => {
          // FAB center slot
          if (!item) {
            return (
              <div key="fab" className="flex-1 flex items-center justify-center">
                <button
                  onClick={onFabClick}
                  aria-label="快速添加"
                  className={cn(
                    "relative -top-3 w-12 h-12 rounded-full",
                    "bg-primary text-primary-foreground",
                    "flex items-center justify-center",
                    "border-4 border-background",
                    "active:scale-95 transition-transform cursor-pointer",
                    "shadow-md",
                  )}
                >
                  <i className="ri-add-line text-xl" />
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
                "flex-1 flex flex-col items-center justify-center gap-0.5",
                "no-underline transition-colors select-none",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <i className={cn("text-xl", active ? item.iconActive : item.icon)} />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
