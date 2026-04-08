/**
 * 印章管理移动端列表。
 *
 * 保持与其他移动端列表页一致的：
 * - 顶部紧凑标题栏
 * - 单列卡片
 * - 顶部主操作
 */

import { Button } from "@/components/ui/button"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
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
    handleReprocessExisting,
    handleToggleStatus,
    handleOpenLogs,
    isUpdatingSeal,
    isReprocessingExisting,
    resolveQueryError,
  } = controller

  return (
    <div className='flex h-full flex-col'>
      <TopLevelPageHeaderWrapper
        inset='page'
        bodyClassName='items-end justify-between'
        padding='mobile'
      >
        <TopLevelPageTitle
          title='印章管理'
          subtitle={subtitle}
          titleClassName='text-base'
        />
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            className='h-8 px-2'
            onClick={() => {
              void handleReprocessExisting()
            }}
            disabled={isReprocessingExisting || seals.length === 0}
          >
            {isReprocessingExisting ? (
              <i className='ri-loader-4-line animate-spin' />
            ) : (
              <i className='ri-refresh-line' />
            )}
          </Button>
          <Button size='sm' className='h-8 shrink-0' onClick={openCreate}>
            <i className='ri-add-line mr-1' />
            注册
          </Button>
        </div>
      </TopLevelPageHeaderWrapper>

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
