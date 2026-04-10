import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { AppearanceSettingsContent } from "./AppearanceSettingsContent"

export function SettingsPanel() {
  const { isMobile, showSettings, closeSettings, setSettingsOpen } = useUIStore()

  return (
    <Sheet open={showSettings} onOpenChange={setSettingsOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        showCloseButton={false}
        className={cn(
          "gap-0 border-border bg-background p-0",
          isMobile
            ? "h-[88vh] max-h-[88vh] w-full sm:max-w-none"
            : "h-full w-[360px] sm:max-w-[360px]",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <SheetTitle>外观设置</SheetTitle>
            <SheetDescription className="mt-1 text-xs">
              调整主题、阅读密度和浏览节奏，改动会即时生效。
            </SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeSettings}
            className="shrink-0"
            title="关闭外观设置"
          >
            <i className="ri-close-line text-base" />
          </Button>
        </div>

        <AppearanceSettingsContent />
      </SheetContent>
    </Sheet>
  )
}
