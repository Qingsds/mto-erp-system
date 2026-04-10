/**
 * 文档盖章记录卡片。
 *
 * 保持信息减法：
 * - 文件名与来源文件
 * - 状态与创建时间
 * - 最近盖章审计摘要
 * - 继续盖章 / 预览 / 下载动作
 */

import { Button } from "@/components/ui/button"
import type { ManagedDocumentItem } from "@/hooks/api/useDocuments"
import { DocumentsStatusBadge } from "./DocumentsStatusBadge"
import { formatManagedDocumentDate } from "./shared"

interface ManagedDocumentCardProps {
  document: ManagedDocumentItem
  isPreviewing: boolean
  isDownloading: boolean
  onContinueSeal: (id: number) => void
  onPreviewPdf: (document: ManagedDocumentItem) => void
  onDownloadPdf: (document: ManagedDocumentItem) => void
}

export function ManagedDocumentCard({
  document,
  isPreviewing,
  isDownloading,
  onContinueSeal,
  onPreviewPdf,
  onDownloadPdf,
}: ManagedDocumentCardProps) {
  const latestLog = document.sealLogs?.[0]

  return (
    <article className='border border-border bg-card px-4 py-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium text-foreground'>
            {document.fileName}
          </p>
          <p className='mt-1 truncate text-xs text-muted-foreground'>
            来源文件：{document.sourceFileName ?? "未记录"}
          </p>
        </div>

        <DocumentsStatusBadge status={document.status} />
      </div>

      <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
        <p>创建时间：{formatManagedDocumentDate(document.createdAt)}</p>
        {latestLog ? (
          <p>
            最近盖章：{latestLog.seal.name} · {latestLog.user.realName} ·{" "}
            {formatManagedDocumentDate(latestLog.actionTime)}
          </p>
        ) : (
          <p>当前还未执行盖章归档。</p>
        )}
      </div>

      <div className='mt-4 flex flex-wrap justify-end gap-2'>
        {document.status === "DRAFT" ? (
          <>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={() => onPreviewPdf(document)}
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
                  预览草稿
                </>
              )}
            </Button>
            <Button
              type='button'
              size='sm'
              className='h-8 text-xs'
              onClick={() => onContinueSeal(document.id)}
            >
              <i className='ri-award-line mr-1.5' />
              继续盖章
            </Button>
          </>
        ) : (
          <>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={() => onPreviewPdf(document)}
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
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 text-xs'
              onClick={() => onDownloadPdf(document)}
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
          </>
        )}
      </div>
    </article>
  )
}
