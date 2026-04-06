/**
 * 对账单盖章工作台页。
 *
 * 负责：
 * - 桌面端真实 PNG 压 PDF 的交互编排
 * - 预览原始 PDF 并选择页码
 * - 选择印章、拖拽定位、提交归档
 */

import { useMemo, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { BillingStatusBadge } from "../list/BillingStatusBadge"
import { useGetBillingDetail, formatBillingNo } from "@/hooks/api/useBilling"
import { useExecuteSeal, useGetSeals, useSealPreviewUrl } from "@/hooks/api/useSeals"
import { useUIStore } from "@/store/ui.store"
import { BillingSealCanvas } from "./BillingSealCanvas"
import { BillingSealSidebar } from "./BillingSealSidebar"
import {
  DEFAULT_BILLING_SEAL_PLACEMENT,
  type BillingSealPlacement,
} from "./types"
import { useBillingSealPreview } from "./useBillingSealPreview"

export function BillingSealPage() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const billingId = Number(params.id)
  const [pageCount, setPageCount] = useState(0)
  const [manualSealId, setManualSealId] = useState<number | null>(null)
  const [placement, setPlacement] = useState<BillingSealPlacement>(
    DEFAULT_BILLING_SEAL_PLACEMENT,
  )
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: billing, isLoading } = useGetBillingDetail(
    Number.isFinite(billingId) ? billingId : undefined,
  )
  const { data: seals = [] } = useGetSeals()
  const executeSeal = useExecuteSeal()
  const preview = useBillingSealPreview(Number.isFinite(billingId) ? billingId : undefined)
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
  const effectivePlacement = useMemo(
    () => ({
      ...placement,
      pageIndex:
        pageCount > 0 ? Math.min(placement.pageIndex, pageCount) : placement.pageIndex,
    }),
    [pageCount, placement],
  )
  const sealPreview = useSealPreviewUrl(selectedSealId ?? undefined, selectedSeal?.fileKey)
  const resolvedActionError = actionError ?? preview.error ?? sealPreview.previewError

  const backToDetail = () =>
    navigate({
      to: "/billing/$id",
      params: { id: String(billingId) },
    })

  const handleSubmit = async () => {
    if (!billing || !selectedSealId) return

    try {
      setActionError(null)
      await executeSeal.mutateAsync({
        targetType: "BILLING",
        targetId: billing.id,
        sealId: selectedSealId,
        pageIndex: effectivePlacement.pageIndex,
        xRatio: effectivePlacement.xRatio,
        yRatio: effectivePlacement.yRatio,
        widthRatio: effectivePlacement.widthRatio,
      })
      backToDetail()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "盖章归档失败")
    }
  }

  if (isLoading) {
    return (
      <div className='flex flex-1 items-center justify-center text-sm text-muted-foreground'>
        <i className='ri-loader-4-line mr-2 animate-spin' />
        正在加载对账单…
      </div>
    )
  }

  if (!billing) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>对账单不存在或已删除</p>
        <Button variant='outline' size='sm' onClick={backToDetail}>
          返回对账详情
        </Button>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <DetailPageToolbar
          title={`${formatBillingNo(billing.id)} 盖章归档`}
          subtitle={billing.customerName}
          backLabel='返回详情'
          onBack={backToDetail}
          meta={<BillingStatusBadge status={billing.status} />}
        />
        <div className='flex flex-1 items-center justify-center px-4'>
          <div className='w-full max-w-md border border-border bg-card px-5 py-6 text-center'>
            <i className='ri-computer-line text-3xl text-muted-foreground/60' />
            <p className='mt-3 text-sm font-medium'>移动端暂不支持拖拽盖章</p>
            <p className='mt-2 text-xs text-muted-foreground'>
              请在桌面端进入当前对账单详情页，再执行盖章归档。
            </p>
            <Button className='mt-4 h-9 w-full' variant='outline' onClick={backToDetail}>
              返回对账详情
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (billing.status !== "DRAFT") {
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <DetailPageToolbar
          title={`${formatBillingNo(billing.id)} 盖章归档`}
          subtitle={billing.customerName}
          backLabel='返回详情'
          onBack={backToDetail}
          meta={<BillingStatusBadge status={billing.status} />}
        />
        <div className='flex flex-1 items-center justify-center px-4'>
          <div className='w-full max-w-md border border-border bg-card px-5 py-6 text-center'>
            <i className='ri-information-line text-3xl text-muted-foreground/60' />
            <p className='mt-3 text-sm font-medium'>当前状态不可再次盖章</p>
            <p className='mt-2 text-xs text-muted-foreground'>
              只有草稿状态的对账单允许进入盖章归档工作台。
            </p>
            <Button className='mt-4 h-9 w-full' variant='outline' onClick={backToDetail}>
              返回对账详情
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <DetailPageToolbar
        title={`${formatBillingNo(billing.id)} 盖章归档`}
        subtitle={billing.customerName}
        backLabel='返回详情'
        onBack={backToDetail}
        meta={<BillingStatusBadge status={billing.status} />}
        actions={
          <Button
            size='sm'
            className='h-8 px-2.5 text-xs'
            onClick={() => void handleSubmit()}
            disabled={!selectedSealId || executeSeal.isPending}
          >
            {executeSeal.isPending ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                归档中…
              </>
            ) : (
              <>
                <i className='ri-award-line mr-1.5' />
                确认盖章
              </>
            )}
          </Button>
        }
      />

      <PageContentWrapper className='max-w-none'>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]'>
          <BillingSealCanvas
            pdfBytes={preview.pdfBytes}
            pageIndex={effectivePlacement.pageIndex}
            placement={effectivePlacement}
            sealPreviewUrl={sealPreview.previewUrl}
            sealName={selectedSeal?.name ?? null}
            onPlacementChange={nextPlacement => {
              setActionError(null)
              setPlacement(nextPlacement)
            }}
            onPageCountChange={setPageCount}
          />

          <BillingSealSidebar
            billing={billing}
            seals={activeSeals}
            selectedSealId={selectedSealId}
            placement={effectivePlacement}
            pageCount={pageCount}
            actionError={resolvedActionError}
            isSubmitting={executeSeal.isPending}
            isPreviewLoading={preview.isLoading || preview.isFetching}
            onSelectSeal={sealId => {
              setActionError(null)
              setManualSealId(sealId)
            }}
            onPlacementChange={nextPlacement => {
              setActionError(null)
              setPlacement(nextPlacement)
            }}
            onSubmit={() => void handleSubmit()}
          />
        </div>
      </PageContentWrapper>
    </div>
  )
}
