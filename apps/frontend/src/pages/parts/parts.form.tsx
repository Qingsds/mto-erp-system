import { useEffect } from "react"
import {
  useFieldArray,
  useForm,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  PartFormSchema,
  type PartFormValues,
  type Part,
} from "./parts.schema"

// ─── Hook: create form ONCE in parent, pass down ──────────
export function usePartForm() {
  return useForm<PartFormValues>({
    resolver: zodResolver(PartFormSchema),
    defaultValues: {
      name: "",
      material: "",
      spec: "",
      remark: "",
      prices: [{ label: "标准价", value: "" as unknown as number }],
    },
  })
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <Label className='text-sm font-medium'>
        {label}
        {required && (
          <span className='text-destructive ml-0.5'>*</span>
        )}
      </Label>
      {children}
      {error && (
        <p className='text-xs text-destructive mt-0.5'>{error}</p>
      )}
    </div>
  )
}

interface PartFormProps {
  form: UseFormReturn<PartFormValues>
  editingPart?: Part | null
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

  // Reset when switching between add/edit
  useEffect(() => {
    reset(
      editingPart
        ? {
            name: editingPart.name,
            material: editingPart.material,
            spec: editingPart.spec ?? "",
            remark: editingPart.remark ?? "",
            prices: editingPart.prices.length
              ? editingPart.prices
              : [{ label: "标准价", value: "" as unknown as number }],
          }
        : {
            name: "",
            material: "",
            spec: "",
            remark: "",
            prices: [
              { label: "标准价", value: "" as unknown as number },
            ],
          },
    )
  }, [editingPart, reset])

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className='flex flex-col gap-6'
    >
      <div className='grid grid-cols-2 gap-x-4 gap-y-5'>
        <Field
          label='零件名称'
          required
          error={errors.name?.message}
        >
          <Input
            {...register("name")}
            placeholder='如：六角螺栓 M8×30'
            className={cn(errors.name && "border-destructive")}
          />
        </Field>
        <Field
          label='物理材质'
          required
          error={errors.material?.message}
        >
          <Input
            {...register("material")}
            placeholder='如：304不锈钢'
            className={cn(errors.material && "border-destructive")}
          />
        </Field>
        <Field
          label='规格型号'
          error={errors.spec?.message}
        >
          <Input
            {...register("spec")}
            placeholder='如：GB/T 5782'
          />
        </Field>
        <Field
          label='备注'
          error={errors.remark?.message}
        >
          <Input
            {...register("remark")}
            placeholder='可选'
          />
        </Field>
      </div>

      <div>
        <div className='flex items-center justify-between mb-3'>
          <Label>
            常用价格 <span className='text-destructive'>*</span>
          </Label>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 text-xs'
            onClick={() =>
              append({ label: "", value: "" as unknown as number })
            }
          >
            <i className='ri-add-line mr-1' />
            添加价格项
          </Button>
        </div>
        {typeof errors.prices?.message === "string" && (
          <p className='text-xs text-destructive mb-2'>
            {errors.prices.message}
          </p>
        )}
        <div className='flex flex-col gap-3'>
          {fields.map((field, i) => (
            <div
              key={field.id}
              className='flex items-start gap-2'
            >
              <div className='flex-1'>
                <Input
                  {...register(`prices.${i}.label`)}
                  placeholder='价格名称，如：标准价'
                  className={cn(
                    errors.prices?.[i]?.label && "border-destructive",
                  )}
                />
                {errors.prices?.[i]?.label && (
                  <p className='text-xs text-destructive mt-1'>
                    {errors.prices[i]?.label?.message}
                  </p>
                )}
              </div>
              <div className='w-28'>
                <div className='relative'>
                  <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none'>
                    ¥
                  </span>
                  <Input
                    {...register(`prices.${i}.value`)}
                    type='number'
                    step='0.01'
                    placeholder='0.00'
                    className={cn(
                      "pl-6 font-mono",
                      errors.prices?.[i]?.value &&
                        "border-destructive",
                    )}
                  />
                </div>
                {errors.prices?.[i]?.value && (
                  <p className='text-xs text-destructive mt-1'>
                    {errors.prices[i]?.value?.message}
                  </p>
                )}
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive'
                disabled={fields.length <= 1}
                onClick={() => remove(i)}
              >
                <i className='ri-delete-bin-line text-sm' />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className='flex justify-end gap-2 pt-4 mt-2 border-t border-border'>
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
              <i className='ri-loader-4-line animate-spin mr-1.5' />
              保存中…
            </>
          ) : (
            "保存零件"
          )}
        </Button>
      </div>
    </form>
  )
}
