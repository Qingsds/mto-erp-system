/**
 * 印章列表内容区。
 *
 * 统一承载：
 * - 页面内错误提示
 * - loading skeleton
 * - 空状态
 * - 卡片网格
 */

import { Button } from "@/components/ui/button"
import type { SealListItem } from "@/hooks/api/useSeals"
import { SealCard } from "./SealCard"

interface SealsListContentProps {
  seals: SealListItem[]
  isLoading: boolean
  actionError: string | null
  queryError: unknown
  isMobile?: boolean
  onClearActionError: () => void
  onOpenCreate: () => void
  onToggleStatus: (seal: SealListItem) => void
  onOpenLogs: (seal: SealListItem) => void
  isUpdatingSeal: (sealId: number) => boolean
  resolveQueryError: () => string
}

export function SealsListContent({
  seals,
  isLoading,
  actionError,
  queryError,
  isMobile = false,
  onClearActionError,
  onOpenCreate,
  onToggleStatus,
  onOpenLogs,
  isUpdatingSeal,
  resolveQueryError,
}: SealsListContentProps) {
  return (
    <div className='flex flex-col gap-3'>
      {Boolean(actionError || queryError) && (
        <section className='border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-medium'>操作异常</p>
              <p className='mt-1 text-xs text-destructive/80'>
                {actionError ?? resolveQueryError()}
              </p>
            </div>
            {actionError && (
              <button
                type='button'
                className='shrink-0 text-destructive/70 transition-colors hover:text-destructive'
                onClick={onClearActionError}
              >
                <i className='ri-close-line text-base' />
              </button>
            )}
          </div>
        </section>
      )}

      {isLoading ? (
        <section className={isMobile ? "flex flex-col gap-3" : "grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3"}>
          {Array.from({ length: isMobile ? 5 : 6 }).map((_, index) => (
            <div
              key={index}
              className='h-[188px] border border-border bg-card animate-pulse'
            />
          ))}
        </section>
      ) : seals.length === 0 ? (
        <section className='flex flex-col items-center justify-center border border-dashed border-border bg-card px-5 py-14 text-center'>
          <i className='ri-award-line mb-3 text-3xl text-muted-foreground/40' />
          <p className='text-sm font-medium text-foreground'>暂无印章资产</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            先上传 PNG 透明底图并注册印章，后续才能用于订单、发货单和对账单盖章。
          </p>
          <Button
            className={isMobile ? "mt-4 h-10 w-full" : "mt-4 h-9"}
            onClick={onOpenCreate}
          >
            <i className='ri-upload-cloud-2-line mr-1.5' />
            注册印章
          </Button>
        </section>
      ) : (
        <section className={isMobile ? "flex flex-col gap-3" : "grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3"}>
          {seals.map(seal => (
            <SealCard
              key={seal.id}
              seal={seal}
              isPending={isUpdatingSeal(seal.id)}
              onToggleStatus={onToggleStatus}
              onOpenLogs={onOpenLogs}
            />
          ))}
        </section>
      )}
    </div>
  )
}
