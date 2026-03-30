/**
 * BomRow.tsx
 *
 * 职责：
 * - 渲染新建订单中的单条零件明细行
 * - 处理零件选择、数量输入、参考价切换与小计展示
 */

import { Controller, type UseFormReturn } from "react-hook-form"
import { PartPriceOptionGroup } from "@/components/parts/PartPriceOptionGroup"
import { PartSelectTrigger } from "@/components/parts/PartSelectTrigger"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { apiPricesToForm, type PartListItem } from "@/hooks/api/useParts"
import type { OrderFormInput, OrderFormValues } from "../orders.schema"

interface BomRowProps {
  index: number
  selectedPart: PartListItem | undefined
  watchedItem: OrderFormInput["items"][number]
  errors: UseFormReturn<OrderFormInput, unknown, OrderFormValues>["formState"]["errors"]
  register: UseFormReturn<OrderFormInput, unknown, OrderFormValues>["register"]
  control: UseFormReturn<OrderFormInput, unknown, OrderFormValues>["control"]
  setValue: UseFormReturn<OrderFormInput, unknown, OrderFormValues>["setValue"]
  canRemove: boolean
  onOpenPicker: () => void
  onRemove: () => void
}

export function BomRow({
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
}: BomRowProps) {
  const qty = Number(watchedItem?.orderedQty) || 0
  const price = Number(watchedItem?._displayPrice) || 0
  const itemErr = errors.items?.[index]
  const prices = selectedPart
    ? apiPricesToForm(selectedPart.commonPrices)
    : []
  const lineAmount = qty * price

  return (
    <section
      className={cn(
        "grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 border bg-card p-4",
        itemErr ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            第 {index + 1} 项零件
          </p>
          {selectedPart && price > 0 && qty > 0 && (
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">
                小计
              </p>
              <p className="font-mono text-sm font-semibold text-foreground">
                ¥{lineAmount.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
        </div>

        <Controller
          control={control}
          name={`items.${index}.partId`}
          render={() =>
            <PartSelectTrigger
              part={selectedPart}
              hasError={!!itemErr?.partId}
              onClick={onOpenPicker}
            />
          }
        />
        {itemErr?.partId && (
          <p className="mt-1.5 text-xs text-destructive">
            {itemErr.partId.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={cn(
          "self-center p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors",
          "bg-transparent border-none cursor-pointer",
          !canRemove && "opacity-25 cursor-not-allowed",
        )}
      >
        <i className="ri-delete-bin-line text-sm" />
      </button>

      <div className="col-span-2 grid gap-3 pt-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            数量
          </span>
          <Input
            type="number"
            min={1}
            step={1}
            className={cn(
              "h-10 w-full font-mono text-right",
              itemErr?.orderedQty ? "border-destructive" : "",
            )}
            {...register(`items.${index}.orderedQty`)}
          />
          {itemErr?.orderedQty && (
            <p className="text-xs text-destructive">
              {itemErr.orderedQty.message}
            </p>
          )}
        </div>

        {selectedPart && prices.length > 0 && (
          <PartPriceOptionGroup
            prices={prices}
            activeValue={price}
            onChange={nextPrice =>
              setValue(`items.${index}._displayPrice`, nextPrice)
            }
          />
        )}
      </div>
    </section>
  )
}
