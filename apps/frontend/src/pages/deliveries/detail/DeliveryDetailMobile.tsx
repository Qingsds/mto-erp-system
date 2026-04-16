/**
 * DeliveryDetailMobile.tsx
 *
 * 职责：
 * - 移动端发货单详情布局
 * - 单列内容展示
 */

import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { DeliveryItemsTable } from "./DeliveryItemsTable"
import { DeliveryMetaSection } from "./DeliveryMetaSection"
import { DeliveryPhotosSection } from "./DeliveryPhotosSection"
import { DeliverySummaryCards } from "./DeliverySummaryCards"
import type { DeliveryStatsVM } from "./types"

interface DeliveryDetailMobileProps {
  /** 发货单详情实体。 */
  delivery: DeliveryDetail
  /** 发货单聚合统计。 */
  stats: DeliveryStatsVM
  /** 详情数据是否在后台刷新。 */
  isFetching: boolean
}

/**
 * 移动端发货单详情。
 */
export function DeliveryDetailMobile({
  delivery,
  stats,
  isFetching,
}: DeliveryDetailMobileProps) {
  const shouldShowMeta =
    !!delivery.remark ||
    !!delivery.createdBy?.realName ||
    !!delivery.order?.customerName ||
    !!delivery.order?.createdAt

  return (
    <div className='flex min-h-full flex-col gap-3'>
      <DeliverySummaryCards
        delivery={delivery}
        stats={stats}
        isFetching={isFetching}
      />

      <section className='border border-border bg-card'>
        <div className='px-4 py-2.5 border-b border-border'>
          <div>
            <h3 className='text-sm font-semibold'>发货明细</h3>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              本次发货共 {stats.lineCount} 条，合计{" "}
              {stats.totalShippedQty} 件
            </p>
          </div>
        </div>
        <DeliveryItemsTable lines={stats.lines} />
      </section>

      {shouldShowMeta && (
        <section className='border border-border bg-card p-3'>
          <DeliveryMetaSection delivery={delivery} />
        </section>
      )}

      <DeliveryPhotosSection delivery={delivery} />
    </div>
  )
}
