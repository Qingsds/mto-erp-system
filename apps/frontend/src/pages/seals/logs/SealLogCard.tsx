/**
 * 单条印章使用记录卡片。
 */

import { Button } from "@/components/ui/button"
import type { SealUsageLogItem } from "@/hooks/api/useSeals"
import { buildDocumentFileUrl } from "@/hooks/api/useDocuments"
import { formatSealTarget } from "../shared"

interface SealLogCardProps {
  log: SealUsageLogItem
  onOpenTarget: (log: SealUsageLogItem) => void
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  })
}

export function SealLogCard({
  log,
  onOpenTarget,
}: SealLogCardProps) {
  return (
    <article className='border border-border bg-card px-4 py-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-foreground'>
            {formatSealTarget(log.targetType, log.targetId)}
          </p>
          <p className='mt-1 text-[11px] text-muted-foreground'>
            {formatDateTime(log.actionTime)}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          {log.targetType && log.targetId && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-2.5 text-xs'
              onClick={() => onOpenTarget(log)}
            >
              <i className='ri-external-link-line mr-1.5' />
              查看单据
            </Button>
          )}
          <Button
            asChild
            size='sm'
            variant='outline'
            className='h-8 px-2.5 text-xs'
          >
            <a href={buildDocumentFileUrl(log.document.id)}>
              <i className='ri-download-2-line mr-1.5' />
              下载文档
            </a>
          </Button>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4'>
        <div>
          <p>操作人</p>
          <p className='mt-1 text-foreground'>
            {log.user.realName}（{log.user.username}）
          </p>
        </div>
        <div>
          <p>文档文件</p>
          <p className='mt-1 break-all text-foreground'>{log.document.fileName}</p>
        </div>
        <div>
          <p>文档状态</p>
          <p className='mt-1 text-foreground'>{log.document.status}</p>
        </div>
        <div>
          <p>来源 IP</p>
          <p className='mt-1 text-foreground'>{log.ipAddress || "-"}</p>
        </div>
      </div>
    </article>
  )
}
