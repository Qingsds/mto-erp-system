import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  resolveAppearancePreset,
  useUIStore,
  type AppearancePreset,
  type Density,
  type FontSize,
  type LineHeight,
} from "@/store/ui.store"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const PRESET_META: Array<{
  value: Exclude<AppearancePreset, "custom">
  label: string
  description: string
}> = [
  {
    value: "compact-input",
    label: "紧凑录入",
    description: "12px / 1.4 / 紧凑密度，适合高频录入和扫描。",
  },
  {
    value: "default-browse",
    label: "标准浏览",
    description: "14px / 1.6 / 默认密度，适合日常浏览和处理。",
  },
  {
    value: "comfortable-read",
    label: "舒适阅读",
    description: "16px / 1.8 / 舒适密度，适合长时间阅读。",
  },
]

const PRESET_LABELS: Record<AppearancePreset, string> = {
  "compact-input": "紧凑录入",
  "default-browse": "标准浏览",
  "comfortable-read": "舒适阅读",
  custom: "自定义",
}

const DENSITY_LABELS: Record<Density, string> = {
  compact: "紧凑",
  default: "默认",
  comfortable: "舒适",
}

const LINE_HEIGHT_LABELS: Record<LineHeight, string> = {
  1.4: "紧凑",
  1.6: "标准",
  1.8: "舒展",
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

function OptionGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function SummaryBadge({ label }: { label: string }) {
  return <Badge variant="outline" className="h-6 px-2 text-[11px]">{label}</Badge>
}

function AppearancePreview() {
  return (
    <div className="overflow-hidden border border-border bg-background">
      <div className="border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              订单管理
            </p>
            <p className="text-[11px] text-muted-foreground">
              页头、密度与状态标签实时预览
            </p>
          </div>
          <Badge className="shrink-0">进行中</Badge>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-8 min-w-0 flex-1 border border-input bg-background px-2 text-xs text-muted-foreground leading-8">
            搜索订单号、客户、材料
          </div>
          <div className="h-8 border border-input bg-background px-3 text-xs leading-8 text-foreground">
            导出
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
        <div
          className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-3"
          style={{ padding: "var(--erp-cell-pad)" }}
        >
          <span>订单号</span>
          <span>客户</span>
          <span>状态</span>
        </div>
      </div>

      {[
        {
          orderNo: "ORD-0138",
          customer: "华海精密",
          status: "待确认",
          statusClassName: "bg-secondary text-secondary-foreground",
        },
        {
          orderNo: "ORD-0137",
          customer: "长城重工",
          status: "已排产",
          statusClassName: "bg-primary/12 text-primary",
        },
      ].map(row => (
        <div
          key={row.orderNo}
          className="grid grid-cols-[1.2fr_1fr_0.8fr] items-center gap-3 border-b border-border last:border-b-0"
          style={{ padding: "var(--erp-cell-pad)" }}
        >
          <span className="font-mono text-xs text-muted-foreground">
            {row.orderNo}
          </span>
          <span className="truncate text-sm text-foreground">{row.customer}</span>
          <span
            className={cn(
              "inline-flex w-fit items-center px-2 py-0.5 text-[10px] font-medium",
              row.statusClassName,
            )}
          >
            {row.status}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AppearanceSettingsContent() {
  const {
    isDark,
    fontSize,
    lineHeight,
    density,
    setDark,
    setFontSize,
    setLineHeight,
    setDensity,
    applyPreset,
    resetAppearance,
  } = useUIStore()

  const currentPreset = resolveAppearancePreset({ fontSize, lineHeight, density })

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20">
      <div className="space-y-3 p-4">
        <Section
          title="当前组合"
          description="所有设置都会即时生效，不需要单独保存。"
        >
          <div className="flex flex-wrap gap-2">
            <SummaryBadge label={isDark ? "深色" : "浅色"} />
            <SummaryBadge label={PRESET_LABELS[currentPreset]} />
            <SummaryBadge label={`${fontSize}px`} />
            <SummaryBadge label={`${DENSITY_LABELS[density]}密度`} />
          </div>
        </Section>

        <Section
          title="效率预设"
          description="先选择一套浏览节奏，再按需覆盖单项设置。"
        >
          <div className="space-y-2">
            {PRESET_META.map(preset => {
              const isActive = currentPreset === preset.value

              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset.value)}
                  className={cn(
                    "w-full border px-3 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary/6"
                      : "border-border bg-background hover:border-ring hover:bg-muted/35",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {preset.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                    {isActive && <Badge className="shrink-0">当前</Badge>}
                  </div>
                </button>
              )
            })}
          </div>
        </Section>

        <Section
          title="细项设置"
          description="主题与阅读密度可以单独覆盖，命中预设以外的组合会显示为自定义。"
        >
          <div className="space-y-4">
            <OptionGroup label="主题">
              <ToggleGroup
                type="single"
                value={isDark ? "dark" : "light"}
                onValueChange={value => {
                  if (value === "light") setDark(false)
                  if (value === "dark") setDark(true)
                }}
                variant="outline"
                size="sm"
                spacing={1}
                className="w-full flex-wrap"
              >
                <ToggleGroupItem value="light">浅色</ToggleGroupItem>
                <ToggleGroupItem value="dark">深色</ToggleGroupItem>
              </ToggleGroup>
            </OptionGroup>

            <Separator />

            <OptionGroup label="字体大小">
              <ToggleGroup
                type="single"
                value={String(fontSize)}
                onValueChange={value => {
                  if (value) setFontSize(Number(value) as FontSize)
                }}
                variant="outline"
                size="sm"
                spacing={1}
                className="w-full flex-wrap"
              >
                {([12, 14, 16, 18] as FontSize[]).map(value => (
                  <ToggleGroupItem key={value} value={String(value)}>
                    {value}px
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </OptionGroup>

            <Separator />

            <OptionGroup label="行高">
              <ToggleGroup
                type="single"
                value={String(lineHeight)}
                onValueChange={value => {
                  if (value) setLineHeight(Number(value) as LineHeight)
                }}
                variant="outline"
                size="sm"
                spacing={1}
                className="w-full flex-wrap"
              >
                {([1.4, 1.6, 1.8] as LineHeight[]).map(value => (
                  <ToggleGroupItem key={value} value={String(value)}>
                    {LINE_HEIGHT_LABELS[value]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </OptionGroup>

            <Separator />

            <OptionGroup label="信息密度">
              <ToggleGroup
                type="single"
                value={density}
                onValueChange={value => {
                  if (value) setDensity(value as Density)
                }}
                variant="outline"
                size="sm"
                spacing={1}
                className="w-full flex-wrap"
              >
                {(
                  [
                    { value: "compact", label: "紧凑" },
                    { value: "default", label: "默认" },
                    { value: "comfortable", label: "舒适" },
                  ] as const
                ).map(option => (
                  <ToggleGroupItem key={option.value} value={option.value}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </OptionGroup>
          </div>
        </Section>

        <Section
          title="实时预览"
          description="页头、表格行和状态标签会跟随当前设置同步变化。"
        >
          <AppearancePreview />
        </Section>

        <Section
          title="操作"
          description="恢复到默认浏览组合：浅色、14px、1.6 行高、默认密度。"
        >
          <Button variant="outline" onClick={resetAppearance}>
            恢复默认
          </Button>
        </Section>
      </div>
    </div>
  )
}
