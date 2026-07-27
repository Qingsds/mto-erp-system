/**
 * 订单导出动作。
 *
 * 复用共享 Excel 导出控制器，避免订单与发货再次各自维护一套导出状态。
 */

import { useCallback } from "react"
import { DocumentExportActionButton } from "@/components/documents/DocumentExportActionButton"
import { FixedSheetExportAction } from "@/components/export/FixedSheetExportAction"
import { ExportPreviewDialog } from "@/components/export/ExportPreviewDialog"
import {
  buildOrderDetailSheetPayload,
  getOrderExportPreview,
} from "@/lib/documentExportData"
import type { OrderDetail } from "@/hooks/api/useOrders"
import { useExportPreviewController } from "@/hooks/common/useExportPreviewController"
import { useCanViewMoney } from "@/lib/permissions"

interface OrderExportActionProps {
  order: OrderDetail
}

export function OrderExportAction({
  order,
}: OrderExportActionProps) {
  const canViewMoney = useCanViewMoney()
  const buildDetailPayload = useCallback(
    () => buildOrderDetailSheetPayload(order),
    [order],
  )
  const exportDetail = useCallback(async () => {
    const { exportOrderDetailSheet } = await import("@/lib/documentExport")
    return exportOrderDetailSheet(order)
  }, [order])
  const {
    open,
    setOpen,
    config,
    setConfig,
    preview,
    isPreparing,
    isExporting,
    error,
    handleConfirm,
  } = useExportPreviewController({
    buildPreview: config => getOrderExportPreview(order, config),
    exportFile: async config => {
      const { exportOrderPriceSheet } = await import("@/lib/documentExport")
      return exportOrderPriceSheet(order, config)
    },
  })

  return (
    <>
      <div className='flex items-center gap-2'>
        <FixedSheetExportAction
          label='导出明细表'
          buildPayload={buildDetailPayload}
          exportFile={exportDetail}
        />
        {canViewMoney && (
          <DocumentExportActionButton
            label='导出价格清单'
            onClick={() => setOpen(true)}
          />
        )}
      </div>

      {canViewMoney && (
        <ExportPreviewDialog
          open={open}
          onOpenChange={setOpen}
          config={config}
          onChangeConfig={setConfig}
          preview={preview}
          isPreparing={isPreparing}
          isExporting={isExporting}
          error={error}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}
