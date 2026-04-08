import type { ReactNode } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"

/**
 * 文档相关弹层统一壳。
 *
 * 负责统一桌面端 / 移动端的呈现方式，避免文件预览与 Excel 导出预览各自维护一套浮层样式。
 */
interface DocumentDialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  bodyClassName?: string
}

export function DocumentDialogShell({
  open,
  onOpenChange,
  title,
  description,
  actions,
  footer,
  children,
  bodyClassName,
}: DocumentDialogShellProps) {
  const { isMobile } = useUIStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isMobile
            ? "left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none"
            : "flex h-[min(88dvh,960px)] w-[min(96vw,1200px)] max-w-[min(96vw,1200px)] flex-col gap-0 rounded-none border border-border bg-background p-0 sm:max-w-[min(96vw,1200px)]"
        }
        overlayClassName='bg-black/82'
        showCloseButton={false}
      >
        <div className='flex items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4'>
          <div className='min-w-0'>
            <DialogTitle className='truncate text-sm font-semibold'>
              {title}
            </DialogTitle>
            {description && (
              <p className='mt-1 text-xs text-muted-foreground'>
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className='flex shrink-0 items-center gap-2'>
              {actions}
            </div>
          )}
        </div>

        <div className={cn("min-h-0 flex-1", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div
            className='shrink-0 border-t border-border bg-background px-4 py-4 sm:px-6'
            style={{
              paddingBottom:
                "max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))",
            }}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
