import { useEffect, useState } from "react"
import { Outlet }              from "@tanstack/react-router"
import { TooltipProvider }     from "@/components/ui/tooltip"
import { SidebarBody, SidebarHeader } from "./Sidebar"
import { Header }              from "./Header"
import { BottomNav }           from "./BottomNav"
import { SettingsPanel }       from "./SettingsPanel"
import { GlobalCommandDialog } from "./GlobalCommandDialog"
import { QuickAddSheet }       from "./QuickAddSheet"
import { ToastContainer }      from "@/components/common/ToastContainer"
import { useUIStore, useUIInit } from "@/store/ui.store"

const MOBILE_BP = 768

export function AppLayout() {
  const { isMobile, collapsed, setIsMobile } = useUIStore()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  useUIInit()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [setIsMobile])

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
        <div className="relative flex flex-1 overflow-hidden">
          {!isMobile ? (
            <div
              className="relative grid min-h-0 flex-1 overflow-hidden"
              style={{
                gridTemplateColumns: `${
                  collapsed
                    ? "var(--erp-sidebar-w-collapsed)"
                    : "var(--erp-sidebar-w)"
                } minmax(0, 1fr)`,
                gridTemplateRows: "var(--erp-header-h, 56px) minmax(0, 1fr)",
              }}
            >
              <div className="border-r border-border bg-sidebar">
                <SidebarHeader />
              </div>
              <div className="bg-background">
                <Header bordered={false} />
              </div>
              <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">
                <SidebarBody />
              </aside>
              <div className="flex min-w-0 flex-col overflow-hidden bg-background">
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
                  <Outlet />
                </main>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-t border-border"
                style={{ top: "var(--erp-header-h, 56px)" }}
              />
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
                <Header />
                <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
                  <Outlet />
                </main>
                <div
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ height: "var(--erp-bottom-nav-safe-h)" }}
                />
                <BottomNav onFabClick={() => setShowQuickAdd(true)} />
              </div>
            </>
          )}
          <SettingsPanel />
          <GlobalCommandDialog />
        </div>
        {isMobile && showQuickAdd && (
          <QuickAddSheet onClose={() => setShowQuickAdd(false)} />
        )}
      </div>
      {/* 全局 Toast 挂载点 */}
      <ToastContainer />
    </TooltipProvider>
  )
}
