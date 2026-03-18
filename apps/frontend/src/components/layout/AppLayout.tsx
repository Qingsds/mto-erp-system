import { useEffect, useState } from "react"
import { Outlet }              from "@tanstack/react-router"
import { TooltipProvider }     from "@/components/ui/tooltip"
import { Sidebar }             from "./Sidebar"
import { Header }              from "./Header"
import { BottomNav }           from "./BottomNav"
import { SettingsPanel }       from "./SettingsPanel"
import { QuickAddSheet }       from "./QuickAddSheet"
import { useUIStore, useUIInit } from "@/store/ui.store"

const MOBILE_BP = 768

export function AppLayout() {
  const { isMobile, setIsMobile, showSettings } = useUIStore()
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  // Sync persisted CSS vars on mount
  useUIInit()

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [setIsMobile])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
        <div className="flex flex-1 overflow-hidden relative">

          {/* Sidebar — desktop only */}
          {!isMobile && <Sidebar />}

          {/* Main */}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <Header />
            <main className="flex-1 overflow-hidden flex flex-col bg-muted/30">
              <Outlet />
            </main>
            {/* Bottom nav — mobile only */}
            {isMobile && <BottomNav onFabClick={() => setShowQuickAdd(true)} />}
          </div>

          {/* Settings panel */}
          {showSettings && <SettingsPanel />}
        </div>

        {/* Quick add sheet — mobile only */}
        {isMobile && showQuickAdd && (
          <QuickAddSheet onClose={() => setShowQuickAdd(false)} />
        )}
      </div>
    </TooltipProvider>
  )
}
