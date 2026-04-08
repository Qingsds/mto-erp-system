/**
 * 印章管理桌面端列表。
 *
 * 使用与其他列表页一致的：
 * - 顶部标题区
 * - 右侧主操作
 * - 下方滚动卡片列表
 */

import { Button } from "@/components/ui/button"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import type { useSealsPageController } from "./useSealsPageController"
import { SealsListContent } from "./SealsListContent"

type SealsPageController = ReturnType<typeof useSealsPageController>

interface SealsDesktopProps {
  controller: SealsPageController
}

export function SealsDesktop({ controller }: SealsDesktopProps) {
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
    <TopLevelPageWrapper fillHeight>
      <div className='flex flex-1 flex-col overflow-hidden'>
        <TopLevelPageHeaderWrapper
          bodyClassName='items-end justify-between'
          padding='desktop'
        >
          <TopLevelPageTitle
            title='印章管理'
            subtitle={subtitle}
          />

          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                void handleReprocessExisting()
              }}
              disabled={isReprocessingExisting || seals.length === 0}
            >
              {isReprocessingExisting ? (
                <>
                  <i className='ri-loader-4-line mr-1.5 animate-spin' />
                  补处理中…
                </>
              ) : (
                <>
                  <i className='ri-refresh-line mr-1.5' />
                  补处理历史印章
                </>
              )}
            </Button>
            <Button
              size='sm'
              onClick={openCreate}
            >
              <i className='ri-add-line mr-1.5' />
              注册印章
            </Button>
          </div>
        </TopLevelPageHeaderWrapper>

        <div className='flex-1 overflow-y-auto py-4'>
          <SealsListContent
            seals={seals}
            isLoading={isLoading}
            actionError={actionError}
            queryError={queryError}
            onClearActionError={clearActionError}
            onOpenCreate={openCreate}
            onToggleStatus={handleToggleStatus}
            onOpenLogs={handleOpenLogs}
            isUpdatingSeal={isUpdatingSeal}
            resolveQueryError={resolveQueryError}
          />
        </div>
      </div>
    </TopLevelPageWrapper>
  )
}
