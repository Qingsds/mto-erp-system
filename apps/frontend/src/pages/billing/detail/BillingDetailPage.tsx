/**
 * 对账详情页容器。
 *
 * 负责：
 * - 拉取单张对账单详情
 * - 聚合摘要数据
 * - 编排盖章 / 结清动作
 * - 切换桌面端 / 移动端视图
 */

import { useMemo } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { useGetBillingDetail, useUpdateBillingStatus } from "@/hooks/api/useBilling"
import { BillingDetailDesktop } from "./BillingDetailDesktop"
import { BillingDetailMobile } from "./BillingDetailMobile"
import { BillingDetailMobileActions } from "./BillingDetailMobileActions"
import { BillingDetailToolbar } from "./BillingDetailToolbar"
import { buildBillingDetailStats } from "./types"
import { useBillingDetailDownloads } from "./useBillingDetailDownloads"

export function BillingDetailPage() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const billingId = Number(params.id)

  const {
    data: billing,
    isLoading,
    isFetching,
  } = useGetBillingDetail(Number.isFinite(billingId) ? billingId : undefined)
  const updateStatus = useUpdateBillingStatus()

  const stats = useMemo(
    () => (billing ? buildBillingDetailStats(billing) : null),
    [billing],
  )
  const latestDocument = billing?.documents[0] ?? null
  const {
    actionError,
    isExportingExcel,
    downloadingDocumentId,
    exportExcel,
    downloadPdf,
    clearActionError,
  } = useBillingDetailDownloads(billing)

  const handleMarkPaid = async () => {
    if (!billing || billing.status !== "SEALED") return
    clearActionError()
    await updateStatus.mutateAsync({ id: billing.id, status: "PAID" })
  }

  const handleOpenDelivery = (deliveryId: number) => {
    navigate({
      to: "/deliveries/$id",
      params: { id: String(deliveryId) },
    })
  }

  if (isLoading) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <div className='h-14 border-b border-border bg-background' />
        <div className='flex-1 overflow-auto p-4 sm:p-6 lg:p-8'>
          <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className='h-24 bg-muted animate-pulse'
              />
            ))}
          </div>
          <div className='mt-4 h-72 bg-muted animate-pulse' />
        </div>
      </div>
    )
  }

  if (!billing || !stats) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>对账单不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/billing" })}
        >
          返回对账列表
        </Button>
      </div>
    )
  }

  const canSeal = billing.status === "DRAFT"
  const canMarkPaid = billing.status === "SEALED"
  const canDownloadPdf = billing.status !== "DRAFT" && !!latestDocument
  const desktopActions = !isMobile && (
    <>
      <Button
        size='sm'
        variant='outline'
        className='h-8 px-2.5 text-xs'
        onClick={() => void exportExcel()}
        disabled={isExportingExcel}
      >
        {isExportingExcel ? (
          <>
            <i className='ri-loader-4-line mr-1.5 animate-spin' />
            导出中…
          </>
        ) : (
          <>
            <i className='ri-file-excel-2-line mr-1.5' />
            下载 Excel
          </>
        )}
      </Button>
      {billing.status !== "DRAFT" && (
        <Button
          size='sm'
          variant='outline'
          className='h-8 px-2.5 text-xs'
          onClick={() => latestDocument && void downloadPdf(latestDocument)}
          disabled={!canDownloadPdf || downloadingDocumentId === latestDocument?.id}
        >
          {downloadingDocumentId === latestDocument?.id ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              下载中…
            </>
          ) : (
            <>
              <i className='ri-file-pdf-line mr-1.5' />
              下载 PDF
            </>
          )}
        </Button>
      )}
      {canSeal && (
        <Button
          size='sm'
          className='h-8 px-2.5 text-xs'
          onClick={() => {
            clearActionError()
            navigate({
              to: "/billing/$id/seal",
              params: { id: String(billing.id) },
            })
          }}
        >
          <i className='ri-award-line mr-1.5' />
          盖章归档
        </Button>
      )}
      {canMarkPaid && (
        <Button
          size='sm'
          className='h-8 px-2.5 text-xs'
          onClick={() => void handleMarkPaid()}
          disabled={updateStatus.isPending}
        >
          {updateStatus.isPending ? (
            <>
              <i className='ri-loader-4-line mr-1.5 animate-spin' />
              结清中…
            </>
          ) : (
            <>
              <i className='ri-check-double-line mr-1.5' />
              标记已结清
            </>
          )}
        </Button>
      )}
    </>
  )

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <BillingDetailToolbar
        billing={billing}
        onBack={() => navigate({ to: "/billing" })}
        actions={desktopActions}
      />

      <PageContentWrapper withMobileBottomInset={isMobile}>
        {actionError && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive sm:px-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-medium'>操作失败</p>
                <p className='mt-1 text-xs text-destructive/80'>
                  {actionError}
                </p>
              </div>
              <button
                type='button'
                className='shrink-0 text-destructive/70 transition-colors hover:text-destructive'
                onClick={clearActionError}
              >
                <i className='ri-close-line text-base' />
              </button>
            </div>
          </div>
        )}

        {isMobile ? (
          <BillingDetailMobile
            billing={billing}
            stats={stats}
            isFetching={isFetching}
            downloadingDocumentId={downloadingDocumentId}
            onDownloadPdf={document => void downloadPdf(document)}
            onOpenDelivery={handleOpenDelivery}
          />
        ) : (
          <BillingDetailDesktop
            billing={billing}
            stats={stats}
            isFetching={isFetching}
            downloadingDocumentId={downloadingDocumentId}
            onDownloadPdf={document => void downloadPdf(document)}
            onOpenDelivery={handleOpenDelivery}
          />
        )}
      </PageContentWrapper>

      {isMobile && (
        <BillingDetailMobileActions
          status={billing.status}
          stats={stats}
          canDownloadPdf={canDownloadPdf}
          isExportingExcel={isExportingExcel}
          isDownloadingPdf={downloadingDocumentId === latestDocument?.id}
          isSubmitting={updateStatus.isPending}
          onDownloadExcel={() => void exportExcel()}
          onDownloadPdf={() => latestDocument && void downloadPdf(latestDocument)}
          onOpenSeal={() => {
            clearActionError()
          }}
          isSealDisabledOnMobile
          onMarkPaid={() => void handleMarkPaid()}
        />
      )}
    </div>
  )
}
