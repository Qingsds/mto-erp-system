/**
 * 编辑态图纸上传区。
 *
 * 这里只处理图纸版本的读取、上传与错误展示，
 * 让表单组件专注在基础字段和价格编辑上。
 */

import { useRef, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  buildPartDrawingFileUrl,
  FileType,
  PART_DRAWING_ACCEPT,
  PART_DRAWING_HELP_TEXT,
  useGetPart,
  useUploadDrawing,
  type PartDrawing,
  validatePartDrawingFile,
} from "@/hooks/api/useParts"

interface PartDrawingUploadSectionProps {
  partId: number
}

function PartDrawingItem({
  drawing,
  isLatest,
}: {
  drawing: PartDrawing
  isLatest?: boolean
}) {
  const isImage = drawing.fileType === FileType.IMAGE
  const date = new Date(drawing.uploadedAt).toLocaleString("zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
  })

  return (
    <div className={cn(
      "flex items-center gap-3 border p-3",
      isLatest ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20",
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center bg-muted",
        isLatest && "bg-primary/10",
      )}>
        <i className={cn(
          "text-sm",
          isImage ? "ri-image-line" : "ri-file-pdf-line",
          isLatest ? "text-primary" : "text-muted-foreground",
        )} />
      </div>

      <div className='min-w-0 flex-1'>
        <p className='truncate text-xs font-medium text-foreground'>
          {drawing.fileName}
        </p>
        <p className='mt-0.5 text-[11px] text-muted-foreground'>
          {date}
        </p>
      </div>

      <div className='flex shrink-0 items-center gap-1'>
        <a
          href={buildPartDrawingFileUrl(drawing.partId, drawing.id)}
          target='_blank'
          rel='noreferrer'
          className='inline-flex h-7 items-center justify-center border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground'
        >
          查看
        </a>
        <a
          href={buildPartDrawingFileUrl(drawing.partId, drawing.id, { download: true })}
          className='inline-flex h-7 items-center justify-center border border-border px-2 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground'
        >
          下载
        </a>
      </div>

      {isLatest && (
        <span className='shrink-0 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary'>
          最新
        </span>
      )}
    </div>
  )
}

export function PartDrawingUploadSection({
  partId,
}: PartDrawingUploadSectionProps) {
  const { data: detail, isLoading } = useGetPart(partId)
  const uploadDrawing = useUploadDrawing()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const drawings = detail?.drawings ?? []
  const latest = drawings.find(drawing => drawing.isLatest)
  const history = drawings.filter(drawing => !drawing.isLatest)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validatePartDrawingFile(file)
    if (validationError) {
      setUploadError(validationError)
      event.target.value = ""
      return
    }

    setUploadError(null)

    try {
      await uploadDrawing.mutateAsync({ partId, file })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "图纸上传失败")
    }

    event.target.value = ""
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-2'>
        <div className='h-3 w-24 animate-pulse bg-muted' />
        <div className='h-20 animate-pulse bg-muted' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-xs font-medium tracking-wider text-muted-foreground'>
            工程图纸
          </p>
          <p className='mt-0.5 text-[11px] text-muted-foreground'>
            {PART_DRAWING_HELP_TEXT}，上传后旧版本会自动归档。
          </p>
        </div>

        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-7 px-2 text-xs'
          disabled={uploadDrawing.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {uploadDrawing.isPending ? (
            <>
              <i className='ri-loader-4-line mr-1 animate-spin' />
              上传中…
            </>
          ) : (
            <>
              <i className='ri-upload-2-line mr-1' />
              上传新版本
            </>
          )}
        </Button>
      </div>

      <input
        ref={inputRef}
        type='file'
        accept={PART_DRAWING_ACCEPT}
        className='hidden'
        onChange={handleFileChange}
      />

      {latest ? (
        <PartDrawingItem
          drawing={latest}
          isLatest
        />
      ) : (
        <div
          className='cursor-pointer border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/30'
          onClick={() => inputRef.current?.click()}
        >
          <i className='ri-file-add-line mb-2 block text-2xl text-muted-foreground/50' />
          <p className='text-sm text-muted-foreground'>
            点击上传工程图纸
          </p>
          <p className='mt-1 text-xs text-muted-foreground/70'>
            {PART_DRAWING_HELP_TEXT}
          </p>
        </div>
      )}

      {uploadError && (
        <p className='text-xs text-destructive'>
          {uploadError}
        </p>
      )}

      {history.length > 0 && (
        <div className='flex flex-col gap-1.5'>
          <p className='text-[11px] text-muted-foreground'>
            历史版本（{history.length}）
          </p>
          {history.map(drawing => (
            <PartDrawingItem
              key={drawing.id}
              drawing={drawing}
            />
          ))}
        </div>
      )}
    </div>
  )
}
