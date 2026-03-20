/**
 * orders.form.tsx
 *
 * 新建订单表单。
 * 零件选择使用 Dialog 弹窗（可搜索），替代原生 <select>，支持 500+ 条零件。
 *
 * 提交字段对齐 CreateOrderRequest：{ customerName, items[{partId, orderedQty}] }
 * _displayPrice 仅前端预估用，不提交后端。
 */

import { useMemo, useRef, useState }          from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver }   from "@hookform/resolvers/zod"
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

// ─── Hook ─────────────────────────────────────────────────
export function useOrderForm() {
  return useForm<OrderFormValues>({
    resolver:      zodResolver(OrderFormSchema),
    defaultValues: {
      customerName: "",
      remark:       "",
      items:        [{ partId: 0, orderedQty: 1, _displayPrice: 0 }],
    },
  })
}

// ─── Part Picker Dialog ───────────────────────────────────
interface PartPickerProps {
  open:     boolean
  parts:    PartListItem[]
  onSelect: (part: PartListItem) => void
  onClose:  () => void
}

function PartPicker({ open, parts, onSelect, onClose }: PartPickerProps) {
  const [query, setQuery]     = useState("")
  const inputRef              = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parts
    return parts.filter(p =>
      p.name.toLowerCase().includes(q)       ||
      p.partNumber.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q),
    )
  }, [parts, query])

  const handleOpenChange = (o: boolean) => {
    if (!o) { setQuery(""); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm font-medium text-muted-foreground">
            选择零件
          </DialogTitle>
        </DialogHeader>

        {/* 搜索框 */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
            <i className="ri-search-line text-sm text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索名称、编号、材质…"
              className="flex-1 bg-transparent text-sm outline-none border-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); inputRef.current?.focus() }}
                className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer p-0"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* 零件列表 */}
        <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <i className="ri-search-line text-2xl opacity-30 mb-2" />
              <p className="text-sm">没有匹配「{query}」的零件</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(part => {
                const prices  = apiPricesToForm(part.commonPrices)
                const stdPrice = prices.find(p => p.label === "标准价") ?? prices[0]
                return (
                  <button
                    key={part.id}
                    onClick={() => { onSelect(part); setQuery("") }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    {/* 零件图标 */}
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <i className="ri-settings-3-line text-primary text-sm" />
                    </div>

                    {/* 名称 + 编号 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{part.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {part.partNumber}
                        <span className="mx-1.5 opacity-40">·</span>
                        {part.material}
                        {part.spec && (
                          <span className="ml-1.5 opacity-60">{part.spec}</span>
                        )}
                      </p>
                    </div>

                    {/* 价格 */}
                    {stdPrice && (
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium tabular-nums">
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

        {/* 底部计数 */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {query
              ? `找到 ${filtered.length} 个零件`
              : `共 ${parts.length} 个零件`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── BOM 行中的已选零件展示 ───────────────────────────────
function SelectedPartCell({
  part,
  onClick,
}: {
  part:    PartListItem
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border border-input bg-background hover:bg-muted/50 transition-colors text-left cursor-pointer"
    >
      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
        <i className="ri-settings-3-line text-primary text-[11px]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-none">{part.name}</p>
        <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{part.partNumber}</p>
      </div>
      <i className="ri-pencil-line text-xs text-muted-foreground/50 shrink-0" />
    </button>
  )
}

// ─── 未选择时的占位按钮 ───────────────────────────────────
function EmptyPartCell({
  onClick,
  error,
}: {
  onClick: () => void
  error?:  string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 h-9 rounded-md border bg-background",
        "hover:bg-muted/50 transition-colors text-left cursor-pointer",
        error ? "border-destructive" : "border-input border-dashed",
      )}
    >
      <i className="ri-add-circle-line text-sm text-muted-foreground" />
      <span className="text-sm text-muted-foreground">点击选择零件…</span>
    </button>
  )
}

// ─── Order Form ───────────────────────────────────────────
interface OrderFormProps {
  form:     ReturnType<typeof useOrderForm>
  parts:    PartListItem[]
  onSubmit: (values: OrderFormValues) => Promise<void>
  onCancel: () => void
}

export function OrderForm({ form, parts, onSubmit, onCancel }: OrderFormProps) {
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

  // 当前正在选择零件的行下标，null 表示选择器关闭
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  const estimatedTotal = watchedItems.reduce(
    (s, item) => s + (Number(item.orderedQty) || 0) * (Number(item._displayPrice) || 0),
    0,
  )

  const handlePickerSelect = (part: PartListItem) => {
    if (pickerIndex === null) return
    const prices    = apiPricesToForm(part.commonPrices)
    const stdPrice  = prices.find(p => p.label === "标准价")?.value ?? prices[0]?.value ?? 0
    setValue(`items.${pickerIndex}.partId`,       part.id,    { shouldValidate: true })
    setValue(`items.${pickerIndex}._displayPrice`, stdPrice)
    setPickerIndex(null)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

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

        {/* BOM 明细 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label>
              零件明细 <span className="text-destructive">*</span>
              <span className="text-muted-foreground font-normal ml-1.5 text-xs">
                {fields.length} 项
              </span>
            </Label>
            <Button
              type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
              onClick={() => append({ partId: 0, orderedQty: 1, _displayPrice: 0 })}
            >
              <i className="ri-add-line mr-1" />添加零件
            </Button>
          </div>

          {errors.items?.root && (
            <p className="text-xs text-destructive">{errors.items.root.message}</p>
          )}

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const itemErr     = errors.items?.[index]
              const watchedItem = watchedItems[index]
              const selectedPart = parts.find(p => p.id === watchedItem?.partId)
              const qty          = Number(watchedItem?.orderedQty) || 0
              const price        = Number(watchedItem?._displayPrice) || 0

              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/20"
                >
                  {/* 行头：零件选择 + 删除 */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <Controller
                        control={control}
                        name={`items.${index}.partId`}
                        render={() =>
                          selectedPart ? (
                            <SelectedPartCell
                              part={selectedPart}
                              onClick={() => setPickerIndex(index)}
                            />
                          ) : (
                            <EmptyPartCell
                              onClick={() => setPickerIndex(index)}
                              error={itemErr?.partId?.message}
                            />
                          )
                        }
                      />
                      {itemErr?.partId && !selectedPart && (
                        <p className="text-[11px] text-destructive mt-1">
                          {itemErr.partId.message}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className={cn(
                        "mt-1.5 p-1 text-muted-foreground hover:text-destructive transition-colors",
                        "bg-transparent border-none cursor-pointer rounded",
                        fields.length === 1 && "opacity-25 cursor-not-allowed",
                      )}
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>

                  {/* 行尾：数量 + 参考单价 */}
                  <div className="flex items-center gap-3 pl-0.5">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground whitespace-nowrap w-12">数量</span>
                      <Input
                        type="number" min={1} step={1}
                        className={cn(
                          "h-8 w-28 text-right font-mono",
                          itemErr?.orderedQty ? "border-destructive" : "",
                        )}
                        {...register(`items.${index}.orderedQty`)}
                      />
                      {itemErr?.orderedQty && (
                        <p className="text-[11px] text-destructive">{itemErr.orderedQty.message}</p>
                      )}
                    </div>

                    {price > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                        <span>参考单价</span>
                        <span className="font-mono font-medium text-foreground">
                          ¥{price.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* 行小计 */}
                    {selectedPart && price > 0 && qty > 0 && (
                      <span className="text-xs font-mono text-muted-foreground ml-auto whitespace-nowrap">
                        = ¥{(qty * price).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 预估总金额 */}
          {estimatedTotal > 0 && (
            <div className="flex justify-between items-center px-1 pt-2 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">预估总金额</span>
                <span className="text-[11px] text-muted-foreground/60 ml-1">（供参考，以实际快照为准）</span>
              </div>
              <span className="font-mono font-semibold text-base tabular-nums">
                ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* 备注 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="remark">备注</Label>
          <textarea
            id="remark" rows={2} placeholder="可选备注"
            {...register("remark")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow placeholder:text-muted-foreground"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? <><i className="ri-loader-4-line animate-spin mr-1.5" />提交中…</>
              : <><i className="ri-check-line mr-1.5" />创建订单</>}
          </Button>
        </div>
      </form>

      {/* 零件选择弹窗（渲染在 form 外避免 form 嵌套） */}
      <PartPicker
        open={pickerIndex !== null}
        parts={parts}
        onSelect={handlePickerSelect}
        onClose={() => setPickerIndex(null)}
      />
    </>
  )
}