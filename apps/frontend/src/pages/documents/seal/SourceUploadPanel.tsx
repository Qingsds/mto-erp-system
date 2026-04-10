/**
 * 待盖章文档上传面板。
 *
 * 固定职责：
 * - 约束可上传格式
 * - 提前展示大小限制
 * - 在进入工作台前就地承载错误提示
 */

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  MAX_SEALABLE_DOCUMENT_SIZE_BYTES,
  SEALABLE_DOCUMENT_ACCEPT,
  formatSealableFileSize,
} from "./shared"

interface SourceUploadPanelProps {
  isUploading: boolean
  error: string | null
  onUpload: (file: File) => Promise<void>
}

export function SourceUploadPanel({
  isUploading,
  error,
  onUpload,
}: SourceUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handlePickFile = () => {
    inputRef.current?.click()
  }

  const handleSubmit = async () => {
    if (!selectedFile) return
    await onUpload(selectedFile)
  }

  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-4 py-4 sm:px-5'>
        <h2 className='text-sm font-semibold'>上传待盖章文件</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          当前仅支持 PDF。上传后会直接进入签章工作台。
        </p>
      </div>

      <div className='space-y-4 px-4 py-4 sm:px-5'>
        {error && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {error}
          </div>
        )}

        <div className='border border-dashed border-border bg-muted/15 px-4 py-6'>
          <input
            ref={inputRef}
            type='file'
            className='hidden'
            accept={SEALABLE_DOCUMENT_ACCEPT}
            onChange={event => {
              const file = event.target.files?.[0] ?? null
              setSelectedFile(file)
              event.currentTarget.value = ""
            }}
          />

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='text-sm font-medium text-foreground'>
                {selectedFile ? selectedFile.name : "请选择一份待盖章文件"}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                格式：PDF，大小不超过 10MB。
              </p>
              {selectedFile && (
                <p className='mt-2 text-xs text-muted-foreground'>
                  当前文件：{formatSealableFileSize(selectedFile.size)}
                </p>
              )}
            </div>

            <div className='flex flex-col gap-2 sm:w-[180px]'>
              <Button
                type='button'
                variant='outline'
                className='h-9 w-full'
                onClick={handlePickFile}
                disabled={isUploading}
              >
                <i className='ri-upload-2-line mr-1.5' />
                选择文件
              </Button>
              <Button
                type='button'
                className='h-9 w-full'
                onClick={() => void handleSubmit()}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <i className='ri-loader-4-line mr-1.5 animate-spin' />
                    上传中…
                  </>
                ) : (
                  <>
                    <i className='ri-file-paper-2-line mr-1.5' />
                    进入工作台
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className='grid gap-2 text-xs text-muted-foreground'>
          <p>归档规则：上传后的 PDF 会先保存为草稿，再进入盖章工作台。</p>
          <p>盖章后会生成 signed PDF，可在结果区预览或下载。</p>
          <p>
            上传限制：单文件最大 {formatSealableFileSize(MAX_SEALABLE_DOCUMENT_SIZE_BYTES)}。
          </p>
        </div>
      </div>
    </section>
  )
}
