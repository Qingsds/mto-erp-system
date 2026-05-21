/**
 * 通用签章工作台。
 *
 * 页面层只提供：
 * - 预览 PDF 数据
 * - 顶部标题与返回逻辑
 * - 最终提交动作
 *
 * 印章选择、页码切换、坐标编排与拖拽交互统一收口在这里。
 */

import { useCallback, useMemo, useState, type ReactNode } from "react"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { useGetSeals, useSealPreviewUrl } from "@/hooks/api/useSeals"
import { SealWorkbenchCanvas } from "./SealWorkbenchCanvas"
import { SealWorkbenchSidebar } from "./SealWorkbenchSidebar"
import {
  createDefaultSealPlacement,
  isSameSealPlacement,
  type SealPlacement,
} from "./types"

interface SealWorkbenchProps {
  shellVariant?: "detail" | "top-level"
  title: string
  subtitle: string
  backLabel: string
  onBack: () => void
  meta?: ReactNode
  sidebarTitle: string
  sidebarSubtitle: string
  previewBytes: Uint8Array | null
  isPreviewLoading: boolean
  previewError: string | null
  isSubmitting: boolean
  submitLabel?: string
  submitLoadingLabel?: string
  extraActions?: ReactNode
  onSubmit: (payload: {
    sealId: number
    placement: SealPlacement
    placements: SealPlacement[]
    seamSealEnabled: boolean
  }) => Promise<void>
  enableSeamSeal?: boolean
  defaultSeamSealEnabled?: boolean
  requirePageConfirmation?: boolean
}

export function SealWorkbench({
  shellVariant = "detail",
  title,
  subtitle,
  backLabel,
  onBack,
  meta,
  sidebarTitle,
  sidebarSubtitle,
  previewBytes,
  isPreviewLoading,
  previewError,
  isSubmitting,
  submitLabel = "确认盖章归档",
  submitLoadingLabel = "盖章归档中…",
  extraActions,
  onSubmit,
  enableSeamSeal = false,
  defaultSeamSealEnabled = false,
  requirePageConfirmation = false,
}: SealWorkbenchProps) {
  const { isMobile } = useUIStore()
  const [pageCount, setPageCount] = useState(0)
  const [manualSealId, setManualSealId] = useState<number | null>(
    null,
  )
  const [currentPageIndex, setCurrentPageIndex] = useState(1)
  const [placementsByPage, setPlacementsByPage] = useState<
    Record<number, SealPlacement>
  >({
    1: createDefaultSealPlacement(1),
  })
  const [actionError, setActionError] = useState<string | null>(null)
  const [seamSealEnabled, setSeamSealEnabled] = useState(
    defaultSeamSealEnabled,
  )
  const [confirmedPages, setConfirmedPages] = useState<Set<number>>(
    () => new Set(),
  )
  const [skippedPages, setSkippedPages] = useState<Set<number>>(
    () => new Set(),
  )

  const { data: seals = [] } = useGetSeals()
  const activeSeals = useMemo(
    () => seals.filter(seal => seal.isActive),
    [seals],
  )
  const selectedSeal = useMemo(
    () =>
      activeSeals.find(seal => seal.id === manualSealId) ??
      activeSeals[0] ??
      null,
    [activeSeals, manualSealId],
  )
  const selectedSealId = selectedSeal?.id ?? null

  const resolvedPageIndex =
    pageCount > 0
      ? Math.min(currentPageIndex, pageCount)
      : currentPageIndex

  const effectivePlacement = useMemo(() => {
    const basePlacement =
      placementsByPage[resolvedPageIndex] ??
      createDefaultSealPlacement(resolvedPageIndex)

    return {
      ...basePlacement,
      pageIndex: resolvedPageIndex,
    }
  }, [placementsByPage, resolvedPageIndex])

  const resolvedPageCount = Math.max(pageCount, resolvedPageIndex, 1)
  const confirmedPageCount = requirePageConfirmation
    ? Array.from(confirmedPages).filter(
        page => page >= 1 && page <= resolvedPageCount,
      ).length
    : resolvedPageCount
  const skippedPageCount = requirePageConfirmation
    ? Array.from(skippedPages).filter(
        page => page >= 1 && page <= resolvedPageCount,
      ).length
    : 0
  const processedPageCount = confirmedPageCount + skippedPageCount
  const allPagesConfirmed =
    !requirePageConfirmation || processedPageCount >= resolvedPageCount

  const handlePlacementChange = useCallback((nextPlacement: SealPlacement) => {
    const currentPlacement = placementsByPage[nextPlacement.pageIndex]
    if (currentPlacement && isSameSealPlacement(currentPlacement, nextPlacement)) {
      return
    }

    setActionError(null)
    setPlacementsByPage(currentPlacements => ({
      ...currentPlacements,
      [nextPlacement.pageIndex]: {
        ...nextPlacement,
      },
    }))

    setConfirmedPages(currentPages => {
      if (!currentPages.has(nextPlacement.pageIndex)) return currentPages
      const nextPages = new Set(currentPages)
      nextPages.delete(nextPlacement.pageIndex)
      return nextPages
    })
    setSkippedPages(currentPages => {
      if (!currentPages.has(nextPlacement.pageIndex)) return currentPages
      const nextPages = new Set(currentPages)
      nextPages.delete(nextPlacement.pageIndex)
      return nextPages
    })
  }, [placementsByPage])

  const handlePageChange = useCallback((pageIndex: number) => {
    setActionError(null)
    setCurrentPageIndex(pageIndex)
    setPlacementsByPage(currentPlacements => {
      if (currentPlacements[pageIndex]) {
        return currentPlacements
      }

      return {
        ...currentPlacements,
        [pageIndex]: createDefaultSealPlacement(pageIndex),
      }
    })
  }, [])

  const handlePageCountChange = useCallback((nextPageCount: number) => {
    setPageCount(currentPageCount =>
      currentPageCount === nextPageCount ? currentPageCount : nextPageCount,
    )
    setConfirmedPages(currentPages => {
      const nextPages = new Set<number>()
      currentPages.forEach(page => {
        if (page <= nextPageCount) nextPages.add(page)
      })
      return nextPages
    })
    setSkippedPages(currentPages => {
      const nextPages = new Set<number>()
      currentPages.forEach(page => {
        if (page <= nextPageCount) nextPages.add(page)
      })
      return nextPages
    })

    if (nextPageCount <= 0) {
      return
    }

    setPlacementsByPage(currentPlacements => {
      const currentKnownPages = Object.keys(currentPlacements).map(Number)
      const nextPageIndex = currentKnownPages.length > 0
        ? Math.min(Math.max(...currentKnownPages), nextPageCount)
        : 1
      if (currentPlacements[nextPageIndex]) {
        return currentPlacements
      }

      return {
        ...currentPlacements,
        [nextPageIndex]: createDefaultSealPlacement(nextPageIndex),
      }
    })
  }, [])

  const sealPreview = useSealPreviewUrl(
    selectedSealId ?? undefined,
    selectedSeal?.fileKey,
  )
  const resolvedActionError =
    actionError ?? previewError ?? sealPreview.previewError

  const handleConfirmCurrentPage = useCallback(() => {
    setActionError(null)
    setConfirmedPages(currentPages => {
      const nextPages = new Set(currentPages)
      nextPages.add(resolvedPageIndex)
      return nextPages
    })
    setSkippedPages(currentPages => {
      if (!currentPages.has(resolvedPageIndex)) return currentPages
      const nextPages = new Set(currentPages)
      nextPages.delete(resolvedPageIndex)
      return nextPages
    })
    setPlacementsByPage(currentPlacements => ({
      ...currentPlacements,
      [resolvedPageIndex]: effectivePlacement,
    }))

    if (resolvedPageIndex < resolvedPageCount) {
      handlePageChange(resolvedPageIndex + 1)
    }
  }, [effectivePlacement, handlePageChange, resolvedPageCount, resolvedPageIndex])

  const handleSkipCurrentPage = useCallback(() => {
    setActionError(null)
    setSkippedPages(currentPages => {
      const nextPages = new Set(currentPages)
      nextPages.add(resolvedPageIndex)
      return nextPages
    })
    setConfirmedPages(currentPages => {
      if (!currentPages.has(resolvedPageIndex)) return currentPages
      const nextPages = new Set(currentPages)
      nextPages.delete(resolvedPageIndex)
      return nextPages
    })

    if (resolvedPageIndex < resolvedPageCount) {
      handlePageChange(resolvedPageIndex + 1)
    }
  }, [handlePageChange, resolvedPageCount, resolvedPageIndex])

  const handleSubmit = useCallback(async () => {
    if (!selectedSealId) return

    try {
      setActionError(null)
      if (!allPagesConfirmed) {
        setActionError("请先逐页确认或跳过")
        return
      }
      const placements = Array.from({ length: resolvedPageCount })
        .map((_, index) => {
          const pageIndex = index + 1
          return (
            placementsByPage[pageIndex] ??
            createDefaultSealPlacement(pageIndex)
          )
        })
        .filter(placement => confirmedPages.has(placement.pageIndex))
      if (placements.length === 0 && !(enableSeamSeal && seamSealEnabled)) {
        setActionError("至少确认一页盖章，或开启骑缝章")
        return
      }
      await onSubmit({
        sealId: selectedSealId,
        placement: effectivePlacement,
        placements,
        seamSealEnabled: enableSeamSeal && seamSealEnabled,
      })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "盖章归档失败",
      )
    }
  }, [
    allPagesConfirmed,
    confirmedPages,
    effectivePlacement,
    enableSeamSeal,
    onSubmit,
    placementsByPage,
    resolvedPageCount,
    seamSealEnabled,
    selectedSealId,
  ])

  const desktopWorkbench = (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
      <SealWorkbenchCanvas
        pdfBytes={previewBytes}
        pageIndex={effectivePlacement.pageIndex}
        placement={effectivePlacement}
        sealPreviewUrl={sealPreview.previewUrl}
        sealName={selectedSeal?.name ?? null}
        onPlacementChange={handlePlacementChange}
        onPageCountChange={handlePageCountChange}
      />

      <SealWorkbenchSidebar
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        seals={activeSeals}
        selectedSealId={selectedSealId}
        placement={effectivePlacement}
        pageCount={pageCount}
        actionError={resolvedActionError}
        isSubmitting={isSubmitting}
        isPreviewLoading={isPreviewLoading}
        requirePageConfirmation={requirePageConfirmation}
        isCurrentPageConfirmed={confirmedPages.has(resolvedPageIndex)}
        isCurrentPageSkipped={skippedPages.has(resolvedPageIndex)}
        confirmedPageCount={confirmedPageCount}
        skippedPageCount={skippedPageCount}
        processedPageCount={processedPageCount}
        allPagesConfirmed={allPagesConfirmed}
        submitLabel={submitLabel}
        submitLoadingLabel={submitLoadingLabel}
        enableSeamSeal={enableSeamSeal}
        seamSealEnabled={seamSealEnabled}
        onSelectSeal={setManualSealId}
        onPageChange={handlePageChange}
        onPlacementChange={handlePlacementChange}
        onConfirmCurrentPage={handleConfirmCurrentPage}
        onSkipCurrentPage={handleSkipCurrentPage}
        onSeamSealEnabledChange={setSeamSealEnabled}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  )

  if (isMobile) {
    if (shellVariant === "top-level") {
      return (
        <TopLevelPageWrapper fillHeight>
          <div className='flex flex-1 flex-col overflow-hidden'>
            <TopLevelPageHeaderWrapper
              bodyClassName='flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
              padding='desktop'
            >
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <h1 className='truncate text-lg font-semibold leading-none tracking-tight text-foreground'>
                    {title}
                  </h1>
                  {meta}
                </div>
                <p className='mt-1 truncate text-xs text-muted-foreground'>
                  {subtitle}
                </p>
              </div>

              <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
                {extraActions}
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-10 shrink-0 sm:h-9'
                  onClick={onBack}
                >
                  <i className='ri-arrow-left-line mr-1.5' />
                  {backLabel}
                </Button>
              </div>
            </TopLevelPageHeaderWrapper>

            <div className='flex flex-1 items-center justify-center py-4'>
              <div className='w-full max-w-md border border-border bg-card px-5 py-6 text-center'>
                <i className='ri-computer-line text-3xl text-muted-foreground/60' />
                <p className='mt-3 text-sm font-medium'>
                  移动端暂不支持拖拽盖章
                </p>
                <p className='mt-2 text-xs text-muted-foreground'>
                  请在桌面端进入当前工作台，再执行盖章归档。
                </p>
                <Button
                  className='mt-4 h-9 w-full'
                  variant='outline'
                  onClick={onBack}
                >
                  返回上一页
                </Button>
              </div>
            </div>
          </div>
        </TopLevelPageWrapper>
      )
    }

    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <DetailPageToolbar
          title={title}
          subtitle={subtitle}
          backLabel={backLabel}
          onBack={onBack}
          meta={meta}
        />
        <div className='flex flex-1 items-center justify-center px-4'>
          <div className='w-full max-w-md border border-border bg-card px-5 py-6 text-center'>
            <i className='ri-computer-line text-3xl text-muted-foreground/60' />
            <p className='mt-3 text-sm font-medium'>
              移动端暂不支持拖拽盖章
            </p>
            <p className='mt-2 text-xs text-muted-foreground'>
              请在桌面端进入当前工作台，再执行盖章归档。
            </p>
            <Button
              className='mt-4 h-9 w-full'
              variant='outline'
              onClick={onBack}
            >
              返回上一页
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (shellVariant === "top-level") {
    return (
      <TopLevelPageWrapper fillHeight>
        <div className='flex flex-1 flex-col overflow-hidden'>
          <TopLevelPageHeaderWrapper
            bodyClassName='flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
            padding='desktop'
          >
            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='truncate text-lg font-semibold leading-none tracking-tight text-foreground'>
                  {title}
                </h1>
                {meta}
              </div>
              <p className='mt-1 truncate text-xs text-muted-foreground'>
                {subtitle}
              </p>
            </div>

            <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
              {extraActions}
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-10 shrink-0 sm:hidden'
                onClick={onBack}
              >
                <i className='ri-arrow-left-line mr-1.5' />
                {backLabel}
              </Button>
            </div>
          </TopLevelPageHeaderWrapper>

          <div className='flex-1 overflow-y-auto py-4'>
            {desktopWorkbench}
          </div>
        </div>
      </TopLevelPageWrapper>
    )
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <DetailPageToolbar
        title={title}
        subtitle={subtitle}
        backLabel={backLabel}
        onBack={onBack}
        meta={meta}
        actions={extraActions}
      />

      <PageContentWrapper className='max-w-none'>
        {desktopWorkbench}
      </PageContentWrapper>
    </div>
  )
}
