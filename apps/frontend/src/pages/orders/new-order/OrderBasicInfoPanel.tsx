/**
 * 新建订单基础信息面板。
 *
 * 把客户名称和备注字段从主表单中拆开，
 * 让主页面组件专注于布局编排。
 */

import type { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const {
    register,
    formState: { errors },
  } = form

  return (
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
        <Label htmlFor='customerName'>
          客户名称 <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='customerName'
          placeholder='输入客户公司名称'
          autoComplete='off'
          {...register("customerName")}
          className={errors.customerName ? "border-destructive" : ""}
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
          rows={3}
          placeholder='可选备注…'
          {...register("remark")}
          className='w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1'
        />
      </div>
    </section>
  )
}
