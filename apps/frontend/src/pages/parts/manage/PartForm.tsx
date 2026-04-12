/**
 * 零件新增 / 编辑表单。
 *
 * 这里负责基础字段、价格字典和提交动作，
 * 图纸上传区拆到独立组件里，避免表单文件继续膨胀。
 */

import { useEffect } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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
import { PartCustomerAssignmentField } from "./PartCustomerAssignmentField"

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
      customerIds: [],
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prices",
  })
  const selectedCustomerIds = watch("customerIds") ?? []

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
        customerIds: editingPart.customers.map(customer => customer.id),
      })
      return
    }

    reset({
      name: "",
      material: "",
      spec: "",
      prices: [{ label: "标准价", value: 0 }],
      customerIds: [],
    })
  }, [editingPart, reset])

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
      >
        <FieldGroup className='gap-5'>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor='name'>
              零件名称 <span className='text-destructive'>*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id='name'
                placeholder='如：六角螺栓 M8×30'
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldDescription>
                该名称会同步用于订单、发货和图纸识别场景。
              </FieldDescription>
              <FieldError>{errors.name?.message}</FieldError>
            </FieldContent>
          </Field>

          <div className='grid grid-cols-2 gap-3'>
            <Field data-invalid={!!errors.material}>
              <FieldLabel htmlFor='material'>
                材质 <span className='text-destructive'>*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id='material'
                  placeholder='如：304 不锈钢'
                  aria-invalid={!!errors.material}
                  {...register("material")}
                />
                <FieldError>{errors.material?.message}</FieldError>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor='spec'>规格型号</FieldLabel>
              <FieldContent>
                <Input
                  id='spec'
                  placeholder='如：GB/T 5782'
                  {...register("spec")}
                />
                <FieldDescription>
                  规格为空时，可后续在详情页补充。
                </FieldDescription>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor='part-customer-assignments'>关联客户</FieldLabel>
            <FieldContent>
              <PartCustomerAssignmentField
                value={selectedCustomerIds}
                onChange={customerIds =>
                  setValue("customerIds", customerIds, { shouldDirty: true })
                }
                selectedCustomers={editingPart?.customers}
              />
              <FieldDescription>
                选填。用于后续订单按客户收敛可选零件；旧零件不关联也不会出错。
              </FieldDescription>
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.prices?.root}>
            <div className='flex items-center justify-between gap-3'>
              <FieldLabel>
                价格字典 <span className='text-destructive'>*</span>
              </FieldLabel>
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

            <FieldContent>
              <FieldDescription>
                标准价优先展示，没有标准价时再回退到其他业务价格。
              </FieldDescription>
              <FieldError>{errors.prices?.root?.message}</FieldError>

              <div className='flex flex-col gap-2'>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className='flex items-start gap-2'
                  >
                    <div className='flex-1'>
                      <Input
                        placeholder='价格名称（如：标准价）'
                        aria-invalid={!!errors.prices?.[index]?.label}
                        {...register(`prices.${index}.label`)}
                        className={cn(
                          "h-10",
                          errors.prices?.[index]?.label && "border-destructive",
                        )}
                      />
                      {errors.prices?.[index]?.label?.message && (
                        <p className='mt-1 text-xs text-destructive'>
                          {errors.prices[index]?.label?.message}
                        </p>
                      )}
                    </div>

                    <div className='w-28'>
                      <Input
                        type='number'
                        min={0}
                        step={0.01}
                        placeholder='0.00'
                        aria-invalid={!!errors.prices?.[index]?.value}
                        {...register(`prices.${index}.value`)}
                        className={cn(
                          "h-10 font-mono text-right",
                          errors.prices?.[index]?.value && "border-destructive",
                        )}
                      />
                      {errors.prices?.[index]?.value?.message && (
                        <p className='mt-1 text-xs text-destructive'>
                          {errors.prices[index]?.value?.message}
                        </p>
                      )}
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
            </FieldContent>
          </Field>
        </FieldGroup>

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
    </Form>
  )
}
