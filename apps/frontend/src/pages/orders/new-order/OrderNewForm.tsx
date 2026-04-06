/**
 * OrderNewForm.tsx
 *
 * 职责：
 * - 承载新建订单表单的布局与交互
 * - 管理零件明细区的新增、选择与金额汇总
 */

import { useState } from "react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import {
  apiPricesToForm,
  type PartListItem,
} from "@/hooks/api/useParts"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { useCanViewMoney } from "@/lib/permissions"
import { useUIStore } from "@/store/ui.store"
import type {
  OrderFormInput,
  OrderFormValues,
} from "../orders.schema"
import { BomRow } from "./BomRow"
import { OrderBasicInfoPanel } from "./OrderBasicInfoPanel"
import { OrderDraftSummaryCard } from "./OrderDraftSummaryCard"
import { OrderNewMobileActions } from "./OrderNewMobileActions"
import { OrderNewToolbar } from "./OrderNewToolbar"
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
  const { isMobile } = useUIStore()
  const canViewMoney = useCanViewMoney()
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

  const appendEmptyItem = () => {
    append({
      partId: 0,
      orderedQty: 1,
      _displayPrice: 0,
    })
  }

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

  const submitForm = handleSubmit(onSubmit)

  return (
    <>
      <div className='flex flex-col flex-1 overflow-hidden'>
        <OrderNewToolbar
          itemCount={fields.length}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
          onSubmit={() => { void submitForm() }}
          showQuickActions={!isMobile}
        />

        <PageContentWrapper withMobileBottomInset={isMobile}>
          <form onSubmit={submitForm}>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8'>
              <aside className='flex w-full shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:w-72 xl:w-80'>
                <OrderBasicInfoPanel form={form} />
                <OrderDraftSummaryCard
                  itemCount={fields.length}
                  estimatedTotal={estimatedTotal}
                  canViewMoney={canViewMoney}
                />
              </aside>

              <div className='flex-1 min-w-0 flex flex-col gap-4'>
                <section className='border border-border bg-card px-4 py-4'>
                  <div>
                    <h2 className='text-base font-semibold'>
                      零件明细
                      <span className='text-destructive ml-0.5'>
                        *
                      </span>
                    </h2>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      已添加 {fields.length} 项零件，按当前列表顺序逐项填写。
                    </p>
                  </div>
                </section>

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
                        canViewMoney={canViewMoney}
                        canRemove={fields.length > 1}
                        onOpenPicker={() => setPickerIndex(index)}
                        onRemove={() => remove(index)}
                      />
                    )
                  })}
                </div>

                <button
                  type='button'
                  onClick={appendEmptyItem}
                  className='hidden w-full items-center justify-center gap-2 border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/40 hover:text-foreground lg:flex'
                >
                  <i className='ri-add-line text-base' />
                  <span>
                    {fields.length > 0 ? "继续添加零件" : "添加第一个零件"}
                  </span>
                </button>

                {canViewMoney && fields.length > 1 && estimatedTotal > 0 && (
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

          {isMobile && (
            <OrderNewMobileActions
              itemCount={fields.length}
              estimatedTotal={estimatedTotal}
              canViewMoney={canViewMoney}
              isSubmitting={isSubmitting}
              onAppendItem={appendEmptyItem}
              onSubmit={() => { void submitForm() }}
            />
          )}
        </PageContentWrapper>
      </div>

      <PartPicker
        open={pickerIndex !== null}
        parts={parts}
        selectedPartId={
          pickerIndex !== null
            ? watchedItems[pickerIndex]?.partId
            : undefined
        }
        onSelect={handlePickerSelect}
        onClose={() => setPickerIndex(null)}
      />
    </>
  )
}
