/**
 * 印章注册抽屉。
 *
 * 采用固定两步：
 * 1. 选择 PNG 文件上传
 * 2. 提交印章名称完成注册
 */

import { useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErpSheet } from "@/components/common/ErpSheet"
import { useCreateSeal, useUploadSeal } from "@/hooks/api/useSeals"
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
  const [formError, setFormError] = useState<string | null>(null)

  const uploadSeal = useUploadSeal()
  const createSeal = useCreateSeal()

  const isSubmitting = uploadSeal.isPending || createSeal.isPending
  const canSubmit = name.trim().length > 0 && !!selectedFile && !isSubmitting

  const resetForm = () => {
    setName("")
    setSelectedFile(null)
    setFormError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null
    const nextError = validateSealFile(nextFile)

    setSelectedFile(nextError ? null : nextFile)
    setFormError(nextError)
  }

  const handleSubmit = async () => {
    const fileError = validateSealFile(selectedFile)

    if (!name.trim()) {
      setFormError("请输入印章名称")
      return
    }
    if (fileError) {
      setFormError(fileError)
      return
    }

    try {
      setFormError(null)
      const uploaded = await uploadSeal.mutateAsync(selectedFile!)
      await createSeal.mutateAsync({
        name: name.trim(),
        fileKey: uploaded.fileKey,
      })
      handleOpenChange(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "印章注册失败")
    }
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="注册新印章"
            description="仅支持 PNG 透明底图，上传后即可用于订单、发货单和对账单盖章"
      width={520}
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
            <label className='text-xs text-muted-foreground'>印章 PNG *</label>
            <span className='text-[11px] text-muted-foreground'>
              上限 {formatFileSize(MAX_SEAL_FILE_SIZE_BYTES)}
            </span>
          </div>

          <label className='flex cursor-pointer flex-col gap-2 border border-dashed border-border bg-muted/20 px-3 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40'>
            <span className='font-medium text-foreground'>选择 PNG 文件</span>
            <span className='text-[11px] text-muted-foreground'>
              仅支持透明底图，用于生成签章版 PDF
            </span>
            <input
              type='file'
              accept={SEAL_FILE_ACCEPT}
              className='hidden'
              onChange={handleFileChange}
            />
          </label>

          {selectedFile ? (
            <div className='border border-border bg-card px-3 py-2 text-xs'>
              <p className='font-medium text-foreground'>{selectedFile.name}</p>
              <p className='mt-1 text-muted-foreground'>
                {formatFileSize(selectedFile.size)} · {selectedFile.type || "image/png"}
              </p>
            </div>
          ) : (
            <p className='text-[11px] text-muted-foreground'>
              当前未选择文件。请上传透明底 PNG，避免导出 PDF 时出现白底。
            </p>
          )}
        </div>

        <div className='flex items-stretch gap-2 pt-2'>
          <Button
            className='h-10 flex-1'
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                提交中…
              </>
            ) : (
              <>
                <i className='ri-upload-cloud-2-line mr-1.5' />
                上传并注册
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-10 shrink-0'
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </div>
    </ErpSheet>
  )
}
