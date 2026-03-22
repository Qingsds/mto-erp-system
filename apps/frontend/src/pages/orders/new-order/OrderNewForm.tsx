import { useState } from "react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  apiPricesToForm,
  type PartListItem,
} from "@/hooks/api/useParts"
import type {
  OrderFormInput,
  OrderFormValues,
} from "../orders.schema"
import { BomRow } from "./BomRow"
import { PartPicker } from "./PartPicker"

interface OrderNewFormProps {
  form: UseFormReturn<OrderFormInput, unknown, OrderFormValues>
  parts: PartListItem[]
  onSubmit: (values: OrderFormValues) => Promise<void>
  onCancel: () => void
}

export function OrderNewForm({
  form,
  parts,
  onSubmit,
  onCancel,
}: OrderNewFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })
  const watchedItems = watch("items")

  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  const estimatedTotal = watchedItems.reduce(
    (sum, item) =>
      sum +
      (Number(item.orderedQty) || 0) *
        (Number(item._displayPrice) || 0),
    0,
  )

  const handlePickerSelect = (part: PartListItem) => {
    if (pickerIndex === null) return
    const prices = apiPricesToForm(part.commonPrices)
    const stdPrice =
      prices.find(price => price.label === "标准价")?.value ??
      prices[0]?.value ??
      0
    setValue(`items.${pickerIndex}.partId`, part.id, {
      shouldValidate: true,
    })
    setValue(`items.${pickerIndex}._displayPrice`, stdPrice)
    setPickerIndex(null)
  }

  return (
    <>
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='flex items-center justify-end gap-2 px-4 py-3 border-b border-border bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={onCancel}
          >
            <i className='ri-close-line sm:hidden' />
            <span className='hidden sm:inline'>取消</span>
          </Button>
          <Button
            size='sm'
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line animate-spin' />
                <span className='hidden sm:inline ml-1.5'>
                  提交中…
                </span>
              </>
            ) : (
              <>
                <i className='ri-check-line' />
                <span className='hidden sm:inline ml-1.5'>
                  创建订单
                </span>
              </>
            )}
          </Button>
        </div>

        <div className='flex-1 overflow-auto'>
          <div className='p-4 sm:p-6 lg:p-8'>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className='flex flex-col lg:flex-row gap-8 lg:items-start'>
                <div className='w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4 lg:order-first'>
                  <div>
                    <h2 className='text-base font-semibold'>
                      基本信息
                    </h2>
                  </div>

                  <div className='flex flex-col gap-1.5'>
                    <Label htmlFor='customerName'>
                      客户名称{" "}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='customerName'
                      placeholder='输入客户公司名称'
                      autoComplete='off'
                      {...register("customerName")}
                      className={
                        errors.customerName
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {errors.customerName && (
                      <p className='text-xs text-destructive'>
                        {errors.customerName.message}
                      </p>
                    )}
                  </div>

                  <div className='flex flex-col gap-1.5'>
                    <Label htmlFor='remark'>备注</Label>
                    <textarea
                      id='remark'
                      rows={2}
                      placeholder='可选备注…'
                      {...register("remark")}
                      className='w-full border border-input bg-background px-3 py-2 text-sm text-foreground outline-none resize-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow placeholder:text-muted-foreground'
                    />
                  </div>

                  {estimatedTotal > 0 && (
                    <div className='p-4 border border-border bg-muted/30 order-last lg:order-none'>
                      <p className='text-xs text-muted-foreground mb-1'>
                        预估总金额
                      </p>
                      <p className='font-mono font-bold text-2xl tabular-nums'>
                        ¥
                        {estimatedTotal.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className='text-[11px] text-muted-foreground/60 mt-1.5'>
                        仅供参考，以提交时价格快照为准
                      </p>
                    </div>
                  )}
                </div>

                <div className='flex-1 min-w-0 flex flex-col gap-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h2 className='text-base font-semibold'>
                        零件明细
                        <span className='text-destructive ml-0.5'>
                          *
                        </span>
                      </h2>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {fields.length} 项零件
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        append({
                          partId: 0,
                          orderedQty: 1,
                          _displayPrice: 0,
                        })
                      }
                    >
                      <i className='ri-add-line mr-1.5' />
                      添加零件
                    </Button>
                  </div>

                  {errors.items?.root && (
                    <p className='text-xs text-destructive'>
                      {errors.items.root.message}
                    </p>
                  )}

                  <div className='flex flex-col gap-2'>
                    {fields.map((field, index) => {
                      const watchedItem = watchedItems[index]
                      const selectedPart = parts.find(
                        part => part.id === watchedItem?.partId,
                      )

                      return (
                        <BomRow
                          key={field.id}
                          index={index}
                          selectedPart={selectedPart}
                          watchedItem={
                            watchedItem ?? {
                              partId: 0,
                              orderedQty: 1,
                              _displayPrice: 0,
                            }
                          }
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

                  {fields.length > 1 && estimatedTotal > 0 && (
                    <div className='flex justify-between items-center px-4 py-3 border border-border bg-muted/20'>
                      <span className='text-sm text-muted-foreground'>
                        合计 {fields.length} 项零件
                      </span>
                      <span className='font-mono font-semibold text-lg tabular-nums'>
                        ¥
                        {estimatedTotal.toLocaleString("zh-CN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <PartPicker
        open={pickerIndex !== null}
        parts={parts}
        onSelect={handlePickerSelect}
        onClose={() => setPickerIndex(null)}
      />
    </>
  )
}
