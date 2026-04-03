/**
 * 对账详情页容器。
 *
 * 负责：
 * - 拉取单张对账单详情
 * - 聚合摘要数据
 * - 编排盖章 / 结清动作
 * - 切换桌面端 / 移动端视图
 */

import { useMemo, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { PageContentWrapper } from "@/components/common/PageContentWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { useGetBillingDetail, useUpdateBillingStatus } from "@/hooks/api/useBilling"
import { ExecuteSealDialog } from "@/components/billing/ExecuteSealDialog"
import { BillingDetailDesktop } from "./BillingDetailDesktop"
import { BillingDetailMobile } from "./BillingDetailMobile"
import { BillingDetailMobileActions } from "./BillingDetailMobileActions"
import { BillingDetailToolbar } from "./BillingDetailToolbar"
import { buildBillingDetailStats } from "./types"

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

  const [sealOpen, setSealOpen] = useState(false)

  const stats = useMemo(
    () => (billing ? buildBillingDetailStats(billing) : null),
    [billing],
  )

  const handleMarkPaid = async () => {
    if (!billing || billing.status !== "SEALED") return
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
  const desktopActions = !isMobile && (
    <>
      {canSeal && (
        <Button
          size='sm'
          className='h-8 px-2.5 text-xs'
          onClick={() => setSealOpen(true)}
        >
          <i className='ri-seal-line mr-1.5' />
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
        {isMobile ? (
          <BillingDetailMobile
            billing={billing}
            stats={stats}
            isFetching={isFetching}
            onOpenDelivery={handleOpenDelivery}
          />
        ) : (
          <BillingDetailDesktop
            billing={billing}
            stats={stats}
            isFetching={isFetching}
            onOpenDelivery={handleOpenDelivery}
          />
        )}
      </PageContentWrapper>

      {isMobile && (
        <BillingDetailMobileActions
          status={billing.status}
          stats={stats}
          isSubmitting={updateStatus.isPending}
          onOpenSeal={() => setSealOpen(true)}
          onMarkPaid={() => void handleMarkPaid()}
        />
      )}

      <ExecuteSealDialog
        open={sealOpen}
        onOpenChange={setSealOpen}
        billingId={billing.id}
        billingNo={`BIL-${String(billing.id).padStart(6, "0")}`}
      />
    </div>
  )
}
