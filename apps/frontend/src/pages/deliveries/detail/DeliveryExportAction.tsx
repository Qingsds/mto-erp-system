/**
 * 发货单导出动作。
 *
 * 独立管理导出预览弹层与导出行为，避免详情页容器继续内联文档动作状态。
 */

import { DocumentExportActionButton } from "@/components/documents/DocumentExportActionButton"
import { ExportPreviewDialog } from "@/components/export/ExportPreviewDialog"
import { getDeliveryExportPreview } from "@/lib/documentExportData"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import { useExportPreviewController } from "@/hooks/common/useExportPreviewController"

interface DeliveryExportActionProps {
  delivery: DeliveryDetail
}

export function DeliveryExportAction({
  delivery,
}: DeliveryExportActionProps) {
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
    buildPreview: config => getDeliveryExportPreview(delivery, config),
    exportFile: async config => {
      const { exportDeliveryNote } = await import("@/lib/documentExport")
      return exportDeliveryNote(delivery, config)
    },
  })

  return (
    <>
      <DocumentExportActionButton
        label='导出发货单'
        onClick={() => setOpen(true)}
      />

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
    </>
  )
}
