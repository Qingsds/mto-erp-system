import { useToastStore } from "@/lib/toast"
import { cn } from "@/lib/utils"

const ICON: Record<string, string> = {
  success: "ri-checkbox-circle-fill text-emerald-500",
  error:   "ri-close-circle-fill text-destructive",
  info:    "ri-information-fill text-blue-500",
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg border border-border",
            "bg-background text-sm text-foreground pointer-events-auto",
            "animate-in slide-in-from-right-4 fade-in duration-200",
          )}
        >
          <i className={cn(ICON[t.type], "text-base shrink-0")} />
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="ml-2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0 shrink-0"
          >
            <i className="ri-close-line text-xs" />
          </button>
        </div>
      ))}
    </div>
  )
}