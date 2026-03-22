import { useEffect, useRef, useState } from "react"
import { useNavigate }                 from "@tanstack/react-router"
import { Button }                      from "@/components/ui/button"
import { cn }                          from "@/lib/utils"

interface Action {
  icon:  string
  title: string
  desc:  string
  to:    string
}

const ACTIONS: Action[] = [
  { icon: "ri-settings-3-line", title: "新增零件", desc: "录入新零件，系统自动生成编号", to: "/parts?action=new" },
  { icon: "ri-file-list-3-line",title: "新建订单", desc: "选择客户和零件，锁定价格快照", to: "/orders/new" },
]

interface QuickAddSheetProps {
  onClose: () => void
}

export function QuickAddSheet({ onClose }: QuickAddSheetProps) {
  const navigate   = useNavigate()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const go = (to: string) => {
    close()
    setTimeout(() => navigate({ to }), 220)
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && close()}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        background: visible ? "rgba(0,0,0,.4)" : "rgba(0,0,0,0)",
        transition: "background .22s ease",
      }}
    >
      <div
        className="bg-background rounded-t-2xl"
        style={{
          transform:  visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform .22s cubic-bezier(.32,0,.67,0)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">快速操作</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={close}>
            <i className="ri-close-line text-base" />
          </Button>
        </div>

        {/* Actions */}
        <div className="p-3 flex flex-col gap-1">
          {ACTIONS.map((a) => (
            <button
              key={a.to}
              onClick={() => go(a.to)}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-lg text-left",
                "bg-transparent border-none cursor-pointer",
                "hover:bg-accent active:bg-accent transition-colors",
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <i className={cn(a.icon, "text-primary text-lg")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
              <i className="ri-arrow-right-s-line text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
