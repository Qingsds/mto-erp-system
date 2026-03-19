/**
 * parts.form.tsx
 *
 * 新增 / 编辑零件表单，提交时对齐 CreatePartRequest / UpdatePartRequest：
 *   { name, material, spec?, commonPrices }
 *
 * editingPart 使用 PartListItem（来自 useParts.ts），避免重复定义接口。
 * 图纸上传区仅在编辑模式（editingPart 存在）时展示。
 */

import { useEffect, useRef }  from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver }         from "@hookform/resolvers/zod"
import { Button }              from "@/components/ui/button"
import { Input }               from "@/components/ui/input"
import { Label }               from "@/components/ui/label"
import { Separator }           from "@/components/ui/separator"
import { cn }                  from "@/lib/utils"
import { PartFormSchema, type PartFormValues } from "./parts.schema"
import {
  useGetPart,
  useUploadDrawing,
  apiPricesToForm,
  FileType,
  type PartListItem,
  type PartDrawing,
} from "@/hooks/api/useParts"

// ─── Hook ─────────────────────────────────────────────────
export function usePartForm() {
  return useForm<PartFormValues>({
    resolver:      zodResolver(PartFormSchema),
    defaultValues: {
      name:     "",
      material: "",
      spec:     "",
      prices:   [{ label: "标准价", value: 0 }],
    },
  })
}

// ─── 图纸上传区（仅编辑模式展示）─────────────────────────
function DrawingSection({ partId }: { partId: number }) {
  const { data: detail, isLoading } = useGetPart(partId)
  const upload  = useUploadDrawing()
  const inputRef = useRef<HTMLInputElement>(null)

  const drawings = detail?.drawings ?? []
  const latest   = drawings.find(d => d.isLatest)
  const history  = drawings.filter(d => !d.isLatest)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    upload.mutate({ partId, file })
    e.target.value = ""
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3 bg-muted animate-pulse rounded w-24" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          工程图纸
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? (
            <><i className="ri-loader-4-line animate-spin mr-1" />上传中…</>
          ) : (
            <><i className="ri-upload-2-line mr-1" />上传新版本</>
          )}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {latest ? (
        <DrawingItem drawing={latest} isLatest />
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <i className="ri-file-add-line text-2xl text-muted-foreground/50 block mb-2" />
          <p className="text-sm text-muted-foreground">点击或拖拽上传工程图纸</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            支持 PNG、JPG、PDF，上传后旧版本自动归档
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-muted-foreground">历史版本（{history.length}）</p>
          {history.map(d => <DrawingItem key={d.id} drawing={d} />)}
        </div>
      )}
    </div>
  )
}

function DrawingItem({
  drawing,
  isLatest,
}: {
  drawing:  PartDrawing
  isLatest?: boolean
}) {
  // 使用 FileType enum 做判断（来自 @erp/shared-types）
  const isImage = drawing.fileType === FileType.IMAGE
  const date    = new Date(drawing.uploadedAt).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  })

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      isLatest ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20",
    )}>
      <div className={cn(
        "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
        isLatest ? "bg-primary/10" : "bg-muted",
      )}>
        <i className={cn(
          "text-sm",
          isImage ? "ri-image-line" : "ri-file-pdf-line",
          isLatest ? "text-primary" : "text-muted-foreground",
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{drawing.fileName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{date}</p>
      </div>
      {isLatest && (
        <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
          最新
        </span>
      )}
    </div>
  )
}

// ─── Part Form ────────────────────────────────────────────
interface PartFormProps {
  form:         ReturnType<typeof usePartForm>
  /** 编辑模式：传入 PartListItem（API 类型），新增时为 null */
  editingPart?: PartListItem | null
  onSubmit:     (values: PartFormValues) => Promise<void>
  onCancel:     () => void
}

export function PartForm({ form, editingPart, onSubmit, onCancel }: PartFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({ control, name: "prices" })

  // 编辑时回填：commonPrices Record → prices 数组
  useEffect(() => {
    if (editingPart) {
      reset({
        name:     editingPart.name,
        material: editingPart.material,
        spec:     editingPart.spec ?? "",
        prices:   apiPricesToForm(editingPart.commonPrices).length > 0
                    ? apiPricesToForm(editingPart.commonPrices)
                    : [{ label: "标准价", value: 0 }],
      })
    } else {
      reset({ name: "", material: "", spec: "", prices: [{ label: "标准价", value: 0 }] })
    }
  }, [editingPart, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          零件名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="如：六角螺栓 M8×30"
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Material + Spec */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material">
            材质 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="material"
            placeholder="如：304不锈钢"
            {...register("material")}
            className={errors.material ? "border-destructive" : ""}
          />
          {errors.material && (
            <p className="text-xs text-destructive">{errors.material.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="spec">规格型号</Label>
          <Input id="spec" placeholder="如：GB/T 5782" {...register("spec")} />
        </div>
      </div>

      {/* Prices */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>
            价格字典 <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => append({ label: "", value: 0 })}
          >
            <i className="ri-add-line mr-1" />添加价格
          </Button>
        </div>

        {errors.prices?.root && (
          <p className="text-xs text-destructive">{errors.prices.root.message}</p>
        )}

        <div className="flex flex-col gap-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder="价格名称（如：标准价）"
                  {...register(`prices.${index}.label`)}
                  className={cn(
                    "h-8",
                    errors.prices?.[index]?.label ? "border-destructive" : "",
                  )}
                />
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  {...register(`prices.${index}.value`)}
                  className={cn(
                    "h-8 font-mono text-right",
                    errors.prices?.[index]?.value ? "border-destructive" : "",
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className={cn(
                  "mt-1.5 text-muted-foreground hover:text-destructive transition-colors bg-transparent border-none cursor-pointer p-0",
                  fields.length === 1 && "opacity-30 cursor-not-allowed",
                )}
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Drawing section — only in edit mode */}
      {editingPart && (
        <>
          <Separator />
          <DrawingSection partId={editingPart.id} />
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><i className="ri-loader-4-line animate-spin mr-1.5" />提交中…</>
          ) : (
            <><i className="ri-check-line mr-1.5" />{editingPart ? "保存修改" : "创建零件"}</>
          )}
        </Button>
      </div>
    </form>
  )
}