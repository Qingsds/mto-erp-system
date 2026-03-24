import { useEffect, useState } from "react"
import { Outlet }              from "@tanstack/react-router"
import { TooltipProvider }     from "@/components/ui/tooltip"
import { Sidebar }             from "./Sidebar"
import { Header }              from "./Header"
import { BottomNav }           from "./BottomNav"
import { SettingsPanel }       from "./SettingsPanel"
import { QuickAddSheet }       from "./QuickAddSheet"
import { ToastContainer }      from "@/components/common/ToastContainer"
import { useUIStore, useUIInit } from "@/store/ui.store"

const MOBILE_BP = 768

export function AppLayout() {
  const { isMobile, setIsMobile, showSettings } = useUIStore()
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
      <div className="flex min-h-dvh h-dvh flex-col overflow-hidden bg-background text-foreground">
        <div className="flex flex-1 overflow-hidden relative">
          {!isMobile && <Sidebar />}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <Header />
            <main className="flex-1 overflow-hidden flex flex-col bg-muted/30">
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
          {showSettings && <SettingsPanel />}
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
