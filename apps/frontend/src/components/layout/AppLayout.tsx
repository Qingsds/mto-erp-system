import { useEffect, useState } from "react"
import { Outlet }              from "@tanstack/react-router"
import { TooltipProvider }     from "@/components/ui/tooltip"
import { Sidebar }             from "./Sidebar"
import { Header }              from "./Header"
import { BottomNav }           from "./BottomNav"
import { SettingsPanel }       from "./SettingsPanel"
import { GlobalCommandDialog } from "./GlobalCommandDialog"
import { QuickAddSheet }       from "./QuickAddSheet"
import { ToastContainer }      from "@/components/common/ToastContainer"
import { useUIStore, useUIInit } from "@/store/ui.store"

const MOBILE_BP = 768

export function AppLayout() {
  const { isMobile, setIsMobile } = useUIStore()
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
          {!isMobile && <Sidebar />}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
              <Outlet />
            </main>
            {isMobile && (
              <>
                <div
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ height: "var(--erp-bottom-nav-safe-h)" }}
                />
                <BottomNav onFabClick={() => setShowQuickAdd(true)} />
              </>
            )}
          </div>
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
