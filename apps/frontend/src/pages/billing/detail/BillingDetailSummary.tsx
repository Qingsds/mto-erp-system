/**
 * 对账详情摘要卡。
 *
 * 统一展示金额、计费项、关联发货单和最近归档时间。
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import { cn } from "@/lib/utils"
import { formatDateLabel } from "../list/shared"
import type { BillingDetailStats } from "./types"

interface BillingDetailSummaryProps {
  billing: BillingDetail
  stats: BillingDetailStats
  compact?: boolean
  isFetching?: boolean
}

export function BillingDetailSummary({
  billing,
  stats,
  compact = false,
  isFetching = false,
}: BillingDetailSummaryProps) {
  const summaryItems = [
    {
      label: "应收总额",
      value: `¥${stats.totalAmount.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      emphasis: true,
    },
    {
      label: "计费条目",
      value: `${billing.items.length} 项`,
      hint: `发货 ${stats.linkedItemCount} 项 / 附加 ${stats.extraItemCount} 项`,
    },
    {
      label: "关联发货单",
      value: `${stats.deliveryCount} 张`,
      hint: stats.deliveryCount > 0 ? "可回看来源发货记录" : "当前仅含附加费用",
    },
    {
      label: "最近归档",
      value: stats.latestDocument
        ? formatDateLabel(stats.latestDocument.createdAt)
        : "未盖章",
      hint: stats.latestDocument
        ? stats.latestDocument.fileName
        : "盖章后生成归档记录",
    },
  ]

  return (
    <section
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-4",
      )}
    >
      {summaryItems.map(item => (
        <article
          key={item.label}
          className='border border-border bg-card px-3 py-3 sm:px-4'
        >
          <div className='flex items-center justify-between gap-2'>
            <p className='text-xs text-muted-foreground'>{item.label}</p>
            {isFetching && (
              <span className='text-[10px] text-muted-foreground'>刷新中</span>
            )}
          </div>
          <p
            className={cn(
              "mt-2 text-sm font-semibold text-foreground",
              item.emphasis && "font-mono text-lg tracking-tight tabular-nums",
            )}
          >
            {item.value}
          </p>
          {item.hint && (
            <p className='mt-1 line-clamp-2 text-[11px] text-muted-foreground'>
              {item.hint}
            </p>
          )}
        </article>
      ))}
    </section>
  )
}
