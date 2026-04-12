import { useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { PartCustomerItem } from "@/hooks/api/useParts"
import { zodResolverCompat } from "@/lib/zodResolverCompat"
import {
  PartFormSchema,
  type PartFormInput,
  type PartFormValues,
} from "../parts.schema"
import { PartCustomerAssignmentField } from "../manage/PartCustomerAssignmentField"

interface PartDetailEditFormProps {
  defaultValues: PartFormValues
  selectedCustomers?: PartCustomerItem[]
  isSaving: boolean
  onSave: (values: PartFormValues) => Promise<void>
  onCancel: () => void
  onDirtyChange: (isDirty: boolean) => void
}

/**
 * Editing is isolated here so the page container only coordinates data and mode switching.
 * Dirty state is reported upward for unsaved-change protection.
 */
export function PartDetailEditForm({
  defaultValues,
  selectedCustomers = [],
  isSaving,
  onSave,
  onCancel,
  onDirtyChange,
}: PartDetailEditFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PartFormInput, unknown, PartFormValues>({
    resolver: zodResolverCompat<PartFormInput, PartFormValues>(PartFormSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prices",
  })
  const selectedCustomerIds = watch("customerIds") ?? []

  useEffect(() => {
    onDirtyChange(isDirty)
    return () => onDirtyChange(false)
  }, [isDirty, onDirtyChange])

  return (
    <form onSubmit={handleSubmit(onSave)} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1.5'>
        <label className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          零件名称 <span className='text-destructive'>*</span>
        </label>
        <Input
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className='text-xs text-destructive'>{errors.name.message}</p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1.5'>
          <label className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            材质 <span className='text-destructive'>*</span>
          </label>
          <Input
            {...register("material")}
            className={errors.material ? "border-destructive" : ""}
          />
          {errors.material && (
            <p className='text-xs text-destructive'>{errors.material.message}</p>
          )}
        </div>
        <div className='flex flex-col gap-1.5'>
          <label className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            规格型号
          </label>
          <Input {...register("spec")} placeholder='可选' />
        </div>
      </div>

      <div className='flex flex-col gap-1.5'>
        <label className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
          关联客户
        </label>
        <PartCustomerAssignmentField
          value={selectedCustomerIds}
          onChange={customerIds =>
            setValue("customerIds", customerIds, { shouldDirty: true })
          }
          selectedCustomers={selectedCustomers}
        />
        <p className='text-xs text-muted-foreground'>
          选填。后续按客户创建订单时，会优先展示这些已关联零件。
        </p>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <label className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
            价格字典 <span className='text-destructive'>*</span>
          </label>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={() => append({ label: "", value: 0 })}
          >
            <i className='ri-add-line mr-1' />
            添加
          </Button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className='flex items-center gap-2'>
            <Input
              placeholder='名称（如：标准价）'
              {...register(`prices.${index}.label`)}
              className='flex-1 h-8'
            />
            <Input
              type='number'
              min={0}
              step={0.01}
              placeholder='0.00'
              {...register(`prices.${index}.value`)}
              className='h-8 w-28 font-mono text-right'
            />
            <button
              type='button'
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              className={cn(
                "cursor-pointer border-none bg-transparent p-1 text-muted-foreground transition-colors hover:text-destructive",
                fields.length === 1 && "cursor-not-allowed opacity-30",
              )}
            >
              <i className='ri-close-line text-sm' />
            </button>
          </div>
        ))}
      </div>

      <div className='flex gap-2 pt-1'>
        <Button type='submit' size='sm' disabled={isSaving}>
          {isSaving ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              保存中…
            </>
          ) : (
            <>
              <i className='ri-check-line mr-1.5' />
              保存
            </>
          )}
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  )
}
