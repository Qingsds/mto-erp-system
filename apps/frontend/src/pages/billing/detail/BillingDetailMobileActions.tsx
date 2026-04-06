/**
 * 对账详情页移动端底部操作栏。
 *
 * 只保留当前状态允许的主动作，避免移动端底部按钮过载。
 */

import { Button } from "@/components/ui/button"
import { MobileActionBar } from "@/components/common/MobileActionBar"
import type { BillingDetailStats } from "./types"

interface BillingDetailMobileActionsProps {
  status: "DRAFT" | "SEALED" | "PAID"
  stats: BillingDetailStats
  canDownloadPdf: boolean
  isSealDisabledOnMobile?: boolean
  isExportingExcel: boolean
  isDownloadingPdf: boolean
  isSubmitting: boolean
  onDownloadExcel: () => void
  onDownloadPdf: () => void
  onOpenSeal: () => void
  onMarkPaid: () => void
}

export function BillingDetailMobileActions({
  status,
  stats,
  canDownloadPdf,
  isSealDisabledOnMobile = false,
  isExportingExcel,
  isDownloadingPdf,
  isSubmitting,
  onDownloadExcel,
  onDownloadPdf,
  onOpenSeal,
  onMarkPaid,
}: BillingDetailMobileActionsProps) {
  const summary = (
    <div className='flex items-center justify-between gap-3 text-xs'>
      <span className='text-muted-foreground'>
        发货 {stats.linkedItemCount} 项 / 附加 {stats.extraItemCount} 项
      </span>
      <span className='font-mono font-semibold text-foreground'>
        ¥{stats.totalAmount.toLocaleString("zh-CN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    </div>
  )

  if (status === "PAID") {
    return (
      <MobileActionBar summary={summary} actionsClassName='flex-wrap'>
        <Button
          className='h-10 min-w-0 basis-[calc(50%-4px)]'
          variant='outline'
          onClick={onDownloadExcel}
          disabled={isExportingExcel}
        >
          {isExportingExcel ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin shrink-0' />
              Excel…
            </>
          ) : (
            <>
              <i className='ri-file-excel-2-line mr-1.5 shrink-0' />
              下载 Excel
            </>
          )}
        </Button>
        <Button
          className='h-10 min-w-0 basis-[calc(50%-4px)]'
          variant='outline'
          onClick={onDownloadPdf}
          disabled={!canDownloadPdf || isDownloadingPdf}
        >
          {isDownloadingPdf ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin shrink-0' />
              PDF…
            </>
          ) : (
            <>
              <i className='ri-file-pdf-line mr-1.5 shrink-0' />
              下载 PDF
            </>
          )}
        </Button>
      </MobileActionBar>
    )
  }

  return (
    <MobileActionBar summary={summary} actionsClassName='flex-wrap'>
      <Button
        className='h-10 min-w-0 basis-[calc(50%-4px)]'
        variant='outline'
        onClick={onDownloadExcel}
        disabled={isExportingExcel}
      >
        {isExportingExcel ? (
          <>
            <i className='ri-loader-4-line mr-1.5 animate-spin shrink-0' />
            Excel…
          </>
        ) : (
          <>
            <i className='ri-file-excel-2-line mr-1.5 shrink-0' />
            下载 Excel
          </>
        )}
      </Button>
      {canDownloadPdf && (
        <Button
          className='h-10 min-w-0 basis-[calc(50%-4px)]'
          variant='outline'
          onClick={onDownloadPdf}
          disabled={isDownloadingPdf}
        >
          {isDownloadingPdf ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin shrink-0' />
              PDF…
            </>
          ) : (
            <>
              <i className='ri-file-pdf-line mr-1.5 shrink-0' />
              下载 PDF
            </>
          )}
        </Button>
      )}
      {status === "DRAFT" ? (
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <Button
            className='h-10 min-w-0 w-full'
            onClick={onOpenSeal}
            disabled={isSealDisabledOnMobile}
          >
            <i className='ri-award-line mr-1.5 shrink-0' />
            <span className='truncate'>
              {isSealDisabledOnMobile ? "仅桌面端支持盖章" : "盖章归档"}
            </span>
          </Button>
          {isSealDisabledOnMobile && (
            <p className='text-[11px] text-muted-foreground'>
              请在桌面端进入盖章工作台完成 PDF 归档。
            </p>
          )}
        </div>
      ) : (
        <Button
          className='h-10 min-w-0 flex-1'
          onClick={onMarkPaid}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin shrink-0' />
              <span className='truncate'>结清中…</span>
            </>
          ) : (
            <>
              <i className='ri-check-double-line mr-1.5 shrink-0' />
              <span className='truncate'>标记已结清</span>
            </>
          )}
        </Button>
      )}
    </MobileActionBar>
  )
}
