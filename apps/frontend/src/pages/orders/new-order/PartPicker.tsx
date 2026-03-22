import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiPricesToForm, type PartListItem } from "@/hooks/api/useParts"

interface PartPickerProps {
  open: boolean
  parts: PartListItem[]
  onSelect: (part: PartListItem) => void
  onClose: () => void
}

export function PartPicker({
  open,
  parts,
  onSelect,
  onClose,
}: PartPickerProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parts
    return parts.filter(part =>
      part.name.toLowerCase().includes(q) ||
      part.partNumber.toLowerCase().includes(q) ||
      part.material.toLowerCase().includes(q),
    )
  }, [parts, query])

  return (
    <Dialog open={open} onOpenChange={nextOpen => {
      if (!nextOpen) {
        setQuery("")
        onClose()
      }
    }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm font-medium text-muted-foreground">选择零件</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 h-9 px-3 border border-input bg-background">
            <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索名称、编号、材质…"
              className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <i className="ri-search-line text-2xl opacity-30 mb-2" />
              <p className="text-sm">没有匹配「{query}」的零件</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(part => {
                const prices = apiPricesToForm(part.commonPrices)
                const stdPrice = prices.find(price => price.label === "标准价") ?? prices[0]

                return (
                  <button
                    key={part.id}
                    onClick={() => {
                      onSelect(part)
                      setQuery("")
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-primary/10 flex items-center justify-center shrink-0">
                      <i className="ri-settings-3-line text-primary text-sm" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{part.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {part.partNumber}
                        <span className="mx-1.5 opacity-40">·</span>
                        {part.material}
                        {part.spec && <span className="ml-1.5 opacity-60">{part.spec}</span>}
                      </p>
                    </div>

                    {stdPrice && (
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium">
                          ¥{stdPrice.value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{stdPrice.label}</p>
                      </div>
                    )}

                    <i className="ri-arrow-right-s-line text-muted-foreground/40 shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {query ? `找到 ${filtered.length} 个零件` : `共 ${parts.length} 个零件`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
