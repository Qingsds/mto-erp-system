/**
 * DeliveryDetailPage.tsx
 *
 * 职责：
 * - 发货单详情容器页，负责数据拉取、聚合与端类型切换
 * - 提供单据状态与异常状态展示
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ExportPreviewDialog } from "@/components/export/ExportPreviewDialog"
import { useUIStore } from "@/store/ui.store"
import { toast } from "@/lib/toast"
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportPreviewData,
  getDeliveryExportPreview,
  type ExportSheetOptions,
} from "@/lib/documentExportData"
import {
  decimalToNum,
  type DeliveryDetail,
  useGetDelivery,
} from "@/hooks/api/useDeliveries"
import { formatDeliveryNo } from "@/hooks/api/useOrders"
import { DeliveryDetailDesktop } from "./detail/DeliveryDetailDesktop"
import { DeliveryDetailMobile } from "./detail/DeliveryDetailMobile"
import { DeliveryStatusBadge } from "./detail/DeliveryStatusBadge"
import type { DeliveryStatsVM } from "./detail/types"

type ExportConfig = Required<ExportSheetOptions>

const DEFAULT_EXPORT_CONFIG: ExportConfig = DEFAULT_EXPORT_OPTIONS

function resolveUnitPrice(
  unitPrice: string,
  commonPrices: Record<string, number>,
): number {
  const snapshotPrice = decimalToNum(unitPrice)
  if (snapshotPrice > 0) {
    return snapshotPrice
  }

  const standardPrice = commonPrices["标准价"]
  if (
    typeof standardPrice === "number" &&
    Number.isFinite(standardPrice)
  ) {
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

  const {
    data: delivery,
    isLoading,
    isFetching,
  } = useGetDelivery(deliveryId)

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
      uniquePartCount: new Set(
        lines.map(line => line.orderItem.partId),
      ).size,
      totalShippedQty: lines.reduce(
        (sum, line) => sum + line.shippedQty,
        0,
      ),
      totalAmount: lines.reduce(
        (sum, line) => sum + line.lineAmount,
        0,
      ),
    }
  }, [delivery])

  if (isLoading) {
    return (
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='h-14 border-b border-border bg-background' />
        <div className='flex-1 overflow-auto p-4 sm:p-6 lg:p-8'>
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className='h-20 rounded-lg bg-muted animate-pulse'
              />
            ))}
          </div>
          <div className='mt-6 h-72 rounded-lg bg-muted animate-pulse' />
        </div>
      </div>
    )
  }

  if (!delivery || !stats) {
    return (
      <div className='flex flex-col flex-1 items-center justify-center gap-4 text-muted-foreground'>
        <i className='ri-error-warning-line text-4xl opacity-40' />
        <p className='text-sm'>发货单不存在或已删除</p>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate({ to: "/deliveries" })}
        >
          返回发货单列表
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-background shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='font-mono text-sm truncate'>
            {formatDeliveryNo(delivery.id)}
          </span>
          <DeliveryStatusBadge status={delivery.status} />
        </div>
        <div className='ml-auto'>
          <DeliveryExportAction delivery={delivery} />
        </div>
      </div>

      <div className='flex-1 overflow-auto'>
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

function DeliveryExportAction({ delivery }: { delivery: DeliveryDetail }) {
  const [exportOpen, setExportOpen] = useState(false)
  const [isPreparingExport, setIsPreparingExport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportPreview, setExportPreview] = useState<ExportPreviewData | null>(null)
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG)
  // 仅首次打开展示加载态；后续切换配置保持旧预览，避免弹窗闪烁。
  const hasPreparedPreviewRef = useRef(false)

  useEffect(() => {
    if (!exportOpen) {
      hasPreparedPreviewRef.current = false
      return
    }
    const isFirstPrepare = !hasPreparedPreviewRef.current
    if (isFirstPrepare) {
      setIsPreparingExport(true)
    }

    let cancelled = false
    let rafId1 = 0
    let rafId2 = 0

    // 双 RAF：优先保证弹窗开启动画/首帧绘制，再异步计算预览。
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        if (cancelled) return
        const preview = getDeliveryExportPreview(delivery, exportConfig)
        if (!cancelled) {
          setExportPreview(preview)
          hasPreparedPreviewRef.current = true
          setIsPreparingExport(false)
        }
      })
    })

    return () => {
      cancelled = true
      if (rafId1) cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
    }
  }, [delivery, exportConfig, exportOpen])

  const handleConfirmExportDelivery = async () => {
    try {
      setIsExporting(true)
      const { exportDeliveryNote } = await import("@/lib/documentExport")
      const filename = exportDeliveryNote(delivery, exportConfig)
      toast.success(`导出成功：${filename}`)
      setExportOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误"
      toast.error(`导出失败：${message}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Button
        size='sm'
        variant='outline'
        className='h-8 px-2.5 text-xs'
        onClick={() => setExportOpen(true)}
      >
        <i className='ri-download-2-line mr-1.5' />
        导出发货单
      </Button>

      <ExportPreviewDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        config={exportConfig}
        onChangeConfig={setExportConfig}
        preview={exportPreview}
        isPreparing={isPreparingExport}
        isExporting={isExporting}
        onConfirm={handleConfirmExportDelivery}
      />
    </>
  )
}
