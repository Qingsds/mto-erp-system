/**
 * orders.form.tsx
 *
 * 新建订单表单，对齐后端 CreateOrderRequest：
 *   { customerName, items: [{ partId, orderedQty }] }
 *
 * _displayPrice 仅用于前端预估金额显示，不提交后端。
 * 后端自动从 part.commonPrices['标准价'] 锁定价格快照。
 */

import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver }  from "@hookform/resolvers/zod"
import { Button }       from "@/components/ui/button"
import { Input }        from "@/components/ui/input"
import { Label }        from "@/components/ui/label"
import { cn }           from "@/lib/utils"
import { OrderFormSchema, type OrderFormValues } from "./orders.schema"
import type { PartListItem } from "@/hooks/api/useParts"
import { apiPricesToForm }   from "@/hooks/api/useParts"

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

// ─── Part selector ────────────────────────────────────────
function PartSelector({
  value,
  parts,
  onChange,
  error,
}: {
  value:    number
  parts:    PartListItem[]
  onChange: (partId: number, defaultPrice: number) => void
  error?:   string
}) {
  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={e => {
          const id   = Number(e.target.value)
          const part = parts.find(p => p.id === id)
          const prices = apiPricesToForm(part?.commonPrices ?? {})
          // 取「标准价」或第一个价格作为显示价格
          const price = prices.find(p => p.label === "标准价")?.value ?? prices[0]?.value ?? 0
          onChange(id, price)
        }}
        className={cn(
          "w-full h-8 rounded-md border bg-background px-2.5 text-sm text-foreground",
          "appearance-none cursor-pointer outline-none ring-offset-background",
          "focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow",
          error ? "border-destructive" : "border-input",
        )}
      >
        <option value="">选择零件…</option>
        {parts.map(p => (
          <option key={p.id} value={p.id}>
            {p.partNumber}  {p.name}  ({p.material})
          </option>
        ))}
      </select>
      <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-sm" />
    </div>
  )
}

// ─── Order Form ───────────────────────────────────────────
interface OrderFormProps {
  form:     ReturnType<typeof useOrderForm>
  /** 零件候选列表（从 useGetParts 传入，避免重复请求） */
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

  // 前端预估总金额（基于 _displayPrice，不参与提交）
  const estimatedTotal = watchedItems.reduce(
    (s, item) => s + (Number(item.orderedQty) || 0) * (Number(item._displayPrice) || 0),
    0,
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Customer */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="customerName">
          客户名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="customerName"
          placeholder="输入客户公司名称"
          {...register("customerName")}
          className={errors.customerName ? "border-destructive" : ""}
        />
        {errors.customerName && (
          <p className="text-xs text-destructive">{errors.customerName.message}</p>
        )}
      </div>

      {/* BOM Lines */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>
            零件明细 <span className="text-destructive">*</span>
            <span className="text-muted-foreground font-normal ml-1.5">({fields.length} 项)</span>
          </Label>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
            onClick={() => append({ partId: 0, orderedQty: 1, _displayPrice: 0 })}>
            <i className="ri-add-line mr-1" />添加零件
          </Button>
        </div>

        {/* Column headers */}
        <div className="grid gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-0.5"
             style={{ gridTemplateColumns: "1fr 72px 88px 20px" }}>
          <span>零件</span>
          <span>数量</span>
          <span className="text-right">参考单价</span>
          <span />
        </div>

        {fields.map((field, index) => {
          const itemErr = errors.items?.[index]
          const qty   = Number(watchedItems[index]?.orderedQty) || 0
          const price = Number(watchedItems[index]?._displayPrice) || 0
          return (
            <div key={field.id}
              className="grid gap-2 items-start p-2.5 rounded-md border border-border bg-muted/30"
              style={{ gridTemplateColumns: "1fr 72px 88px 20px" }}>
              {/* Part */}
              <div>
                <Controller
                  control={control}
                  name={`items.${index}.partId`}
                  render={({ field: f }) => (
                    <PartSelector
                      value={f.value}
                      parts={parts}
                      onChange={(partId, defaultPrice) => {
                        f.onChange(partId)
                        setValue(`items.${index}._displayPrice`, defaultPrice)
                      }}
                      error={itemErr?.partId?.message}
                    />
                  )}
                />
                {itemErr?.partId && (
                  <p className="text-[11px] text-destructive mt-0.5">{itemErr.partId.message}</p>
                )}
              </div>
              {/* Qty */}
              <Input
                type="number" min={1} step={1}
                className={cn("h-8 text-right font-mono", itemErr?.orderedQty ? "border-destructive" : "")}
                {...register(`items.${index}.orderedQty`)}
              />
              {/* Display price（只读，从零件库带入） */}
              <div className="flex items-center h-8 px-2 rounded-md border border-input bg-muted/50 font-mono text-xs text-right justify-end text-muted-foreground">
                {price > 0 ? `¥${price}` : "—"}
              </div>
              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className={cn(
                  "mt-1.5 text-muted-foreground hover:text-destructive transition-colors bg-transparent border-none cursor-pointer p-0",
                  fields.length === 1 && "opacity-30 cursor-not-allowed",
                )}
              >
                <i className="ri-close-line text-sm" />
              </button>
              {/* Row subtotal hint */}
              {watchedItems[index]?.partId > 0 && price > 0 && (
                <div className="col-span-4 flex justify-end pr-6">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    预估小计：¥{(qty * price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Estimated total */}
        <div className="flex justify-between items-center px-0.5 pt-1 border-t border-border mt-1">
          <span className="text-xs text-muted-foreground">预估总金额（仅供参考）</span>
          <span className="font-mono font-semibold text-base tabular-nums">
            ¥{estimatedTotal.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          <i className="ri-information-line mr-0.5" />
          实际价格由系统在提交时从零件字典快照锁定
        </p>
      </div>

      {/* Remark */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="remark">备注</Label>
        <textarea
          id="remark" rows={2} placeholder="可选备注"
          {...register("remark")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow placeholder:text-muted-foreground"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? <><i className="ri-loader-4-line animate-spin mr-1.5" />提交中…</>
            : <><i className="ri-check-line mr-1.5" />创建订单</>}
        </Button>
      </div>
    </form>
  )
}