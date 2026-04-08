import { useUIStore, type Density, type FontSize, type LineHeight } from "@/store/ui.store"
import { Button }    from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn }        from "@/lib/utils"

// ─── Option chip ──────────────────────────────────────────
function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 px-3 rounded-md text-xs font-medium",
        "border transition-colors cursor-pointer font-sans",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-input hover:text-foreground hover:border-ring",
      )}
    >
      {label}
    </button>
  )
}

// ─── Setting row ──────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="text-xs font-medium text-muted-foreground mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

// ─── Mini preview ─────────────────────────────────────────
function Preview() {
  return (
    <div className="rounded-md border border-border overflow-hidden text-xs mt-4">
      {/* header */}
      <div className="px-3 py-2 bg-muted border-b border-border grid grid-cols-3 gap-2">
        {["订单号", "客户", "状态"].map((h) => (
          <span key={h} className="text-muted-foreground font-medium">{h}</span>
        ))}
      </div>
      {/* rows */}
      {[
        { no: "ORD-0089", c: "华夏精密", s: "进行中",  v: "bg-primary/10 text-primary"      },
        { no: "ORD-0088", c: "长城重工", s: "发货中",  v: "bg-secondary text-secondary-foreground" },
      ].map((r) => (
        <div
          key={r.no}
          style={{ padding: "var(--erp-cell-pad, 8px 12px)" }}
          className="grid grid-cols-3 gap-2 items-center border-b last:border-0 border-border"
        >
          <span className="font-mono text-muted-foreground">{r.no}</span>
          <span className="text-foreground">{r.c}</span>
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium w-fit", r.v)}>
            {r.s}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────
export function SettingsPanel() {
  const {
    isDark, setDark,
    fontSize, setFontSize,
    lineHeight, setLineHeight,
    density, setDensity,
    toggleSettings,
  } = useUIStore()

  return (
    <aside className="absolute top-0 right-0 bottom-0 z-50 flex w-72 flex-col border-l border-border bg-background shadow-lg">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
        <div>
          <span className="text-sm font-semibold">外观设置</span>
          <p className="mt-1 text-[11px] text-muted-foreground">
            仅调整显示密度与阅读体验。
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSettings} className="h-7 w-7">
          <i className="ri-close-line text-base" />
        </Button>
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto px-4">
        <Row label="主题">
          <Chip label="🌞 亮色" active={!isDark} onClick={() => setDark(false)} />
          <Chip label="🌙 暗色" active={isDark}  onClick={() => setDark(true)} />
        </Row>
        <Separator />
        <Row label="字体大小">
          {([12, 14, 16, 18] as FontSize[]).map((v) => (
            <Chip key={v} label={`${v}px`} active={fontSize === v} onClick={() => setFontSize(v)} />
          ))}
        </Row>
        <Separator />
        <Row label="行高">
          {([
            { v: 1.4 as LineHeight, l: "紧凑" },
            { v: 1.6 as LineHeight, l: "默认" },
            { v: 1.8 as LineHeight, l: "宽松" },
          ]).map(({ v, l }) => (
            <Chip key={v} label={l} active={lineHeight === v} onClick={() => setLineHeight(v)} />
          ))}
        </Row>
        <Separator />
        <Row label="信息密度">
          {([
            { v: "compact"     as Density, l: "紧凑" },
            { v: "default"     as Density, l: "默认" },
            { v: "comfortable" as Density, l: "舒适" },
          ]).map(({ v, l }) => (
            <Chip key={v} label={l} active={density === v} onClick={() => setDensity(v)} />
          ))}
        </Row>

        {/* Live preview */}
        <div className="py-3">
          <p className="mb-1 text-xs text-muted-foreground">实时预览</p>
          <Preview />
        </div>
      </div>
    </aside>
  )
}
