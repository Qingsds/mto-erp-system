import { Button } from "@/components/ui/button"
import {
  downloadPartDrawingFile,
  FileType,
  type PartDrawing,
} from "@/hooks/api/useParts"

interface PartDrawingHistoryProps {
  drawings: PartDrawing[]
  isMobile: boolean
  onPreviewDrawing: (drawing: PartDrawing) => void
}

export function PartDrawingHistory({
  drawings,
  isMobile,
  onPreviewDrawing,
}: PartDrawingHistoryProps) {
  const history = drawings.filter(drawing => !drawing.isLatest)
  if (history.length === 0) return null

  const content = (
    <div className='flex flex-col gap-2'>
      <p className='text-[11px] font-medium uppercase tracking-wider text-muted-foreground'>
        历史版本（{history.length}）
      </p>
      <div className='flex flex-col gap-1.5'>
        {history.map(drawing => (
          <div
            key={drawing.id}
            className='flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 p-2.5 transition-colors hover:bg-muted/35'
          >
            <div className='flex w-7 shrink-0 items-center justify-center rounded-md bg-muted'>
              <i
                className={
                  drawing.fileType === FileType.IMAGE
                    ? "ri-image-line text-xs text-muted-foreground"
                    : "ri-file-pdf-line text-xs text-muted-foreground"
                }
              />
            </div>
            <button
              type='button'
              className='min-w-0 flex-1 text-left'
              onClick={() => onPreviewDrawing(drawing)}
            >
              <p className='truncate text-xs text-muted-foreground'>
                {drawing.fileName}
              </p>
              <p className='text-[11px] text-muted-foreground/50'>
                {new Date(drawing.uploadedAt).toLocaleDateString("zh-CN")}
              </p>
            </button>
            <div className='flex items-center gap-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 px-2 text-[11px]'
                onClick={() => onPreviewDrawing(drawing)}
              >
                预览
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 px-2 text-[11px]'
                onClick={() => {
                  void downloadPartDrawingFile(drawing)
                }}
              >
                下载
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!isMobile) {
    return content
  }

  return (
    <details className='border border-border bg-card'>
      <summary className='flex list-none cursor-pointer items-center justify-between px-2.5 py-2 text-sm font-medium'>
        历史版本
        <span className='text-xs text-muted-foreground'>
          {history.length} 个版本
        </span>
      </summary>
      <div className='border-t border-border px-3 py-3'>{content}</div>
    </details>
  )
}
