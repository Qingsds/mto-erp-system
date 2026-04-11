/**
 * 新建订单基础信息面板。
 *
 * 把客户名称和备注字段从主表单中拆开，
 * 让主页面组件专注于布局编排。
 */

import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { CustomerPickerDialog } from "@/components/customers/CustomerPickerDialog"
import { useIsAdmin } from "@/lib/permissions"
import { CustomerFormSheet } from "@/pages/customers/CustomerFormSheet"
import type {
  OrderFormInput,
  OrderFormValues,
} from "../orders.schema"

interface OrderBasicInfoPanelProps {
  form: UseFormReturn<OrderFormInput, unknown, OrderFormValues>
}

export function OrderBasicInfoPanel({
  form,
}: OrderBasicInfoPanelProps) {
  const canManageCustomers = useIsAdmin()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form

  const customerName = watch("customerName") ?? ""

  return (
    <>
      <section className='flex flex-col gap-4 border border-border bg-card px-4 py-4'>
        <div>
          <h2 className='text-base font-semibold text-foreground'>
            基本信息
          </h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            先填写客户，再继续录入零件明细。
          </p>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='customerPicker'>
            客户 <span className='text-destructive'>*</span>
          </Label>
          <div className='flex gap-2'>
            <Input
              id='customerPicker'
              value={customerName}
              readOnly
              placeholder='请选择客户'
              onClick={() => setPickerOpen(true)}
              className={errors.customerId ? "border-destructive cursor-pointer" : "cursor-pointer"}
            />
            <Button
              type='button'
              variant='outline'
              className='h-10 shrink-0'
              onClick={() => setPickerOpen(true)}
            >
              选择
            </Button>
          </div>
          {errors.customerId && (
            <p className='text-xs text-destructive'>
              {errors.customerId.message}
            </p>
          )}
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='remark'>备注</Label>
          <textarea
            id='remark'
            rows={3}
            placeholder='可选备注…'
            {...register("remark")}
            className='w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1'
          />
        </div>
      </section>

      <CustomerPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        allowCreate={canManageCustomers}
        onCreate={() => {
          setPickerOpen(false)
          setCreateOpen(true)
        }}
        onSelect={customer => {
          setValue("customerId", customer.id, { shouldValidate: true })
          setValue("customerName", customer.name)
        }}
      />

      <CustomerFormSheet
        mode='create'
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmitted={customer => {
          setCreateOpen(false)
          setValue("customerId", customer.id, { shouldValidate: true })
          setValue("customerName", customer.name)
        }}
      />
    </>
  )
}
