import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod/v4"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type PartFormInput = z.input<typeof PartFormSchema>

export function PartForm({
  defaultValues,
  onSubmit,
  onCancel,
}: PartFormProps) {
  const form = useForm<PartFormInput, unknown, PartFormValues>({
    resolver: (zodResolver as any)(PartFormSchema),
    defaultValues: {
      name: "",
      material: "",
      spec: "",
      remark: "",
      prices: [{ label: "标准价", value: "" }],
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

        <div>
          <div className='mb-3 flex items-center justify-between'>
            <FormLabel>
              常用价格 <span className='text-destructive'>*</span>
            </FormLabel>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={() => append({ label: "", value: "" })}
            >
              <i className='ri-add-line mr-1' />
              添加价格项
            </Button>
          </div>

          {form.formState.errors.prices?.root && (
            <p className='mb-2 text-xs text-destructive'>
              {form.formState.errors.prices.root.message}
            </p>
          )}

          <div className='flex flex-col gap-2'>
            {fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
                className='flex items-start gap-2'
              >
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

                <FormField
                  control={form.control}
                  name={`prices.${index}.value`}
                  render={({ field }) => {
                    const inputValue =
                      typeof field.value === "number" || typeof field.value === "string"
                        ? field.value
                        : ""

                    return (
                      <FormItem className='w-28'>
                        <FormControl>
                          <div className='relative'>
                            <span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
                              ¥
                            </span>
                            <Input
                              className='pl-6 font-mono'
                              type='number'
                              step='0.01'
                              placeholder='0.00'
                              value={inputValue}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='mt-0 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive'
                  disabled={fields.length <= 1}
                  onClick={() => remove(index)}
                >
                  <i className='ri-delete-bin-line text-sm' />
                </Button>
              </div>
            ))}
          </div>
        </div>

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
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
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
