import { Link, useRouterState } from "@tanstack/react-router"
import { useIsAdmin } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { getBottomNavItems } from "./layoutNavigation"

interface BottomNavProps {
  onFabClick?: () => void
}

export function BottomNav({ onFabClick }: BottomNavProps) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const isAdmin = useIsAdmin()
  const items = getBottomNavItems(isAdmin)

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
        {items.slice(0, 2).map(item => {
          const active =
            pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to))

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 no-underline transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <i className={cn("text-xl", active ? item.iconActive : item.icon)} />
              <span className="text-[10px] leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          )
        })}

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onFabClick}
            aria-label="打开快捷操作"
            className={cn(
              "relative -top-4 flex size-13 items-center justify-center border-4 border-background bg-primary text-primary-foreground",
              "cursor-pointer shadow-lg transition-transform active:scale-95",
            )}
          >
            <i className="ri-add-line text-[22px]" />
          </button>
        </div>

        {items.slice(2, 4).map(item => {
          const active =
            pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to))

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 no-underline transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <i className={cn("text-xl", active ? item.iconActive : item.icon)} />
              <span className="text-[10px] leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
