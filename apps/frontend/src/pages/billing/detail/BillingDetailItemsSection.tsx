/**
 * 对账条目区。
 *
 * 区分来源发货项与附加费用，保留来源单据跳转入口。
 */

import { Button } from "@/components/ui/button"
import type { BillingDetail } from "@/hooks/api/useBilling"
import { cn } from "@/lib/utils"
import { formatDateLabel } from "../list/shared"

interface BillingDetailItemsSectionProps {
  billing: BillingDetail
  compact?: boolean
  onOpenDelivery: (deliveryId: number) => void
}

export function BillingDetailItemsSection({
  billing,
  compact = false,
  onOpenDelivery,
}: BillingDetailItemsSectionProps) {
  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-3 py-3 sm:px-5 sm:py-4'>
        <h2 className='text-sm font-semibold text-foreground'>结算明细</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          先看来源发货项，再看附加费用，避免金额来源混淆。
        </p>
      </div>

      <div className='flex flex-col'>
        {billing.items.map(item => {
          const delivery = item.deliveryItem?.deliveryNote
          const orderItem = item.deliveryItem?.orderItem
          const part = orderItem?.part
          const isExtra = !item.deliveryItem

          return (
            <article
              key={item.id}
              className='border-b border-border px-3 py-3 last:border-b-0 sm:px-5 sm:py-4'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {isExtra ? item.description || "附加费用" : part?.name || "发货计费项"}
                    </p>
                    <span
                      className={cn(
                        "border px-1.5 py-0.5 text-[10px]",
                        isExtra
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-border bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {isExtra ? "附加费用" : "发货结算"}
                    </span>
                  </div>

                  {!isExtra && part && (
                    <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
                      {part.partNumber}
                    </p>
                  )}
                </div>

                <div className='shrink-0 text-right'>
                  <p className='font-mono text-sm font-semibold text-foreground tabular-nums'>
                    ¥{(typeof item.amount === "string" ? parseFloat(item.amount) : item.amount).toLocaleString("zh-CN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  {!isExtra && item.deliveryItem && (
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      发货 {item.deliveryItem.shippedQty} 件
                    </p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "mt-3 grid gap-2 text-xs text-muted-foreground",
                  compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto]",
                )}
              >
                <div className='min-w-0 space-y-1'>
                  {item.description && (
                    <p className='break-words'>{item.description}</p>
                  )}

                  {delivery && (
                    <>
                      <p>
                        来源发货单：DLV-{String(delivery.id).padStart(6, "0")} · {formatDateLabel(delivery.deliveryDate)}
                      </p>
                      {delivery.remark && (
                        <p className='break-words'>发货备注：{delivery.remark}</p>
                      )}
                    </>
                  )}
                </div>

                {delivery && (
                  <div className='flex items-center justify-start xl:justify-end'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs'
                      onClick={() => onOpenDelivery(delivery.id)}
                    >
                      <i className='ri-truck-line mr-1.5' />
                      查看发货单
                    </Button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
