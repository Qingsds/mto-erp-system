/**
 * DeliveryDetailPage.tsx
 *
 * 职责：
 * - 发货单详情容器页，负责数据拉取、聚合与端类型切换
 * - 提供面包屑导航与异常状态展示
 */

import { useMemo } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import { decimalToNum, useGetDelivery } from "@/hooks/api/useDeliveries"
import { formatDeliveryNo } from "@/hooks/api/useOrders"
import { DeliveryDetailDesktop } from "./detail/DeliveryDetailDesktop"
import { DeliveryDetailMobile } from "./detail/DeliveryDetailMobile"
import { DeliveryStatusBadge } from "./detail/DeliveryStatusBadge"
import type { DeliveryStatsVM } from "./detail/types"

function resolveUnitPrice(unitPrice: string, commonPrices: Record<string, number>): number {
  const snapshotPrice = decimalToNum(unitPrice)
  if (snapshotPrice > 0) {
    return snapshotPrice
  }

  const standardPrice = commonPrices["标准价"]
  if (typeof standardPrice === "number" && Number.isFinite(standardPrice)) {
    return standardPrice
  }

  for (const value of Object.values(commonPrices)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }

  return snapshotPrice
}

/**
 * 发货单详情页面。
 */
export function DeliveryDetailPage() {
  const { id } = useParams({ from: "/deliveries/$id" })
  const navigate = useNavigate()
  const { isMobile } = useUIStore()
  const deliveryId = Number(id)

  const { data: delivery, isLoading, isFetching } = useGetDelivery(deliveryId)

  const stats = useMemo<DeliveryStatsVM | null>(() => {
    if (!delivery) return null

    const lines = delivery.items.map(item => {
      const unitPrice = resolveUnitPrice(
        item.orderItem.unitPrice,
        item.orderItem.part.commonPrices,
      )
      const lineAmount = item.shippedQty * unitPrice
      const pendingQty = Math.max(
        item.orderItem.orderedQty - item.orderItem.shippedQty,
        0,
      )

      return {
        ...item,
        lineAmount,
        pendingQty,
      }
    })

    return {
      lines,
      lineCount: lines.length,
      uniquePartCount: new Set(lines.map(line => line.orderItem.partId)).size,
      totalShippedQty: lines.reduce((sum, line) => sum + line.shippedQty, 0),
      totalAmount: lines.reduce((sum, line) => sum + line.lineAmount, 0),
    }
  }, [delivery])

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-14 border-b border-border bg-background" />
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
          <div className="mt-6 h-72 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (!delivery || !stats) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground">
        <i className="ri-error-warning-line text-4xl opacity-40" />
        <p className="text-sm">发货单不存在或已删除</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/deliveries" })}
        >
          返回发货单列表
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to="/deliveries"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            发货管理
          </Link>
          <i className="ri-arrow-right-s-line text-muted-foreground/40 text-xs" />
          <span className="font-mono text-sm truncate">
            {formatDeliveryNo(delivery.id)}
          </span>
        </div>

        <div className="ml-auto">
          <DeliveryStatusBadge status={delivery.status} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isMobile ? (
          <DeliveryDetailMobile
            delivery={delivery}
            stats={stats}
            isFetching={isFetching}
          />
        ) : (
          <DeliveryDetailDesktop
            delivery={delivery}
            stats={stats}
            isFetching={isFetching}
          />
        )}
      </div>
    </div>
  )
}
