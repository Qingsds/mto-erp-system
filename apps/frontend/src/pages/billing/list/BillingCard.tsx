/**
 * 财务对账卡片。
 *
 * 统一承载桌面端和移动端的卡片信息与状态动作。
 */

import type { BillingListItem } from "@/hooks/api/useBilling"
import { decimalToNum } from "@/hooks/api/useBilling"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatBillingNo,
} from "./shared"
import { BILLING_STATUS_LABEL } from "./shared"
import { BillingStatusBadge } from "./BillingStatusBadge"

interface BillingCardProps {
  bill: BillingListItem
  compact?: boolean
  isUpdating?: boolean
  onOpenDetail: (id: number) => void
  onMarkPaid: (id: number) => void
}

function getStatusHint(status: BillingListItem["status"]) {
  if (status === "DRAFT") return "待盖章"
  if (status === "SEALED") return "待结清"
  return "已完成"
}

export function BillingCard({
  bill,
  compact = false,
  isUpdating = false,
  onOpenDetail,
  onMarkPaid,
}: BillingCardProps) {
  return (
    <article
      role='button'
      tabIndex={0}
      className={cn(
        "border border-border bg-card transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        compact ? "px-3.5 py-3" : "px-4 py-3.5 md:px-5 md:py-4",
      )}
      onClick={() => onOpenDetail(bill.id)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenDetail(bill.id)
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">
            {formatBillingNo(bill.id)}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {bill.customerName}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            创建时间：{bill.createdAt.slice(0, 10)}
          </p>
        </div>

        <BillingStatusBadge status={bill.status} />
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div>
          <p className="text-xs text-muted-foreground">应收总额</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-foreground tabular-nums">
            ¥{decimalToNum(bill.totalAmount).toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">费用条目</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {bill.items?.length ?? 0} 项
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {getStatusHint(bill.status)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 border-t border-border pt-3",
          compact ? "flex flex-col gap-2" : "flex items-center gap-2",
        )}
      >
        {bill.status === "DRAFT" && (
          <p className='text-xs text-muted-foreground'>
            请进入详情页执行盖章归档
          </p>
        )}

        {bill.status === "SEALED" && (
          <Button
            size="sm"
            className={cn("text-xs", compact ? "h-9 w-full" : "h-8")}
            onClick={event => {
              event.stopPropagation()
              onMarkPaid(bill.id)
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <i className="ri-loader-4-line mr-1.5 animate-spin" />
                结清中…
              </>
            ) : (
              <>
                <i className="ri-check-double-line mr-1.5" />
                标记已结清
              </>
            )}
          </Button>
        )}

        {bill.status === "PAID" && (
          <p className="text-xs text-muted-foreground">
            {BILLING_STATUS_LABEL.PAID}，无需后续操作
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-end text-[11px] text-muted-foreground">
        点击卡片查看详情
      </div>
    </article>
  )
}
