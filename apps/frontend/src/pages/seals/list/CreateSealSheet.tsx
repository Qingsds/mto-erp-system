/**
 * 印章注册抽屉。
 *
 * 固定流程：
 * 1. 选择 PNG 原图后立即上传并生成清洗预览
 * 2. 确认原图 / 处理图效果
 * 3. 输入名称完成最终注册
 */

import { useEffect, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErpSheet } from "@/components/common/ErpSheet"
import {
  useCreateSeal,
  useDiscardUploadedSeal,
  useUploadSeal,
  type UploadedSealFile,
} from "@/hooks/api/useSeals"
import {
  formatFileSize,
  MAX_SEAL_FILE_SIZE_BYTES,
  SEAL_FILE_ACCEPT,
} from "../shared"

interface CreateSealSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function validateSealFile(file: File | null) {
  if (!file) return "请先选择 PNG 印章图片"
  if (file.type !== "image/png") return "仅支持上传 PNG 透明底图"
  if (file.size > MAX_SEAL_FILE_SIZE_BYTES) {
    return `印章图片不能超过 ${formatFileSize(MAX_SEAL_FILE_SIZE_BYTES)}`
  }
  return null
}

export function CreateSealSheet({ open, onOpenChange }: CreateSealSheetProps) {
  const [name, setName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedSealFile | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const uploadSeal = useUploadSeal()
  const discardUpload = useDiscardUploadedSeal()
  const createSeal = useCreateSeal()

  const isUploadingPreview = uploadSeal.isPending
  const isSubmitting = createSeal.isPending
  const canSubmit =
    name.trim().length > 0 &&
    !!selectedFile &&
    !!uploadedFile &&
    !isUploadingPreview &&
    !isSubmitting

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        window.URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const cleanupUploadedTemp = async (payload?: UploadedSealFile | null) => {
    if (!payload) return

    try {
      await discardUpload.mutateAsync({
        fileKey: payload.fileKey,
        originalFileKey: payload.originalFileKey,
      })
    } catch {
      // 清理失败不阻断用户后续操作，后端已对已注册文件做了保护。
    }
  }

  const resetForm = async (options?: { discardUploaded?: boolean }) => {
    const shouldDiscard = options?.discardUploaded ?? true
    const previousUpload = uploadedFile
    const previousPreview = localPreviewUrl

    setName("")
    setSelectedFile(null)
    setLocalPreviewUrl(null)
    setUploadedFile(null)
    setFormError(null)

    if (previousPreview) {
      window.URL.revokeObjectURL(previousPreview)
    }
    if (shouldDiscard) {
      await cleanupUploadedTemp(previousUpload)
    }
  }

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      await resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    const nextError = validateSealFile(nextFile)

    event.target.value = ""

    const previousPreview = localPreviewUrl
    const previousUpload = uploadedFile

    setUploadedFile(null)
    setSelectedFile(null)
    setFormError(nextError)
    setLocalPreviewUrl(null)

    if (previousPreview) {
      window.URL.revokeObjectURL(previousPreview)
    }
    if (previousUpload) {
      void cleanupUploadedTemp(previousUpload)
    }

    if (nextError || !nextFile) {
      return
    }

    const objectUrl = window.URL.createObjectURL(nextFile)
    setSelectedFile(nextFile)
    setLocalPreviewUrl(objectUrl)

    try {
      const uploaded = await uploadSeal.mutateAsync(nextFile)
      setUploadedFile(uploaded)
      setFormError(null)
    } catch (error) {
      setUploadedFile(null)
      setFormError(error instanceof Error ? error.message : "印章图片处理失败")
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setFormError("请先选择 PNG 印章图片")
      return
    }
    if (!uploadedFile) {
      setFormError("请等待印章图片清洗完成后再提交")
      return
    }
    if (!name.trim()) {
      setFormError("请输入印章名称")
      return
    }

    try {
      setFormError(null)
      await createSeal.mutateAsync({
        name: name.trim(),
        fileKey: uploadedFile.fileKey,
        originalFileKey: uploadedFile.originalFileKey,
      })
      await resetForm({ discardUploaded: false })
      onOpenChange(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "印章注册失败")
    }
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={nextOpen => {
        void handleOpenChange(nextOpen)
      }}
      title="注册新印章"
      description="上传 PNG 原图后，系统会自动清洗边缘和背景，再用于列表预览与 PDF 盖章"
      width={560}
    >
      <div className='flex flex-col gap-4'>
        {formError && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {formError}
          </div>
        )}

        <div className='flex flex-col gap-1.5'>
          <label className='text-xs text-muted-foreground'>印章名称 *</label>
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder='例：公司公章'
            className='h-10'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-3'>
            <label className='text-xs text-muted-foreground'>印章 PNG 原图 *</label>
            <span className='text-[11px] text-muted-foreground'>
              上限 {formatFileSize(MAX_SEAL_FILE_SIZE_BYTES)}
            </span>
          </div>

          <label className='flex cursor-pointer flex-col gap-2 border border-dashed border-border bg-muted/20 px-3 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40'>
            <span className='font-medium text-foreground'>
              {isUploadingPreview ? "正在生成清洗预览…" : "选择 PNG 文件"}
            </span>
            <span className='text-[11px] text-muted-foreground'>
              仅支持透明底图，系统会自动去背景、提纯红章颜色并生成处理图
            </span>
            <input
              type='file'
              accept={SEAL_FILE_ACCEPT}
              className='hidden'
              onChange={event => {
                void handleFileChange(event)
              }}
            />
          </label>
        </div>

        <div className='grid gap-3 md:grid-cols-2'>
          <PreviewCard
            title="原图预览"
            hint={selectedFile ? "展示你上传的原始 PNG" : "选择文件后显示"}
            imageUrl={localPreviewUrl}
            loading={false}
          />
          <PreviewCard
            title="清洗后预览"
            hint={
              uploadedFile
                ? "系统已自动清洗边缘与背景，后续预览和盖章都使用这一版"
                : isUploadingPreview
                  ? "正在生成清洗结果…"
                  : "上传并处理后显示"
            }
            imageUrl={uploadedFile?.processedPreviewDataUrl ?? null}
            loading={isUploadingPreview}
          />
        </div>

        {selectedFile ? (
          <div className='border border-border bg-card px-3 py-2 text-xs'>
            <p className='font-medium text-foreground'>{selectedFile.name}</p>
            <p className='mt-1 text-muted-foreground'>
              {formatFileSize(selectedFile.size)} · {selectedFile.type || "image/png"}
            </p>
          </div>
        ) : (
          <p className='text-[11px] text-muted-foreground'>
            当前未选择文件。请上传透明底 PNG，系统会自动生成更干净的可盖章版本。
          </p>
        )}

        <div className='flex items-stretch gap-2 pt-2'>
          <Button
            className='h-10 flex-1'
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                注册中…
              </>
            ) : (
              <>
                <i className='ri-upload-cloud-2-line mr-1.5' />
                确认注册印章
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-10 shrink-0'
            disabled={isSubmitting}
            onClick={() => {
              void handleOpenChange(false)
            }}
          >
            取消
          </Button>
        </div>
      </div>
    </ErpSheet>
  )
}

function PreviewCard({
  title,
  hint,
  imageUrl,
  loading,
}: {
  title: string
  hint: string
  imageUrl: string | null
  loading: boolean
}) {
  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-3 py-2'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        <p className='mt-1 text-[11px] text-muted-foreground'>{hint}</p>
      </div>
      <div className='flex min-h-[220px] items-center justify-center bg-muted/10 p-3'>
        {loading ? (
          <div className='text-sm text-muted-foreground'>
            <i className='ri-loader-4-line mr-1.5 animate-spin' />
            处理中…
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className='max-h-[240px] w-full object-contain'
          />
        ) : (
          <div className='text-xs text-muted-foreground'>暂无预览</div>
        )}
      </div>
    </section>
  )
}
