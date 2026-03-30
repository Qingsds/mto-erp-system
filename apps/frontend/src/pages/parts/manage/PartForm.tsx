/**
 * 零件新增 / 编辑表单。
 *
 * 这里负责基础字段、价格字典和提交动作，
 * 图纸上传区拆到独立组件里，避免表单文件继续膨胀。
 */

import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { zodResolverCompat } from "@/lib/zodResolverCompat"
import {
  apiPricesToForm,
  type PartListItem,
} from "@/hooks/api/useParts"
import {
  PartFormSchema,
  type PartFormInput,
  type PartFormValues,
} from "@/pages/parts/parts.schema"
import { PartDrawingUploadSection } from "./PartDrawingUploadSection"

// eslint-disable-next-line react-refresh/only-export-components
export function usePartForm() {
  return useForm<PartFormInput, unknown, PartFormValues>({
    resolver: zodResolverCompat<PartFormInput, PartFormValues>(
      PartFormSchema,
    ),
    defaultValues: {
      name: "",
      material: "",
      spec: "",
      prices: [{ label: "标准价", value: 0 }],
    },
  })
}

interface PartFormProps {
  form: ReturnType<typeof usePartForm>
  editingPart?: PartListItem | null
  onSubmit: (values: PartFormValues) => Promise<void>
  onCancel: () => void
}

export function PartForm({
  form,
  editingPart,
  onSubmit,
  onCancel,
}: PartFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prices",
  })

  useEffect(() => {
    if (editingPart) {
      const prices = apiPricesToForm(editingPart.commonPrices)

      reset({
        name: editingPart.name,
        material: editingPart.material,
        spec: editingPart.spec ?? "",
        prices: prices.length > 0
          ? prices
          : [{ label: "标准价", value: 0 }],
      })
      return
    }

    reset({
      name: "",
      material: "",
      spec: "",
      prices: [{ label: "标准价", value: 0 }],
    })
  }, [editingPart, reset])

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-5'
    >
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='name'>
          零件名称 <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='name'
          placeholder='如：六角螺栓 M8×30'
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className='text-xs text-destructive'>
            {errors.name.message}
          </p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='material'>
            材质 <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='material'
            placeholder='如：304 不锈钢'
            {...register("material")}
            className={errors.material ? "border-destructive" : ""}
          />
          {errors.material && (
            <p className='text-xs text-destructive'>
              {errors.material.message}
            </p>
          )}
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='spec'>规格型号</Label>
          <Input
            id='spec'
            placeholder='如：GB/T 5782'
            {...register("spec")}
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <Label>
            价格字典 <span className='text-destructive'>*</span>
          </Label>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 px-2 text-xs'
            onClick={() => append({ label: "", value: 0 })}
          >
            <i className='ri-add-line mr-1' />
            添加价格
          </Button>
        </div>

        {errors.prices?.root && (
          <p className='text-xs text-destructive'>
            {errors.prices.root.message}
          </p>
        )}

        <div className='flex flex-col gap-2'>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className='flex items-start gap-2'
            >
              <div className='flex-1'>
                <Input
                  placeholder='价格名称（如：标准价）'
                  {...register(`prices.${index}.label`)}
                  className={cn(
                    "h-10",
                    errors.prices?.[index]?.label && "border-destructive",
                  )}
                />
              </div>

              <div className='w-28'>
                <Input
                  type='number'
                  min={0}
                  step={0.01}
                  placeholder='0.00'
                  {...register(`prices.${index}.value`)}
                  className={cn(
                    "h-10 font-mono text-right",
                    errors.prices?.[index]?.value && "border-destructive",
                  )}
                />
              </div>

              <button
                type='button'
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className={cn(
                  "mt-2 cursor-pointer border-none bg-transparent p-0 text-muted-foreground transition-colors hover:text-destructive",
                  fields.length === 1 && "cursor-not-allowed opacity-30",
                )}
              >
                <i className='ri-close-line text-sm' />
              </button>
            </div>
          ))}
        </div>
      </div>

      {editingPart && (
        <>
          <Separator />
          <PartDrawingUploadSection partId={editingPart.id} />
        </>
      )}

      <div className='flex justify-end gap-2 pt-2'>
        <Button
          type='button'
          variant='outline'
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          type='submit'
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              提交中…
            </>
          ) : (
            <>
              <i className='ri-check-line mr-1.5' />
              {editingPart ? "保存修改" : "创建零件"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
