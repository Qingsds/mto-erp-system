/**
 * 对账单盖章工作台页。
 *
 * 现在只保留：
 * - 对账单数据读取与状态校验
 * - 向共享工作台提供预览源
 * - 提交 BILLING 目标的盖章动作
 */

import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { SealWorkbench } from "@/components/documents/seal-workbench/SealWorkbench"
import { formatBillingNo, useGetBillingDetail } from "@/hooks/api/useBilling"
import { useBillingSealPreview } from "@/hooks/api/useDocuments"
import { useExecuteSeal } from "@/hooks/api/useSeals"
import { BillingStatusBadge } from "../list/BillingStatusBadge"

export function BillingSealPage() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const billingId = Number(params.id)

  const { data: billing, isLoading } = useGetBillingDetail(
    Number.isFinite(billingId) ? billingId : undefined,
  )
  const preview = useBillingSealPreview(Number.isFinite(billingId) ? billingId : undefined)
  const executeSeal = useExecuteSeal()

  const backToDetail = () =>
    navigate({
      to: "/billing/$id",
      params: { id: String(billingId) },
    })

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
    <SealWorkbench
      title={`${formatBillingNo(billing.id)} 盖章归档`}
      subtitle={billing.customerName}
      backLabel='返回详情'
      onBack={backToDetail}
      meta={<BillingStatusBadge status={billing.status} />}
      sidebarTitle='盖章设置'
      sidebarSubtitle={`${formatBillingNo(billing.id)} · ${billing.customerName}`}
      previewBytes={preview.pdfBytes}
      isPreviewLoading={preview.isLoading || preview.isFetching}
      previewError={preview.error}
      isSubmitting={executeSeal.isPending}
      submitLabel='确认盖章'
      submitLoadingLabel='归档中…'
      onSubmit={async ({ sealId, placement }) => {
        await executeSeal.mutateAsync({
          targetType: "BILLING",
          targetId: billing.id,
          sealId,
          pageIndex: placement.pageIndex,
          xRatio: placement.xRatio,
          yRatio: placement.yRatio,
          widthRatio: placement.widthRatio,
        })
        backToDetail()
      }}
    />
  )
}
