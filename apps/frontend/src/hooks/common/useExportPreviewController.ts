import { useEffect, useRef, useState } from "react"
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportPreviewData,
  type ExportSheetOptions,
} from "@/lib/documentExportData"
import { toast } from "@/lib/toast"

export type ExportPreviewConfig = Required<ExportSheetOptions>

interface UseExportPreviewControllerOptions {
  buildPreview: (config: ExportPreviewConfig) => ExportPreviewData
  exportFile: (config: ExportPreviewConfig) => Promise<string>
  initialConfig?: ExportPreviewConfig
  previewErrorTitle?: string
  exportErrorTitle?: string
}

function resolveActionMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return "未知错误"
}

/**
 * Excel 导出预览控制器。
 *
 * 统一管理弹层开关、预览准备、导出 loading 和错误状态，
 * 让订单详情与发货详情只保留业务数据映射。
 */
export function useExportPreviewController({
  buildPreview,
  exportFile,
  initialConfig = DEFAULT_EXPORT_OPTIONS,
  previewErrorTitle = "预览生成失败",
  exportErrorTitle = "导出失败",
}: UseExportPreviewControllerOptions) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<ExportPreviewConfig>(initialConfig)
  const [preview, setPreview] = useState<ExportPreviewData | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasPreparedPreviewRef = useRef(false)

  useEffect(() => {
    if (!open) {
      hasPreparedPreviewRef.current = false
      setError(null)
      return
    }

    const isFirstPrepare = !hasPreparedPreviewRef.current
    if (isFirstPrepare) {
      setIsPreparing(true)
    }

    let cancelled = false
    let rafId1 = 0
    let rafId2 = 0

    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        if (cancelled) return

        try {
          const nextPreview = buildPreview(config)
          if (cancelled) return

          setPreview(nextPreview)
          setError(null)
          hasPreparedPreviewRef.current = true
          setIsPreparing(false)
        } catch (error) {
          if (cancelled) return

          const message = resolveActionMessage(error)
          const resolvedError = `${previewErrorTitle}：${message}`

          setError(resolvedError)
          setIsPreparing(false)
          toast.error(resolvedError)
        }
      })
    })

    return () => {
      cancelled = true
      if (rafId1) cancelAnimationFrame(rafId1)
      if (rafId2) cancelAnimationFrame(rafId2)
    }
  }, [buildPreview, config, open, previewErrorTitle])

  const handleConfirm = async () => {
    try {
      setError(null)
      setIsExporting(true)
      const filename = await exportFile(config)
      toast.success(`导出成功：${filename}`)
      setOpen(false)
    } catch (error) {
      const message = resolveActionMessage(error)
      const resolvedError = `${exportErrorTitle}：${message}`

      setError(resolvedError)
      toast.error(resolvedError)
    } finally {
      setIsExporting(false)
    }
  }

  return {
    open,
    setOpen,
    config,
    setConfig,
    preview,
    isPreparing,
    isExporting,
    error,
    handleConfirm,
  }
}
