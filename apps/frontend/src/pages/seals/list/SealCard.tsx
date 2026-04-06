/**
 * 单张印章资产卡片。
 *
 * 统一承载：
 * - 缩略图预览
 * - 状态展示
 * - 启停操作
 * - 使用记录入口
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSealPreviewUrl, type SealListItem } from "@/hooks/api/useSeals"
import { SealStatusBadge } from "./SealStatusBadge"

interface SealCardProps {
  seal: SealListItem
  isPending: boolean
  onToggleStatus: (seal: SealListItem) => void
  onOpenLogs: (seal: SealListItem) => void
}

export function SealCard({
  seal,
  isPending,
  onToggleStatus,
  onOpenLogs,
}: SealCardProps) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const { previewUrl } = useSealPreviewUrl(seal.id, seal.fileKey)

  return (
    <article className='border border-border bg-card p-4'>
      <div className='flex items-start gap-3'>
        <div className='flex h-20 w-20 shrink-0 items-center justify-center border border-border bg-muted/30 p-2'>
          {previewFailed || !previewUrl ? (
            <div className='flex flex-col items-center gap-1 text-muted-foreground'>
              <i className='ri-image-line text-lg' />
              <span className='text-[11px]'>
                {previewFailed ? "预览失败" : "加载中"}
              </span>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt={seal.name}
              className='h-full w-full object-contain'
              loading='lazy'
              onError={() => setPreviewFailed(true)}
            />
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <h2 className='truncate text-sm font-medium'>{seal.name}</h2>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                印章 ID: {seal.id}
              </p>
            </div>
            <SealStatusBadge isActive={seal.isActive} />
          </div>

          <div className='mt-3 space-y-1.5 text-[11px] text-muted-foreground'>
            <p>
              {seal.originalFileKey
                ? "已保留原图与处理图，当前预览和盖章均使用清洗后的印章图"
                : "当前印章使用可预览的处理图，适合直接用于盖章归档"}
            </p>
            <p>{seal.isActive ? "可用于新的盖章归档" : "已停用，不能继续盖章"}</p>
          </div>
        </div>
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-8 px-2.5 text-xs'
          onClick={() => onOpenLogs(seal)}
        >
          <i className='ri-time-line mr-1.5' />
          查看记录
        </Button>
        <Button
          type='button'
          size='sm'
          className='h-8 px-2.5 text-xs'
          variant={seal.isActive ? "outline" : "default"}
          disabled={isPending}
          onClick={() => onToggleStatus(seal)}
        >
          {isPending ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              提交中…
            </>
          ) : seal.isActive ? (
            <>
              <i className='ri-forbid-line mr-1.5' />
              停用
            </>
          ) : (
            <>
              <i className='ri-checkbox-circle-line mr-1.5' />
              启用
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
