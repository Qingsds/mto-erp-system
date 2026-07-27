import { useCallback } from "react"
import { DocumentExportActionButton } from "@/components/documents/DocumentExportActionButton"
import { ExportPreviewDialog } from "@/components/export/ExportPreviewDialog"
import { useExportPreviewController } from "@/hooks/common/useExportPreviewController"
import type { SheetPayload } from "@/lib/documentExportData"

interface FixedSheetExportActionProps {
  label: string
  buildPayload: () => SheetPayload
  exportFile: () => Promise<string>
  disabled?: boolean
  disabledReason?: string
  compactOnMobile?: boolean
}

export function FixedSheetExportAction({
  label,
  buildPayload,
  exportFile,
  disabled = false,
  disabledReason,
  compactOnMobile = true,
}: FixedSheetExportActionProps) {
  const buildPreview = useCallback(
    () => buildPayload().preview,
    [buildPayload],
  )
  const runExport = useCallback(
    () => exportFile(),
    [exportFile],
  )
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
    buildPreview,
    exportFile: runExport,
  })

  return (
    <>
      <span title={disabled ? disabledReason : undefined}>
        <DocumentExportActionButton
          label={label}
          compactOnMobile={compactOnMobile}
          disabled={disabled}
          loading={isExporting}
          onClick={() => setOpen(true)}
        />
      </span>
      <ExportPreviewDialog
        open={open}
        onOpenChange={setOpen}
        config={config}
        onChangeConfig={setConfig}
        preview={preview}
        isPreparing={isPreparing}
        isExporting={isExporting}
        error={error}
        showOptions={false}
        onConfirm={handleConfirm}
      />
    </>
  )
}
