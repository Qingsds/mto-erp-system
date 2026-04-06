/**
 * 印章管理移动端列表。
 *
 * 保持与其他移动端列表页一致的：
 * - 顶部紧凑标题栏
 * - 单列卡片
 * - 顶部主操作
 */

import { Button } from "@/components/ui/button"
import type { useSealsPageController } from "./useSealsPageController"
import { SealsListContent } from "./SealsListContent"

type SealsPageController = ReturnType<typeof useSealsPageController>

interface SealsMobileProps {
  controller: SealsPageController
}

export function SealsMobile({ controller }: SealsMobileProps) {
  const {
    seals,
    isLoading,
    subtitle,
    actionError,
    queryError,
    clearActionError,
    openCreate,
    handleToggleStatus,
    handleOpenLogs,
    isUpdatingSeal,
    resolveQueryError,
  } = controller

  return (
    <div className='flex h-full flex-col'>
      <div className='shrink-0 border-b border-border bg-background px-4 pb-3 pt-4'>
        <div className='flex items-end justify-between gap-3'>
          <div className='min-w-0'>
            <h1 className='text-base font-semibold leading-none text-foreground'>
              印章管理
            </h1>
            <p className='mt-1 text-xs text-muted-foreground'>
              {subtitle}
            </p>
          </div>
          <Button size='sm' className='h-8 shrink-0' onClick={openCreate}>
            <i className='ri-add-line mr-1' />
            注册
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-4 py-3'>
        <SealsListContent
          seals={seals}
          isLoading={isLoading}
          actionError={actionError}
          queryError={queryError}
          isMobile
          onClearActionError={clearActionError}
          onOpenCreate={openCreate}
          onToggleStatus={handleToggleStatus}
          onOpenLogs={handleOpenLogs}
          isUpdatingSeal={isUpdatingSeal}
          resolveQueryError={resolveQueryError}
        />
      </div>
    </div>
  )
}
