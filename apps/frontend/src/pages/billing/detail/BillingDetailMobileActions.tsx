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
  isSubmitting: boolean
  onOpenSeal: () => void
  onMarkPaid: () => void
}

export function BillingDetailMobileActions({
  status,
  stats,
  isSubmitting,
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
      <MobileActionBar summary={summary}>
        <div className='flex h-10 flex-1 items-center justify-center border border-border bg-muted/30 text-sm text-muted-foreground'>
          已结清，无需后续操作
        </div>
      </MobileActionBar>
    )
  }

  return (
    <MobileActionBar summary={summary}>
      {status === "DRAFT" ? (
        <Button className='h-10 flex-1' onClick={onOpenSeal}>
          <i className='ri-seal-line mr-1.5 shrink-0' />
          <span className='truncate'>盖章归档</span>
        </Button>
      ) : (
        <Button
          className='h-10 flex-1'
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
