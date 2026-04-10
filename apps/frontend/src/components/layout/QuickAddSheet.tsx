import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { getQuickActions } from "./layoutNavigation"

interface QuickAddSheetProps {
  onClose: () => void
}

export function QuickAddSheet({ onClose }: QuickAddSheetProps) {
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const actions = getQuickActions(isAdmin)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const go = (to: string) => {
    close()
    setTimeout(() => void navigate({ to }), 220)
  }

  return (
    <div
      ref={overlayRef}
      onClick={event => event.target === overlayRef.current && close()}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        background: visible ? "rgba(0,0,0,.4)" : "rgba(0,0,0,0)",
        transition: "background .22s ease",
      }}
    >
      <div
        className="bg-background"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .22s cubic-bezier(.32,0,.67,0)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-foreground">快捷操作</span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              直接进入高频创建和录入流程
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <i className="ri-close-line text-base" />
          </Button>
        </div>

        <div className="flex flex-col gap-1 p-3">
          {actions.map(action => (
            <button
              key={action.id}
              type="button"
              onClick={() => go(action.to)}
              className={cn(
                "flex w-full items-center gap-3 border border-transparent px-4 py-4 text-left transition-colors",
                "bg-transparent hover:border-border hover:bg-accent active:bg-accent",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <i className={cn(action.icon, "text-lg")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <i className="ri-arrow-right-s-line text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
