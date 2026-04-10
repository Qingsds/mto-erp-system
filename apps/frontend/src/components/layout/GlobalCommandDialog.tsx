import { useDeferredValue, useEffect, useState } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useIsAdmin } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui.store"
import { getCommandItems } from "./layoutNavigation"

interface CommandActionItem {
  id: string
  label: string
  description: string
  icon: string
  kind: "page" | "action"
  aliases: string[]
  to?: string
  run?: () => void
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  )
}

export function GlobalCommandDialog() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: state => state.location.pathname })
  const isAdmin = useIsAdmin()
  const {
    showCommandPalette,
    openCommandPalette,
    closeCommandPalette,
    setCommandPaletteOpen,
    openSettings,
  } = useUIStore()

  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        openCommandPalette()
        return
      }

      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault()
        openCommandPalette()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openCommandPalette])

  const items: CommandActionItem[] = [
    ...getCommandItems(isAdmin),
    {
      id: "action:settings",
      label: "打开外观设置",
      description: "调整主题、密度和阅读节奏。",
      icon: "ri-equalizer-2-line",
      kind: "action",
      aliases: ["设置", "外观", "theme", "appearance"],
      run: () => {
        closeCommandPalette()
        openSettings()
      },
    },
  ]

  const filteredItems = deferredQuery
    ? items.filter(item => {
        const haystack = [item.label, item.description, ...item.aliases]
          .join(" ")
          .toLowerCase()

        return haystack.includes(deferredQuery)
      })
    : items

  const pageItems = filteredItems.filter(item => item.kind === "page")
  const actionItems = filteredItems.filter(item => item.kind === "action")

  const handleOpenChange = (open: boolean) => {
    setCommandPaletteOpen(open)
    if (!open) {
      setQuery("")
    }
  }

  const handleSelect = (item: CommandActionItem) => {
    if (item.run) {
      item.run()
      return
    }

    if (item.to) {
      closeCommandPalette()
      void navigate({ to: item.to })
    }
  }

  return (
    <Dialog open={showCommandPalette} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[680px] gap-0 border border-border bg-background p-0 shadow-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <DialogTitle>全局搜索</DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              搜索页面入口、快捷动作和高频操作。支持 `Ctrl/Cmd + K` 或 `/`。
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeCommandPalette}
            title="关闭全局搜索"
          >
            <i className="ri-close-line text-base" />
          </Button>
        </div>

        <div className="border-b border-border px-4 py-3">
          <Input
            autoFocus
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索页面、动作或关键词"
            className="h-10 rounded-none border-input bg-background text-sm"
          />
        </div>

        <div className="max-h-[62vh] overflow-y-auto">
          <div className="space-y-4 p-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  页面
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {pageItems.length} 项
                </span>
              </div>
              {pageItems.length > 0 ? (
                <div className="space-y-1">
                  {pageItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "flex w-full items-center gap-3 border border-border bg-card px-3 py-3 text-left transition-colors",
                        item.to && pathname === item.to
                          ? "border-primary/30 bg-primary/6"
                          : "hover:border-ring hover:bg-muted/35",
                      )}
                    >
                      <div className="flex size-9 items-center justify-center border border-border bg-background">
                        <i className={cn(item.icon, "text-base text-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        页面
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  没有匹配到页面入口。
                </div>
              )}
            </section>

            <Separator />

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  动作
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  {actionItems.length} 项
                </span>
              </div>
              {actionItems.length > 0 ? (
                <div className="space-y-1">
                  {actionItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 border border-border bg-card px-3 py-3 text-left transition-colors hover:border-ring hover:bg-muted/35"
                    >
                      <div className="flex size-9 items-center justify-center border border-border bg-background">
                        <i className={cn(item.icon, "text-base text-foreground")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        动作
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  没有匹配到可执行动作。
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
