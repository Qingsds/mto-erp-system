/**
 * 通用签章工作台侧栏。
 *
 * 负责：
 * - 选择印章
 * - 切换页码
 * - 调整印章宽度
 * - 展示提交与错误状态
 */

import type { SealListItem } from "@/hooks/api/useSeals"
import { Button } from "@/components/ui/button"
import { type SealPlacement } from "./types"

const SEAL_SIZE_OPTIONS = [
  { label: "小", value: 0.12 },
  { label: "偏小", value: 0.15 },
  { label: "标准", value: 0.18 },
  { label: "偏大", value: 0.2 },
  { label: "大", value: 0.24 },
] as const

interface SealWorkbenchSidebarProps {
  title: string
  subtitle: string
  seals: SealListItem[]
  selectedSealId: number | null
  placement: SealPlacement
  pageCount: number
  actionError: string | null
  isSubmitting: boolean
  isPreviewLoading: boolean
  requirePageConfirmation?: boolean
  isCurrentPageConfirmed?: boolean
  isCurrentPageSkipped?: boolean
  confirmedPageCount?: number
  skippedPageCount?: number
  processedPageCount?: number
  allPagesConfirmed?: boolean
  submitLabel: string
  submitLoadingLabel: string
  enableSeamSeal?: boolean
  seamSealEnabled?: boolean
  onSelectSeal: (sealId: number) => void
  onPageChange: (pageIndex: number) => void
  onPlacementChange: (placement: SealPlacement) => void
  onConfirmCurrentPage?: () => void
  onSkipCurrentPage?: () => void
  onSeamSealEnabledChange?: (enabled: boolean) => void
  onSubmit: () => void
}

export function SealWorkbenchSidebar({
  title,
  subtitle,
  seals,
  selectedSealId,
  placement,
  pageCount,
  actionError,
  isSubmitting,
  isPreviewLoading,
  requirePageConfirmation = false,
  isCurrentPageConfirmed = false,
  isCurrentPageSkipped = false,
  confirmedPageCount = 0,
  skippedPageCount = 0,
  processedPageCount = confirmedPageCount,
  allPagesConfirmed = true,
  submitLabel,
  submitLoadingLabel,
  enableSeamSeal = false,
  seamSealEnabled = false,
  onSelectSeal,
  onPageChange,
  onPlacementChange,
  onConfirmCurrentPage,
  onSkipCurrentPage,
  onSeamSealEnabledChange,
  onSubmit,
}: SealWorkbenchSidebarProps) {
  const commitWidthRatio = (value: number) => {
    onPlacementChange({
      ...placement,
      widthRatio: value,
    })
  }

  return (
    <aside className='flex h-full flex-col border border-border bg-card'>
      <div className='border-b border-border px-4 py-3'>
        <h2 className='text-sm font-semibold'>{title}</h2>
        <p className='mt-1 text-xs text-muted-foreground'>{subtitle}</p>
      </div>

      <div className='flex flex-1 flex-col gap-4 overflow-auto px-4 py-4'>
        {actionError && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {actionError}
          </div>
        )}

        <section className='space-y-2'>
          <div>
            <h3 className='text-xs font-medium text-foreground'>选择印章</h3>
            <p className='mt-1 text-[11px] text-muted-foreground'>
              工作台只展示印章名称与缩略图，不显示内部文件键。
            </p>
          </div>

          {seals.length === 0 ? (
            <div className='border border-dashed border-border bg-muted/20 px-3 py-4 text-center'>
              <p className='text-sm'>暂无可用印章</p>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                请先到印章管理中注册并启用印章。
              </p>
            </div>
          ) : (
            <div className='space-y-2'>
              {seals.map(seal => (
                <button
                  key={seal.id}
                  type='button'
                  className={`w-full border px-3 py-2 text-left transition-colors ${
                    selectedSealId === seal.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/20"
                  }`}
                  onClick={() => onSelectSeal(seal.id)}
                >
                  <p className='text-sm font-medium'>{seal.name}</p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    可用于本次归档盖章
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className='space-y-3'>
          <div>
            <h3 className='text-xs font-medium text-foreground'>页码与大小</h3>
            <p className='mt-1 text-[11px] text-muted-foreground'>
              每一页会分别记住位置；宽度可在这里微调。
            </p>
          </div>

          <label className='flex flex-col gap-1.5'>
            <span className='text-[11px] text-muted-foreground'>盖章页码</span>
            <select
              className='h-10 border border-input bg-background px-3 text-sm'
              value={placement.pageIndex}
              onChange={event => onPageChange(Number(event.target.value))}
              disabled={pageCount <= 0 || isPreviewLoading}
            >
              {pageCount > 0 ? (
                Array.from({ length: pageCount }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>
                    第 {index + 1} 页
                  </option>
                ))
              ) : (
                <option value={1}>预览加载中</option>
              )}
            </select>
          </label>

          <div className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-[11px] text-muted-foreground'>印章大小</span>
              <span className='font-mono text-xs text-foreground'>
                {(placement.widthRatio * 100).toFixed(0)}%
              </span>
            </div>
            <div className='grid grid-cols-5 gap-1.5'>
              {SEAL_SIZE_OPTIONS.map(option => {
                const isSelected =
                  Math.abs(placement.widthRatio - option.value) < 0.005
                return (
                  <Button
                    key={option.value}
                    type='button'
                    variant={isSelected ? "default" : "outline"}
                    className='h-8 px-1 text-[11px]'
                    onClick={() => commitWidthRatio(option.value)}
                    disabled={!selectedSealId}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {requirePageConfirmation && (
            <div className='space-y-2 border-t border-border pt-3'>
              <div className='flex items-center justify-between gap-3 text-[11px] text-muted-foreground'>
                <span>
                  已处理 {processedPageCount}/{pageCount || 0} 页
                </span>
                <span>
                  当前页
                  {isCurrentPageConfirmed
                    ? "已确认"
                    : isCurrentPageSkipped
                      ? "已跳过"
                      : "未处理"}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant={isCurrentPageConfirmed ? "outline" : "default"}
                  className='h-9'
                  onClick={onConfirmCurrentPage}
                  disabled={!selectedSealId || pageCount <= 0 || isPreviewLoading}
                >
                  <i className='ri-check-line mr-1.5' />
                  确认本页
                </Button>
                <Button
                  type='button'
                  variant={isCurrentPageSkipped ? "default" : "outline"}
                  className='h-9'
                  onClick={onSkipCurrentPage}
                  disabled={pageCount <= 0 || isPreviewLoading}
                >
                  <i className='ri-skip-right-line mr-1.5' />
                  跳过本页
                </Button>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                已盖章 {confirmedPageCount} 页，已跳过 {skippedPageCount} 页。
              </p>
            </div>
          )}
        </section>

        {enableSeamSeal && (
          <section className='space-y-3 border-t border-border pt-4'>
            <label className='flex items-center justify-between gap-3'>
              <span className='text-xs font-medium text-foreground'>骑缝章</span>
              <input
                type='checkbox'
                className='h-4 w-4 accent-primary'
                checked={seamSealEnabled}
                onChange={event =>
                  onSeamSealEnabledChange?.(event.target.checked)
                }
              />
            </label>
            <p className='text-[11px] text-muted-foreground'>
              开启后按页数切片，固定盖在每页右侧。
            </p>
          </section>
        )}

        <section className='space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground'>
          <p>坐标模式：左上角为锚点，按相对页面尺寸保存。</p>
          <p>审计留痕：页码、X/Y 比例和宽度比例会一并写入盖章日志。</p>
        </section>
      </div>

      <div className='border-t border-border px-4 py-3'>
        <Button
          className='h-10 w-full'
          onClick={onSubmit}
          disabled={
            !selectedSealId ||
            isSubmitting ||
            seals.length === 0 ||
            (requirePageConfirmation && !allPagesConfirmed)
          }
        >
          {isSubmitting ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              {submitLoadingLabel}
            </>
          ) : (
            <>
              <i className='ri-award-line mr-1.5' />
              {submitLabel}
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
