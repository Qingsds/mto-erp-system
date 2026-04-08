import { Button } from "@/components/ui/button"
import type { PreviewFileKind } from "@/hooks/common/useFilePreviewDialog"
import { DocumentDialogShell } from "@/components/documents/DocumentDialogShell"
import { PdfPreviewDocument } from "./PdfPreviewDocument"

/**
 * 通用文件预览弹层。
 *
 * 统一承载图片 / PDF 的只读预览与下载动作，避免业务页各自维护弹层。
 */
interface FilePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fileKind: PreviewFileKind
  previewUrl: string | null
  isLoading: boolean
  error: string | null
  onDownload?: (() => void | Promise<void>) | null
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  title,
  fileKind,
  previewUrl,
  isLoading,
  error,
  onDownload,
}: FilePreviewDialogProps) {
  return (
    <DocumentDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title || "文件预览"}
      description={
        fileKind === "pdf"
          ? "PDF 只读预览"
          : fileKind === "image"
            ? "图片预览"
            : "当前文件仅支持下载"
      }
      bodyClassName='bg-muted/10'
      actions={
        <>
          {onDownload && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-2.5 text-xs'
              onClick={() => {
                void onDownload()
              }}
            >
              <i className='ri-download-line mr-1.5' />
              下载
            </Button>
          )}
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='h-8 px-2.5 text-xs'
            onClick={() => onOpenChange(false)}
          >
            <i className='ri-close-line mr-1.5' />
            关闭
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
          <i className='ri-loader-4-line mr-2 animate-spin' />
          文件加载中…
        </div>
      ) : error ? (
        <div className='flex h-full items-center justify-center px-4 text-center text-sm text-destructive'>
          {error}
        </div>
      ) : !previewUrl ? (
        <div className='flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground'>
          当前文件暂不可预览
        </div>
      ) : fileKind === "image" ? (
        <div className='flex h-full items-center justify-center overflow-auto p-3 sm:p-4'>
          <img
            src={previewUrl}
            alt={title}
            className='max-h-full w-auto max-w-full object-contain'
          />
        </div>
      ) : fileKind === "pdf" ? (
        <PdfPreviewDocument
          key={previewUrl}
          previewUrl={previewUrl}
          title={title}
        />
      ) : (
        <div className='flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground'>
          当前文件仅支持下载，请使用右上角下载按钮获取原文件。
        </div>
      )}
    </DocumentDialogShell>
  )
}
