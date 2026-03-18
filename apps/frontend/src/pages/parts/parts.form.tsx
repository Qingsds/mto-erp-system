import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  PartFormSchema,
  type PartFormValues,
  type Part,
} from "./parts.schema"

interface PartFormProps {
  defaultValues?: Partial<PartFormValues>
  editingPart?: Part
  onSubmit: (values: PartFormValues) => Promise<void>
  onCancel: () => void
}

export function PartForm({
  defaultValues,
  onSubmit,
  onCancel,
}: PartFormProps) {
  const form = useForm<PartFormValues>({
    resolver: zodResolver(PartFormSchema),
    defaultValues: {
      name: "",
      material: "",
      spec: "",
      remark: "",
      prices: [{ label: "标准价", value: "" as unknown as number }],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prices",
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className='flex flex-col gap-5'
      >
        {/* Basic info */}
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  零件名称 <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='如：六角螺栓 M8×30'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='material'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  物理材质 <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='如：304不锈钢'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='spec'
            render={({ field }) => (
              <FormItem>
                <FormLabel>规格型号</FormLabel>
                <FormControl>
                  <Input
                    placeholder='如：GB/T 5782'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='remark'
            render={({ field }) => (
              <FormItem>
                <FormLabel>备注</FormLabel>
                <FormControl>
                  <Input
                    placeholder='可选'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price dict */}
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

          {/* Global prices error */}
          {form.formState.errors.prices?.root && (
            <p className='text-xs text-destructive mb-2'>
              {form.formState.errors.prices.root.message}
            </p>
          )}

          <div className='flex flex-col gap-2'>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className='flex items-start gap-2'
              >
                {/* Label */}
                <FormField
                  control={form.control}
                  name={`prices.${index}.label`}
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <FormControl>
                        <Input
                          placeholder='价格名称，如：标准价'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Value */}
                <FormField
                  control={form.control}
                  name={`prices.${index}.value`}
                  render={({ field }) => (
                    <FormItem className='w-28'>
                      <FormControl>
                        <div className='relative'>
                          <span className='absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none'>
                            ¥
                          </span>
                          <Input
                            {...field}
                            type='number'
                            step='0.01'
                            placeholder='0.00'
                            className='pl-6 font-mono'
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remove */}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive mt-0'
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                >
                  <i className='ri-delete-bin-line text-sm' />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
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
    </Form>
  )
}
