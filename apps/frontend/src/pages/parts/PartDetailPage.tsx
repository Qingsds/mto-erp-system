/**
 * PartDetailPage.tsx — 零件详情页 /parts/:id
 *
 * 布局：左侧图纸管理区 | 右侧信息区（展示态 / 内联编辑态）
 * 编辑直接在右侧原位切换，无弹层。
 */

import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "@tanstack/react-router"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  useGetPart,
  useUploadDrawing,
  useUpdatePart,
  apiPricesToForm,
  formPricesToApi,
  FileType,
  type PartDrawing,
} from "@/hooks/api/useParts"
import { PartFormSchema, type PartFormValues } from "./parts.schema"

// ─── 左侧：图纸展示 ───────────────────────────────────────

function DrawingPreview({
  drawing,
  localPreviewUrl,
  onUploadClick,
  isUploading,
}: {
  drawing?: PartDrawing
  localPreviewUrl: string | null
  onUploadClick: () => void
  isUploading: boolean
}) {
  if (localPreviewUrl) {
    return (
      <div className='relative w-full aspect-square rounded-xl overflow-hidden bg-muted border border-border'>
        <img
          src={localPreviewUrl}
          alt='图纸预览'
          className='w-full h-full object-contain'
        />
        <div className='absolute bottom-3 right-3'>
          <ReuploadButton
            onClick={onUploadClick}
            loading={isUploading}
          />
        </div>
      </div>
    )
  }

  if (drawing) {
    const isImage = drawing.fileType === FileType.IMAGE
    return (
      <div className='relative w-full aspect-square rounded-xl border border-border bg-muted/30 flex flex-col items-center justify-center gap-4 p-6'>
        <div
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center",
            isImage ? "bg-primary/10" : "bg-destructive/10",
          )}
        >
          <i
            className={cn(
              "text-4xl",
              isImage
                ? "ri-image-line text-primary/60"
                : "ri-file-pdf-line text-destructive/60",
            )}
          />
        </div>
        <div className='text-center'>
          <p className='text-sm font-medium truncate max-w-45'>
            {drawing.fileName}
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            {new Date(drawing.uploadedAt).toLocaleDateString("zh-CN")}
          </p>
          <p className='text-[11px] text-muted-foreground/50 mt-1'>
            存储于 MinIO，本地暂不可预览
          </p>
        </div>
        <div className='absolute bottom-3 right-3'>
          <ReuploadButton
            onClick={onUploadClick}
            loading={isUploading}
          />
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onUploadClick}
      disabled={isUploading}
      className={cn(
        "w-full aspect-square rounded-xl border-2 border-dashed border-border",
        "flex flex-col items-center justify-center gap-3 p-6",
        "hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer",
        "bg-transparent disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <div className='w-16 h-16 rounded-xl bg-muted flex items-center justify-center'>
        <i className='ri-file-add-line text-3xl text-muted-foreground/40' />
      </div>
      <div className='text-center'>
        <p className='text-sm font-medium'>上传工程图纸</p>
        <p className='text-xs text-muted-foreground mt-1'>
          支持 PNG、JPG、PDF
        </p>
      </div>
    </button>
  )
}

function ReuploadButton({
  onClick,
  loading,
}: {
  onClick: () => void
  loading: boolean
}) {
  return (
    <Button
      size='sm'
      variant='secondary'
      className='h-7 px-2.5 text-xs shadow-sm'
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
      disabled={loading}
    >
      {loading ? (
        <>
          <i className='ri-loader-4-line animate-spin mr-1' />
          上传中
        </>
      ) : (
        <>
          <i className='ri-upload-2-line mr-1' />
          重新上传
        </>
      )}
    </Button>
  )
}

function DrawingHistory({ drawings }: { drawings: PartDrawing[] }) {
  const history = drawings.filter(d => !d.isLatest)
  if (history.length === 0) return null
  return (
    <div className='flex flex-col gap-2'>
      <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
        历史版本（{history.length}）
      </p>
      <div className='flex flex-col gap-1.5'>
        {history.map(d => (
          <div
            key={d.id}
            className='flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20'
          >
            <div className='w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0'>
              <i
                className={cn(
                  "text-xs text-muted-foreground",
                  d.fileType === FileType.IMAGE
                    ? "ri-image-line"
                    : "ri-file-pdf-line",
                )}
              />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-xs truncate text-muted-foreground'>
                {d.fileName}
              </p>
              <p className='text-[11px] text-muted-foreground/50'>
                {new Date(d.uploadedAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 右侧：信息展示态 ─────────────────────────────────────

function ViewField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
        {label}
      </span>
      <div className='text-sm'>{children}</div>
    </div>
  )
}

// ─── 右侧：内联编辑态 ─────────────────────────────────────

function InlineEditForm({
  defaultValues,
  onSave,
  onCancel,
  isSaving,
}: {
  defaultValues: PartFormValues
  onSave: (v: PartFormValues) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(PartFormSchema),
    defaultValues,
  })
  const { fields, append, remove } = useFieldArray({
    control,
    name: "prices",
  })

  return (
    <form
      onSubmit={handleSubmit(onSave)}
      className='flex flex-col gap-5'
    >
      {/* Name */}
      <div className='flex flex-col gap-1.5'>
        <label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
          零件名称 <span className='text-destructive'>*</span>
        </label>
        <Input
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className='text-xs text-destructive'>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Material + Spec */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='flex flex-col gap-1.5'>
          <label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
            材质 <span className='text-destructive'>*</span>
          </label>
          <Input
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
          <label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
            规格型号
          </label>
          <Input
            {...register("spec")}
            placeholder='可选'
          />
        </div>
      </div>

      {/* Prices */}
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <label className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
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
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className='flex items-center gap-2'
          >
            <Input
              placeholder='名称（如：标准价）'
              {...register(`prices.${idx}.label`)}
              className='flex-1 h-8'
            />
            <Input
              type='number'
              min={0}
              step={0.01}
              placeholder='0.00'
              {...register(`prices.${idx}.value`)}
              className='w-28 h-8 font-mono text-right'
            />
            <button
              type='button'
              onClick={() => remove(idx)}
              disabled={fields.length === 1}
              className={cn(
                "text-muted-foreground hover:text-destructive transition-colors bg-transparent border-none cursor-pointer p-1",
                fields.length === 1 &&
                  "opacity-30 cursor-not-allowed",
              )}
            >
              <i className='ri-close-line text-sm' />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className='flex gap-2 pt-1'>
        <Button
          type='submit'
          size='sm'
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <i className='ri-loader-4-line animate-spin mr-1.5' />
              保存中…
            </>
          ) : (
            <>
              <i className='ri-check-line mr-1.5' />
              保存
            </>
          )}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
        >
          取消
        </Button>
      </div>
    </form>
  )
}

// ─── 主页面 ───────────────────────────────────────────────

export function PartDetailPage() {
  const { id } = useParams({ from: "/parts/$id" })
  const navigate = useNavigate()
  const partId = Number(id)

  const { data: part, isLoading } = useGetPart(partId)
  const uploadDrawing = useUploadDrawing()
  const updatePart = useUpdatePart()

  const [isEditing, setIsEditing] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<
    string | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const latest = part?.drawings?.find(d => d.isLatest)
  const prices = apiPricesToForm(part?.commonPrices)

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith("image/"))
      setLocalPreviewUrl(URL.createObjectURL(file))
    uploadDrawing.mutate({ partId, file })
    e.target.value = ""
  }

  const handleSave = async (values: PartFormValues) => {
    await updatePart.mutateAsync({
      id: partId,
      name: values.name,
      material: values.material,
      spec: values.spec,
      commonPrices: formPricesToApi(values.prices),
    })
    setIsEditing(false)
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='flex items-center gap-2 px-6 py-3.5 border-b border-border bg-background shrink-0'>
          <div className='h-4 bg-muted animate-pulse rounded w-12' />
          <i className='ri-arrow-right-s-line text-muted-foreground/40 text-xs' />
          <div className='h-4 bg-muted animate-pulse rounded w-32' />
        </div>
        <div className='flex-1 overflow-auto p-6 lg:p-8'>
          <div className='flex gap-8'>
            <div className='w-64 shrink-0 aspect-square bg-muted animate-pulse rounded-xl' />
            <div className='flex-1 flex flex-col gap-4 pt-2'>
              {[60, 40, 50, 35, 55].map((w, i) => (
                <div
                  key={i}
                  className='h-4 bg-muted animate-pulse rounded'
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!part) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>零件不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/parts" })}
        >
          返回零件库
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      {/* ── 顶部面包屑 ── */}
      <div className='flex items-center gap-3 px-6 py-3.5 border-b border-border bg-background shrink-0'>
        <nav className='flex items-center gap-1.5 text-sm flex-1 min-w-0'>
          <Link
            to='/parts'
            className='text-muted-foreground hover:text-foreground transition-colors'
          >
            零件库
          </Link>
          <i className='ri-arrow-right-s-line text-muted-foreground/40 text-xs' />
          <span className='font-medium truncate'>{part.name}</span>
          <span className='font-mono text-xs text-muted-foreground ml-1.5 shrink-0'>
            {part.partNumber}
          </span>
        </nav>
      </div>

      {/* ── 主体 ── */}
      <div className='flex-1 overflow-auto'>
        <div className='p-6 lg:p-8'>
          <div className='flex flex-col lg:flex-row gap-8 items-start'>
            {/* ── 左侧：图纸 ── */}
            <div className='flex flex-col gap-4 w-full lg:w-80 xl:w-96 shrink-0'>
              <DrawingPreview
                drawing={latest}
                localPreviewUrl={localPreviewUrl}
                onUploadClick={() => fileInputRef.current?.click()}
                isUploading={uploadDrawing.isPending}
              />
              <DrawingHistory drawings={part.drawings ?? []} />
            </div>

            {/* ── 右侧：信息 ── */}
            <div className='flex-1 min-w-0'>
              {isEditing ? (
                /* ── 编辑态 ── */
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center justify-between mb-4'>
                    <h2 className='text-base font-semibold'>
                      编辑零件信息
                    </h2>
                  </div>
                  <InlineEditForm
                    defaultValues={{
                      name: part.name,
                      material: part.material,
                      spec: part.spec ?? "",
                      prices:
                        prices.length > 0
                          ? prices
                          : [{ label: "标准价", value: 0 }],
                    }}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                    isSaving={updatePart.isPending}
                  />
                </div>
              ) : (
                /* ── 展示态 ── */
                <div className='flex flex-col gap-5'>
                  {/* 标题 + 编辑按钮 */}
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <h1 className='text-2xl font-semibold tracking-tight'>
                        {part.name}
                      </h1>
                      <p className='font-mono text-sm text-muted-foreground mt-1'>
                        {part.partNumber}
                      </p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      className='shrink-0 mt-1'
                      onClick={() => setIsEditing(true)}
                    >
                      <i className='ri-edit-line mr-1.5' />
                      编辑
                    </Button>
                  </div>

                  <Separator />

                  {/* 基础信息 */}
                  <div className='grid grid-cols-2 gap-x-8 gap-y-4'>
                    <ViewField label='材质'>
                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground'>
                        {part.material}
                      </span>
                    </ViewField>
                    <ViewField label='规格型号'>
                      {part.spec ? (
                        <span className='font-mono'>{part.spec}</span>
                      ) : (
                        <span className='text-muted-foreground'>
                          —
                        </span>
                      )}
                    </ViewField>
                  </div>

                  <Separator />

                  {/* 价格字典 */}
                  <div className='flex flex-col gap-3'>
                    <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                      价格字典
                    </p>
                    {prices.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        暂无价格，点击编辑添加
                      </p>
                    ) : (
                      <div className='flex flex-wrap gap-3'>
                        {prices.map(p => (
                          <div
                            key={p.label}
                            className='flex flex-col gap-1 px-4 py-3 rounded-lg border border-border bg-muted/30 min-w-[110px]'
                          >
                            <span className='text-[11px] text-muted-foreground'>
                              {p.label}
                            </span>
                            <span className='font-mono font-semibold text-lg tabular-nums'>
                              ¥
                              {p.value.toLocaleString("zh-CN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏文件 input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*,.pdf'
        className='hidden'
        onChange={handleFileChange}
      />
    </div>
  )
}
