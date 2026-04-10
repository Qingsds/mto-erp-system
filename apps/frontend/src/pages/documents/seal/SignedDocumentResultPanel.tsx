/**
 * 盖章完成后的结果区。
 *
 * 只承载结果确认与后续动作，不再继续展示拖拽工作台。
 */

import type { ManagedDocumentItem } from "@/hooks/api/useDocuments"
import { Button } from "@/components/ui/button"

interface SignedDocumentResultPanelProps {
  document: ManagedDocumentItem
  isPreviewing: boolean
  isDownloading: boolean
  onPreview: () => void
  onDownload: () => void
  onReset: () => void
}

export function SignedDocumentResultPanel({
  document,
  isPreviewing,
  isDownloading,
  onPreview,
  onDownload,
  onReset,
}: SignedDocumentResultPanelProps) {
  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-4 py-4 sm:px-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-sm font-semibold'>归档完成</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              已生成 signed PDF，可直接预览或下载。
            </p>
          </div>
          <span className='border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700'>
            {document.status === "SIGNED" ? "已归档" : document.status}
          </span>
        </div>
      </div>

      <div className='space-y-4 px-4 py-4 sm:px-5'>
        <div className='space-y-1 text-sm'>
          <p className='font-medium text-foreground'>{document.fileName}</p>
          <p className='text-xs text-muted-foreground'>
            原始文件：{document.sourceFileName ?? "未记录"}
          </p>
        </div>

        <div className='border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800'>
          当前归档文件已经生成完成。建议先下载 signed PDF，再按需继续上传下一份文档。
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            className='h-9'
            onClick={onDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                下载中…
              </>
            ) : (
              <>
                <i className='ri-download-line mr-1.5' />
                下载 PDF
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-9'
            onClick={onPreview}
            disabled={isPreviewing}
          >
            {isPreviewing ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                预览中…
              </>
            ) : (
              <>
                <i className='ri-eye-line mr-1.5' />
                预览 PDF
              </>
            )}
          </Button>
          <Button type='button' variant='outline' className='h-9' onClick={onReset}>
            <i className='ri-add-line mr-1.5' />
            继续上传文档
          </Button>
        </div>
      </div>
    </section>
  )
}
