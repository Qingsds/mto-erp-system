/**
 * 对账单盖章预览画布。
 *
 * 负责：
 * - 渲染当前页 PDF
 * - 在页上叠加可拖拽 / 可缩放的印章预览层
 * - 管理 PDF 渲染任务的取消，避免同一 canvas 并发 render
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { cn } from "@/lib/utils"
import {
  MAX_BILLING_SEAL_WIDTH_RATIO,
  MIN_BILLING_SEAL_WIDTH_RATIO,
  clamp,
  type BillingSealPlacement,
} from "./types"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface BillingSealCanvasProps {
  pdfBytes: Uint8Array | null
  pageIndex: number
  placement: BillingSealPlacement
  sealPreviewUrl: string | null
  sealName: string | null
  onPlacementChange: (placement: BillingSealPlacement) => void
  onPageCountChange: (count: number) => void
}

function clampPlacement(params: {
  placement: BillingSealPlacement
  sealAspectRatio: number | null
  renderWidth: number
  renderHeight: number
}) {
  const { placement, sealAspectRatio, renderWidth, renderHeight } = params
  if (!sealAspectRatio || renderWidth <= 0 || renderHeight <= 0) {
    return placement
  }

  const pageAspectRatio = renderWidth / renderHeight
  const maxWidthByX = 1 - placement.xRatio
  const maxWidthByY = (1 - placement.yRatio) / (sealAspectRatio * pageAspectRatio)
  const widthRatio = clamp(
    placement.widthRatio,
    MIN_BILLING_SEAL_WIDTH_RATIO,
    Math.max(
      MIN_BILLING_SEAL_WIDTH_RATIO,
      Math.min(MAX_BILLING_SEAL_WIDTH_RATIO, maxWidthByX, maxWidthByY),
    ),
  )
  const heightRatio = widthRatio * sealAspectRatio * pageAspectRatio

  return {
    ...placement,
    xRatio: clamp(placement.xRatio, 0, Math.max(0, 1 - widthRatio)),
    yRatio: clamp(placement.yRatio, 0, Math.max(0, 1 - heightRatio)),
    widthRatio,
  }
}

export function BillingSealCanvas({
  pdfBytes,
  pageIndex,
  placement,
  sealPreviewUrl,
  sealName,
  onPlacementChange,
  onPageCountChange,
}: BillingSealCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 })
  const [containerWidth, setContainerWidth] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [sealAspectRatio, setSealAspectRatio] = useState<number | null>(null)

  const cancelCurrentRender = () => {
    const currentTask = renderTaskRef.current
    if (!currentTask) return

    renderTaskRef.current = null
    currentTask.cancel()
  }

  useEffect(() => {
    const previousDocument = pdfDocumentRef.current
    pdfDocumentRef.current = null
    if (previousDocument) {
      void previousDocument.destroy()
    }

    cancelCurrentRender()
    setRenderSize({ width: 0, height: 0 })
    setRenderError(null)

    if (!pdfBytes) {
      setPdfDocument(null)
      onPageCountChange(0)
      return
    }

    let cancelled = false
    const loadingTask = getDocument({ data: pdfBytes.slice() })

    void loadingTask.promise
      .then(document => {
        if (cancelled) {
          void document.destroy()
          return
        }
        pdfDocumentRef.current = document
        setPdfDocument(document)
        onPageCountChange(document.numPages)
      })
      .catch(error => {
        if (cancelled) return
        setRenderError(error instanceof Error ? error.message : "PDF 加载失败")
        setPdfDocument(null)
        onPageCountChange(0)
      })

    return () => {
      cancelled = true
      cancelCurrentRender()
      void loadingTask.destroy()
    }
  }, [pdfBytes, onPageCountChange])

  useEffect(() => {
    return () => {
      cancelCurrentRender()

      const currentDocument = pdfDocumentRef.current
      pdfDocumentRef.current = null
      if (currentDocument) {
        void currentDocument.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      setContainerWidth(entry.contentRect.width)
    })

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !containerWidth) return

    let cancelled = false
    cancelCurrentRender()

    void (async () => {
      const page = await pdfDocument.getPage(pageIndex)
      const viewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })
      const canvas = canvasRef.current

      if (!canvas || cancelled) return

      const devicePixelRatio = window.devicePixelRatio || 1
      const context = canvas.getContext("2d")
      if (!context) {
        setRenderError("PDF 预览画布初始化失败")
        return
      }

      canvas.width = Math.floor(scaledViewport.width * devicePixelRatio)
      canvas.height = Math.floor(scaledViewport.height * devicePixelRatio)
      canvas.style.width = `${scaledViewport.width}px`
      canvas.style.height = `${scaledViewport.height}px`
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0],
      })
      renderTaskRef.current = renderTask

      try {
        await renderTask.promise
      } catch (error) {
        if (
          cancelled ||
          (error instanceof Error && error.name === "RenderingCancelledException")
        ) {
          return
        }
        throw error
      } finally {
        if (renderTaskRef.current === renderTask) {
          renderTaskRef.current = null
        }
      }

      if (cancelled) return

      setRenderError(null)
      setRenderSize({
        width: scaledViewport.width,
        height: scaledViewport.height,
      })
    })().catch(error => {
      if (cancelled) return
      setRenderError(error instanceof Error ? error.message : "PDF 渲染失败")
    })

    return () => {
      cancelled = true
      cancelCurrentRender()
    }
  }, [containerWidth, pageIndex, pdfDocument])

  useEffect(() => {
    const nextPlacement = clampPlacement({
      placement,
      sealAspectRatio,
      renderWidth: renderSize.width,
      renderHeight: renderSize.height,
    })

    if (
      nextPlacement.xRatio !== placement.xRatio ||
      nextPlacement.yRatio !== placement.yRatio ||
      nextPlacement.widthRatio !== placement.widthRatio
    ) {
      onPlacementChange(nextPlacement)
    }
  }, [onPlacementChange, placement, renderSize.height, renderSize.width, sealAspectRatio])

  const overlayHeightRatio = useMemo(() => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) {
      return 0
    }
    return placement.widthRatio * sealAspectRatio * (renderSize.width / renderSize.height)
  }, [placement.widthRatio, renderSize.height, renderSize.width, sealAspectRatio])

  const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) return

    event.preventDefault()

    const startX = event.clientX
    const startY = event.clientY
    const startPlacement = placement
    const pageRect = containerRef.current?.getBoundingClientRect()
    if (!pageRect) return

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / pageRect.width
      const deltaY = (moveEvent.clientY - startY) / pageRect.height
      const nextPlacement = clampPlacement({
        placement: {
          ...startPlacement,
          xRatio: startPlacement.xRatio + deltaX,
          yRatio: startPlacement.yRatio + deltaY,
        },
        sealAspectRatio,
        renderWidth: renderSize.width,
        renderHeight: renderSize.height,
      })

      onPlacementChange(nextPlacement)
    }

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  const handleResizeStart = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) return

    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startPlacement = placement

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaWidth = (moveEvent.clientX - startX) / renderSize.width
      const nextPlacement = clampPlacement({
        placement: {
          ...startPlacement,
          widthRatio: startPlacement.widthRatio + deltaWidth,
        },
        sealAspectRatio,
        renderWidth: renderSize.width,
        renderHeight: renderSize.height,
      })

      onPlacementChange(nextPlacement)
    }

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  return (
    <div className='flex h-full min-h-[520px] flex-col border border-border bg-card'>
      <div className='border-b border-border px-4 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-sm font-semibold'>PDF 预览</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              先选页码，再拖动印章到目标位置，右下角小方块可调整大小。
            </p>
          </div>
          <span className='text-xs text-muted-foreground'>第 {pageIndex} 页</span>
        </div>
      </div>

      <div className='flex-1 overflow-auto bg-muted/20 p-4'>
        <div
          ref={containerRef}
          className='mx-auto w-full max-w-4xl'
        >
          {!pdfBytes ? (
            <div className='flex min-h-[420px] items-center justify-center border border-dashed border-border bg-background text-sm text-muted-foreground'>
              正在准备 PDF 预览…
            </div>
          ) : renderError ? (
            <div className='flex min-h-[420px] items-center justify-center border border-destructive/20 bg-destructive/5 px-4 text-sm text-destructive'>
              {renderError}
            </div>
          ) : (
            <div
              className='relative mx-auto border border-border bg-white shadow-sm'
              style={{
                width: renderSize.width || "100%",
                minHeight: renderSize.height || 420,
              }}
            >
              <canvas ref={canvasRef} className='block h-auto w-full' />

              {sealPreviewUrl && renderSize.width > 0 && renderSize.height > 0 && (
                <button
                  type='button'
                  className={cn(
                    "absolute cursor-move border border-primary/30 bg-primary/10 p-0 shadow-sm backdrop-blur",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  )}
                  style={{
                    left: `${placement.xRatio * 100}%`,
                    top: `${placement.yRatio * 100}%`,
                    width: `${placement.widthRatio * 100}%`,
                    height: `${overlayHeightRatio * 100}%`,
                  }}
                  onPointerDown={handleDragStart}
                >
                  <img
                    src={sealPreviewUrl}
                    alt={sealName ?? "印章预览"}
                    className='h-full w-full object-contain select-none'
                    draggable={false}
                    onLoad={event => {
                      const { naturalHeight, naturalWidth } = event.currentTarget
                      if (!naturalHeight || !naturalWidth) return
                      const nextRatio = naturalHeight / naturalWidth
                      setSealAspectRatio(nextRatio)
                    }}
                  />

                  <span
                    role='presentation'
                    className='absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-nwse-resize border border-primary bg-background'
                    onPointerDown={handleResizeStart}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
