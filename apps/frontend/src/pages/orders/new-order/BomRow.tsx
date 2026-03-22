import { Controller, type UseFormReturn } from "react-hook-form"
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

  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-2 p-4 border bg-card",
        "grid-cols-[1fr_auto]",
        itemErr ? "border-destructive/40" : "border-border",
      )}
    >
      <div className="min-w-0">
        <Controller
          control={control}
          name={`items.${index}.partId`}
          render={() =>
            selectedPart ? (
              <button
                type="button"
                onClick={onOpenPicker}
                className="w-full flex items-center gap-3 px-3 py-2 border border-input bg-background hover:bg-muted/50 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 bg-primary/10 flex items-center justify-center shrink-0">
                  <i className="ri-settings-3-line text-primary text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-snug">{selectedPart.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {selectedPart.partNumber} · {selectedPart.material}
                  </p>
                </div>
                <i className="ri-pencil-line text-xs text-muted-foreground/40 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenPicker}
                className={cn(
                  "w-full flex items-center gap-2 px-3 h-10 border bg-background",
                  "hover:bg-muted/50 transition-colors text-left cursor-pointer",
                  itemErr?.partId ? "border-destructive" : "border-dashed border-input",
                )}
              >
                <i className="ri-add-circle-line text-sm text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击选择零件…</span>
              </button>
            )
          }
        />
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

      <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">数量</span>
          <Input
            type="number"
            min={1}
            step={1}
            className={cn("h-8 w-24 text-right font-mono", itemErr?.orderedQty ? "border-destructive" : "")}
            {...register(`items.${index}.orderedQty`)}
          />
          {itemErr?.orderedQty && <p className="text-xs text-destructive">{itemErr.orderedQty.message}</p>}
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
                  {prices.map(nextPrice => {
                    const isActive = Math.abs(price - nextPrice.value) < 0.001
                    return (
                      <button
                        key={nextPrice.label}
                        type="button"
                        onClick={() => setValue(`items.${index}._displayPrice`, nextPrice.value)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-xs transition-colors border cursor-pointer bg-transparent",
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                      >
                        <span>{nextPrice.label}</span>
                        <span className="font-mono">
                          ¥{nextPrice.value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                        </span>
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
