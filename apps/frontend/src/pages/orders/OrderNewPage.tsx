/**
 * OrderNewPage.tsx — 新建订单全页表单 /orders/new
 *
 * 布局：左侧客户信息 + 备注 | 右侧 BOM 明细 + 预估金额
 * 全页宽度彻底解决抽屉空间不足的问题，支持 10+ 个零件行不局促。
 */

import { useNavigate, Link }                  from "@tanstack/react-router"
import { useFieldArray, Controller, useForm } from "react-hook-form"
import { zodResolver }                         from "@hookform/resolvers/zod"
import { useMemo, useState }                   from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input }  from "@/components/ui/input"
import { Label }  from "@/components/ui/label"
import { cn }     from "@/lib/utils"
import { OrderFormSchema, type OrderFormValues } from "./orders.schema"
import { apiPricesToForm, type PartListItem }    from "@/hooks/api/useParts"
import { useGetParts }   from "@/hooks/api/useParts"
import { useCreateOrder } from "@/hooks/api/useOrders"

// ─── Part Picker Dialog ───────────────────────────────────
function PartPicker({
  open, parts, onSelect, onClose,
}: {
  open:     boolean
  parts:    PartListItem[]
  onSelect: (part: PartListItem) => void
  onClose:  () => void
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parts
    return parts.filter(p =>
      p.name.toLowerCase().includes(q)       ||
      p.partNumber.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q),
    )
  }, [parts, query])

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { setQuery(""); onClose() } }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm font-medium text-muted-foreground">选择零件</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
            <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索名称、编号、材质…"
              className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0">
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
                const prices   = apiPricesToForm(part.commonPrices)
                const stdPrice = prices.find(p => p.label === "标准价") ?? prices[0]
                return (
                  <button key={part.id}
                    onClick={() => { onSelect(part); setQuery("") }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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

// ─── BOM 行 ───────────────────────────────────────────────
function BomRow({
  index,
  selectedPart,
  watchedItem,
  errors,
  register,
  control,
  setValue,
  canRemove,
  onOpenPicker,
  onRemove,
}: {
  index:        number
  selectedPart: PartListItem | undefined
  watchedItem:  { partId: number; orderedQty: number; _displayPrice?: number }
  errors:       any
  register:     any
  control:      any
  setValue:     any
  canRemove:    boolean
  onOpenPicker: () => void
  onRemove:     () => void
}) {
  const qty   = Number(watchedItem?.orderedQty) || 0
  const price = Number(watchedItem?._displayPrice) || 0
  const itemErr = errors.items?.[index]

  return (
    <div className={cn(
      "grid gap-x-4 gap-y-2 p-4 rounded-lg border bg-card",
      "grid-cols-[1fr_auto]",
      itemErr ? "border-destructive/40" : "border-border",
    )}>
      {/* 左：零件选择 */}
      <div className="min-w-0">
        <Controller
          control={control}
          name={`items.${index}.partId`}
          render={() =>
            selectedPart ? (
              <button type="button" onClick={onOpenPicker}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-input bg-background hover:bg-muted/50 transition-colors text-left cursor-pointer">
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <i className="ri-settings-3-line text-primary text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-snug">{selectedPart.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{selectedPart.partNumber} · {selectedPart.material}</p>
                </div>
                <i className="ri-pencil-line text-xs text-muted-foreground/40 shrink-0" />
              </button>
            ) : (
              <button type="button" onClick={onOpenPicker}
                className={cn(
                  "w-full flex items-center gap-2 px-3 h-10 rounded-md border bg-background",
                  "hover:bg-muted/50 transition-colors text-left cursor-pointer",
                  itemErr?.partId ? "border-destructive" : "border-dashed border-input",
                )}>
                <i className="ri-add-circle-line text-sm text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击选择零件…</span>
              </button>
            )
          }
        />
      </div>

      {/* 右：删除 */}
      <button type="button" onClick={onRemove} disabled={!canRemove}
        className={cn(
          "self-center p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors",
          "bg-transparent border-none cursor-pointer",
          !canRemove && "opacity-25 cursor-not-allowed",
        )}>
        <i className="ri-delete-bin-line text-sm" />
      </button>

      {/* 底行：数量 + 单价 + 小计 */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">数量</span>
          <Input
            type="number" min={1} step={1}
            className={cn("h-8 w-24 text-right font-mono", itemErr?.orderedQty ? "border-destructive" : "")}
            {...register(`items.${index}.orderedQty`)}
          />
          {itemErr?.orderedQty && (
            <p className="text-xs text-destructive">{itemErr.orderedQty.message}</p>
          )}
        </div>

        {selectedPart && (() => {
          const prices = apiPricesToForm(selectedPart.commonPrices)
          if (prices.length === 0) return null
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground whitespace-nowrap">参考单价</span>
              {prices.length === 1 ? (
                <span className="font-mono text-sm font-medium text-foreground">
                  ¥{prices[0].value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground ml-1">({prices[0].label})</span>
                </span>
              ) : (
                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                  {prices.map(p => {
                    const isActive = Math.abs(price - p.value) < 0.001
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setValue(`items.${index}._displayPrice`, p.value)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border cursor-pointer bg-transparent",
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        <span>{p.label}</span>
                        <span className="font-mono">¥{p.value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {selectedPart && price > 0 && qty > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
            <span>小计</span>
            <span className="font-mono font-semibold text-foreground">
              ¥{(qty * price).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 主页面 ───────────────────────────────────────────────
export function OrderNewPage() {
  const navigate = useNavigate()

  const { data: partsData } = useGetParts({ page: 1, pageSize: 500 })
  const parts       = partsData?.data ?? []
  const createOrder = useCreateOrder()

  const form = useForm<OrderFormValues>({
    resolver:      zodResolver(OrderFormSchema),
    defaultValues: {
      customerName: "",
      remark:       "",
      items:        [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    },
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const watchedItems = watch("items")

  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  const handlePickerSelect = (part: PartListItem) => {
    if (pickerIndex === null) return
    const prices   = apiPricesToForm(part.commonPrices)
    const stdPrice = prices.find(p => p.label === "标准价")?.value ?? prices[0]?.value ?? 0
    setValue(`items.${pickerIndex}.partId`,        part.id,  { shouldValidate: true })
    setValue(`items.${pickerIndex}._displayPrice`, stdPrice)
    setPickerIndex(null)
  }

  const estimatedTotal = watchedItems.reduce(
    (s, item) => s + (Number(item.orderedQty) || 0) * (Number(item._displayPrice) || 0),
    0,
  )

  const onSubmit = async (values: OrderFormValues) => {
    await createOrder.mutateAsync({
      customerName: values.customerName,
      items:        values.items.map(({ partId, orderedQty }) => ({ partId, orderedQty })),
    })
    navigate({ to: "/orders" })
  }

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部导航栏 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
          <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <Link to="/orders" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              订单管理
            </Link>
            <i className="ri-arrow-right-s-line text-muted-foreground/40 text-xs shrink-0" />
            <span className="font-medium truncate">新建订单</span>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/orders" })}>
              <i className="ri-close-line sm:hidden" />
              <span className="hidden sm:inline">取消</span>
            </Button>
            <Button size="sm" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
              {isSubmitting
                ? <><i className="ri-loader-4-line animate-spin" /><span className="hidden sm:inline ml-1.5">提交中…</span></>
                : <><i className="ri-check-line" /><span className="hidden sm:inline ml-1.5">创建订单</span></>}
            </Button>
          </div>
        </div>

        {/* 主体内容 */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col lg:flex-row gap-8 lg:items-start">

                {/* ── 左列：基本信息 ── */}
                <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:order-first">
                  <div>
                    <h2 className="text-base font-semibold">基本信息</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      系统将在提交时从零件字典自动锁定价格快照
                    </p>
                  </div>

                  {/* 客户名称 */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="customerName">
                      客户名称 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="customerName"
                      placeholder="输入客户公司名称"
                      autoComplete="off"
                      {...register("customerName")}
                      className={errors.customerName ? "border-destructive" : ""}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-destructive">{errors.customerName.message}</p>
                    )}
                  </div>

                  {/* 备注 */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="remark">备注</Label>
                    <textarea
                      id="remark" rows={2} placeholder="可选备注…"
                      {...register("remark")}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* 预估金额卡片：移动端用 order 排在 BOM 列表之后 */}
                  {estimatedTotal > 0 && (
                    <div className="p-4 rounded-lg border border-border bg-muted/30 order-last lg:order-none">
                      <p className="text-xs text-muted-foreground mb-1">预估总金额</p>
                      <p className="font-mono font-bold text-2xl tabular-nums">
                        ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        仅供参考，以提交时价格快照为准
                      </p>
                    </div>
                  )}
                </div>

                {/* ── 右列：BOM 明细 ── */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">
                        零件明细
                        <span className="text-destructive ml-0.5">*</span>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fields.length} 项零件
                      </p>
                    </div>
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => append({ partId: 0, orderedQty: 1, _displayPrice: 0 })}
                    >
                      <i className="ri-add-line mr-1.5" />添加零件
                    </Button>
                  </div>

                  {errors.items?.root && (
                    <p className="text-xs text-destructive">{errors.items.root.message}</p>
                  )}

                  {/* BOM 行列表 */}
                  <div className="flex flex-col gap-2">
                    {fields.map((field, index) => {
                      const watchedItem  = watchedItems[index]
                      const selectedPart = parts.find(p => p.id === watchedItem?.partId)
                      return (
                        <BomRow
                          key={field.id}
                          index={index}
                          selectedPart={selectedPart}
                          watchedItem={watchedItem ?? { partId: 0, orderedQty: 1, _displayPrice: 0 }}
                          errors={errors}
                          register={register}
                          control={control}
                          setValue={setValue}
                          canRemove={fields.length > 1}
                          onOpenPicker={() => setPickerIndex(index)}
                          onRemove={() => remove(index)}
                        />
                      )
                    })}
                  </div>

                  {/* 底部合计行 */}
                  {fields.length > 1 && estimatedTotal > 0 && (
                    <div className="flex justify-between items-center px-4 py-3 rounded-lg border border-border bg-muted/20">
                      <span className="text-sm text-muted-foreground">
                        合计 {fields.length} 项零件
                      </span>
                      <span className="font-mono font-semibold text-lg tabular-nums">
                        ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 零件选择弹窗 */}
      <PartPicker
        open={pickerIndex !== null}
        parts={parts}
        onSelect={handlePickerSelect}
        onClose={() => setPickerIndex(null)}
      />
    </>
  )
}