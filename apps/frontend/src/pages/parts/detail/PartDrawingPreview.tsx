import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  downloadPartDrawingFile,
  PART_DRAWING_HELP_TEXT,
  FileType,
  type PartDrawing,
  usePartDrawingPreviewUrl,
} from "@/hooks/api/useParts"

interface PartDrawingPreviewProps {
  drawing?: PartDrawing
  localPreviewUrl: string | null
  onUploadClick: () => void
  isUploading: boolean
  errorMessage: string | null
  onLocalImagePreview: (src: string, title: string) => void
  onPreviewDrawing: (drawing: PartDrawing) => void
  canUpload: boolean
}

export function PartDrawingPreview({
  drawing,
  localPreviewUrl,
  onUploadClick,
  isUploading,
  errorMessage,
  onLocalImagePreview,
  onPreviewDrawing,
  canUpload,
}: PartDrawingPreviewProps) {
  const {
    previewUrl,
    previewError,
    isLoading: isLoadingPreview,
  } = usePartDrawingPreviewUrl(drawing)

  if (localPreviewUrl) {
    return (
      <PreviewShell errorMessage={errorMessage}>
        <div className='relative w-full aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted sm:aspect-square'>
          <button
            type='button'
            onClick={() =>
              onLocalImagePreview(localPreviewUrl, "本地预览")
            }
            className='h-full w-full cursor-zoom-in bg-transparent p-0'
          >
            <img
              src={localPreviewUrl}
              alt='图纸预览'
              className='h-full w-full object-contain'
            />
          </button>
          <div className='absolute bottom-3 right-3'>
            {canUpload && <ReuploadButton onClick={onUploadClick} loading={isUploading} />}
          </div>
        </div>
      </PreviewShell>
    )
  }

  if (drawing) {
    const isImage = drawing.fileType === FileType.IMAGE
    const resolvedError = errorMessage ?? previewError

    return (
      <PreviewShell errorMessage={resolvedError}>
        <div className='relative w-full aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted/30 sm:aspect-square'>
          {isImage && isLoadingPreview ? (
            <div className='flex h-full w-full items-center justify-center bg-muted/30 text-sm text-muted-foreground'>
              <i className='ri-loader-4-line mr-2 animate-spin' />
              图纸加载中…
            </div>
          ) : isImage ? (
            <button
              type='button'
              onClick={() => onPreviewDrawing(drawing)}
              className='h-full w-full cursor-zoom-in bg-transparent p-0 text-left'
              disabled={!previewUrl}
            >
              <img
                src={previewUrl ?? ""}
                alt={drawing.fileName}
                className='h-full w-full object-contain'
              />
            </button>
          ) : (
            <div className='flex h-full w-full flex-col items-center justify-center gap-3 bg-white px-4 text-center'>
              <div className='flex h-14 w-14 items-center justify-center border border-border bg-muted/20 text-muted-foreground'>
                <i className='ri-file-pdf-2-line text-2xl' />
              </div>
              <div>
                <p className='text-sm font-medium text-foreground'>
                  PDF 图纸
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  点击下方按钮在统一预览器中查看和下载。
                </p>
              </div>
            </div>
          )}

          {isImage ? (
            <div className='absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-background/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur'>
              <span className='truncate'>点击图片放大查看</span>
              <div className='flex shrink-0 items-center gap-2'>
                <Button
                  size='sm'
                  variant='secondary'
                  className='h-7 px-2.5 text-xs shadow-sm'
                  onClick={event => {
                    event.stopPropagation()
                    void downloadPartDrawingFile(drawing)
                  }}
                >
                  <i className='ri-download-line mr-1' />
                  下载
                </Button>
                {canUpload && (
                  <ReuploadButton onClick={onUploadClick} loading={isUploading} />
                )}
              </div>
            </div>
          ) : (
            <div className='absolute bottom-3 right-3 flex items-center gap-2'>
              <Button
                type='button'
                size='sm'
                variant='secondary'
                className='h-8 px-3 text-xs shadow-sm'
                onClick={() => onPreviewDrawing(drawing)}
              >
                <i className='ri-external-link-line mr-1.5' />
                预览 PDF
              </Button>
              <Button
                type='button'
                size='sm'
                variant='secondary'
                className='h-8 px-3 text-xs shadow-sm'
                onClick={() => {
                  void downloadPartDrawingFile(drawing)
                }}
              >
                <i className='ri-download-line mr-1.5' />
                下载
              </Button>
              {canUpload && (
                <ReuploadButton onClick={onUploadClick} loading={isUploading} />
              )}
            </div>
          )}
        </div>

        <div className='flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2'>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>{drawing.fileName}</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {new Date(drawing.uploadedAt).toLocaleDateString("zh-CN")}
            </p>
          </div>
          <span className='shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'>
            {isImage ? "图片图纸" : "PDF 图纸"}
          </span>
        </div>
      </PreviewShell>
    )
  }

  return (
    <PreviewShell errorMessage={errorMessage}>
      {canUpload ? (
        <button
          onClick={onUploadClick}
          disabled={isUploading}
          className={cn(
            "w-full aspect-[4/3] rounded-xl border-2 border-dashed border-border sm:aspect-square",
            "flex flex-col items-center justify-center gap-3 p-6",
            "cursor-pointer bg-transparent transition-colors hover:border-primary/40 hover:bg-muted/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <div className='flex h-16 w-16 items-center justify-center rounded-xl bg-muted'>
            <i className='ri-file-add-line text-3xl text-muted-foreground/40' />
          </div>
          <div className='text-center'>
            <p className='text-sm font-medium'>上传工程图纸</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {PART_DRAWING_HELP_TEXT}
            </p>
          </div>
        </button>
      ) : (
        <div className='flex w-full aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground sm:aspect-square'>
          当前零件暂无图纸
        </div>
      )}
      <div className='rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground'>
        {canUpload ? "上传后旧版本会自动归档，支持后续查看和下载。" : "如需补充图纸，请联系管理员维护。"}
      </div>
    </PreviewShell>
  )
}

function PreviewShell({
  children,
  errorMessage,
}: {
  children: React.ReactNode
  errorMessage: string | null
}) {
  return (
    <div className='flex flex-col gap-2'>
      {children}
      {errorMessage && (
        <p className='text-xs text-destructive'>{errorMessage}</p>
      )}
    </div>
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
      onClick={event => {
        event.stopPropagation()
        onClick()
      }}
      disabled={loading}
    >
      {loading ? (
        <>
          <i className='ri-loader-4-line mr-1 animate-spin' />
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
