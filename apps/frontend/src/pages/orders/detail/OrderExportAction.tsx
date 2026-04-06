/**
 * 订单导出动作。
 *
 * 独立管理导出预览弹窗、预览准备状态和实际导出行为，
 * 避免容器页混入过多展示层状态。
 */

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ExportPreviewDialog } from "@/components/export/ExportPreviewDialog"
import {
  DEFAULT_EXPORT_OPTIONS,
  getOrderExportPreview,
  type ExportPreviewData,
  type ExportSheetOptions,
} from "@/lib/documentExportData"
import { toast } from "@/lib/toast"
import type { OrderDetail } from "@/hooks/api/useOrders"
import { useCanViewMoney } from "@/lib/permissions"

type ExportConfig = Required<ExportSheetOptions>

const DEFAULT_EXPORT_CONFIG: ExportConfig = DEFAULT_EXPORT_OPTIONS

interface OrderExportActionProps {
  order: OrderDetail
}

export function OrderExportAction({
  order,
}: OrderExportActionProps) {
  const canViewMoney = useCanViewMoney()
  const [exportOpen, setExportOpen] = useState(false)
  const [isPreparingExport, setIsPreparingExport] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportPreview, setExportPreview] = useState<ExportPreviewData | null>(null)
  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG)
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

    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        if (cancelled) return

        const preview = getOrderExportPreview(order, exportConfig)
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
  }, [exportConfig, exportOpen, order])

  const handleConfirmExportOrder = async () => {
    try {
      setIsExporting(true)
      const { exportOrderPriceSheet } = await import("@/lib/documentExport")
      const filename = exportOrderPriceSheet(order, exportConfig)
      toast.success(`导出成功：${filename}`)
      setExportOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误"
      toast.error(`导出失败：${message}`)
    } finally {
      setIsExporting(false)
    }
  }

  if (!canViewMoney) {
    return null
  }

  return (
    <>
      <Button
        size='sm'
        variant='outline'
        className='h-8 w-8 px-0 text-xs sm:w-auto sm:px-2.5'
        onClick={() => setExportOpen(true)}
      >
        <i className='ri-download-2-line sm:mr-1.5' />
        <span className='hidden sm:inline'>导出价格清单</span>
      </Button>

      <ExportPreviewDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        config={exportConfig}
        onChangeConfig={setExportConfig}
        preview={exportPreview}
        isPreparing={isPreparingExport}
        isExporting={isExporting}
        onConfirm={handleConfirmExportOrder}
      />
    </>
  )
}
