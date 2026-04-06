/**
 * 对账单盖章工作台侧栏。
 *
 * 负责：
 * - 选择印章
 * - 切换页码
 * - 调整印章宽度
 * - 展示提交与错误状态
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import type { SealListItem } from "@/hooks/api/useSeals"
import { Button } from "@/components/ui/button"
import { formatBillingNo } from "@/hooks/api/useBilling"
import {
  MAX_BILLING_SEAL_WIDTH_RATIO,
  MIN_BILLING_SEAL_WIDTH_RATIO,
  type BillingSealPlacement,
} from "./types"

interface BillingSealSidebarProps {
  billing: BillingDetail
  seals: SealListItem[]
  selectedSealId: number | null
  placement: BillingSealPlacement
  pageCount: number
  actionError: string | null
  isSubmitting: boolean
  isPreviewLoading: boolean
  onSelectSeal: (sealId: number) => void
  onPlacementChange: (placement: BillingSealPlacement) => void
  onSubmit: () => void
}

export function BillingSealSidebar({
  billing,
  seals,
  selectedSealId,
  placement,
  pageCount,
  actionError,
  isSubmitting,
  isPreviewLoading,
  onSelectSeal,
  onPlacementChange,
  onSubmit,
}: BillingSealSidebarProps) {
  return (
    <aside className='flex h-full flex-col border border-border bg-card'>
      <div className='border-b border-border px-4 py-3'>
        <h2 className='text-sm font-semibold'>盖章设置</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          {formatBillingNo(billing.id)} · {billing.customerName}
        </p>
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
              本轮不展示文件键，只保留业务需要的印章名称。
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
              先切页，再拖动印章定位；宽度可在这里微调。
            </p>
          </div>

          <label className='flex flex-col gap-1.5'>
            <span className='text-[11px] text-muted-foreground'>盖章页码</span>
            <select
              className='h-10 border border-input bg-background px-3 text-sm'
              value={placement.pageIndex}
              onChange={event =>
                onPlacementChange({
                  ...placement,
                  pageIndex: Number(event.target.value),
                })
              }
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

          <label className='flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-3'>
              <span className='text-[11px] text-muted-foreground'>印章宽度</span>
              <span className='font-mono text-xs text-foreground'>
                {(placement.widthRatio * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type='range'
              min={MIN_BILLING_SEAL_WIDTH_RATIO}
              max={MAX_BILLING_SEAL_WIDTH_RATIO}
              step={0.01}
              value={placement.widthRatio}
              onChange={event =>
                onPlacementChange({
                  ...placement,
                  widthRatio: Number(event.target.value),
                })
              }
              disabled={!selectedSealId}
            />
          </label>
        </section>

        <section className='space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground'>
          <p>坐标模式：左上角为锚点，按相对页面尺寸保存。</p>
          <p>审计留痕：页码、X/Y 比例和宽度比例会一并写入盖章日志。</p>
        </section>
      </div>

      <div className='border-t border-border px-4 py-3'>
        <Button
          className='h-10 w-full'
          onClick={onSubmit}
          disabled={!selectedSealId || isSubmitting || seals.length === 0}
        >
          {isSubmitting ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              盖章归档中…
            </>
          ) : (
            <>
              <i className='ri-award-line mr-1.5' />
              确认盖章归档
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
