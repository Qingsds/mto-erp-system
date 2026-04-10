/**
 * 通用签章预览画布。
 *
 * 职责：
 * - 渲染当前页 PDF
 * - 在页上叠加可拖拽 / 可缩放的印章预览层
 * - 将拖拽中的位置保留在画布内部，避免每帧回写父层造成闪烁
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { cn } from "@/lib/utils"
import {
  MAX_SEAL_WIDTH_RATIO,
  MIN_SEAL_WIDTH_RATIO,
  SEAL_WORKBENCH_A4_ASPECT_RATIO,
  SEAL_WORKBENCH_PREVIEW_MAX_WIDTH,
  clamp,
  type SealPlacement,
} from "./types"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface SealWorkbenchCanvasProps {
  pdfBytes: Uint8Array | null
  pageIndex: number
  placement: SealPlacement
  sealPreviewUrl: string | null
  sealName: string | null
  onPlacementChange: (placement: SealPlacement) => void
  onPageCountChange: (count: number) => void
}

type InteractionMode = "idle" | "dragging" | "resizing"

function isSamePlacement(left: SealPlacement, right: SealPlacement) {
  return (
    left.pageIndex === right.pageIndex &&
    left.xRatio === right.xRatio &&
    left.yRatio === right.yRatio &&
    left.widthRatio === right.widthRatio
  )
}

function clampPlacement(params: {
  placement: SealPlacement
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
    MIN_SEAL_WIDTH_RATIO,
    Math.max(
      MIN_SEAL_WIDTH_RATIO,
      Math.min(MAX_SEAL_WIDTH_RATIO, maxWidthByX, maxWidthByY),
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

export function SealWorkbenchCanvas({
  pdfBytes,
  pageIndex,
  placement,
  sealPreviewUrl,
  sealName,
  onPlacementChange,
  onPageCountChange,
}: SealWorkbenchCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pageFrameRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 })
  const [containerWidth, setContainerWidth] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [sealAspectRatio, setSealAspectRatio] = useState<number | null>(null)
  const [draftPlacement, setDraftPlacement] = useState(placement)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("idle")
  const draftPlacementRef = useRef(placement)

  const isInteracting = interactionMode !== "idle"

  const cancelCurrentRender = () => {
    const currentTask = renderTaskRef.current
    if (!currentTask) return

    renderTaskRef.current = null
    currentTask.cancel()
  }

  const resolvedPlacement = useMemo(
    () =>
      clampPlacement({
        placement: draftPlacement,
        sealAspectRatio,
        renderWidth: renderSize.width,
        renderHeight: renderSize.height,
      }),
    [draftPlacement, renderSize.height, renderSize.width, sealAspectRatio],
  )

  useEffect(() => {
    draftPlacementRef.current = resolvedPlacement
  }, [resolvedPlacement])

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
      const targetWidth = Math.min(containerWidth, SEAL_WORKBENCH_PREVIEW_MAX_WIDTH)
      const targetHeight = targetWidth / SEAL_WORKBENCH_A4_ASPECT_RATIO
      const scale = Math.min(
        targetWidth / viewport.width,
        targetHeight / viewport.height,
      )
      const scaledViewport = page.getViewport({ scale })
      const canvas = canvasRef.current

      if (!canvas || cancelled) return

      const devicePixelRatio = window.devicePixelRatio || 1
      const context = canvas.getContext("2d")
      if (!context) {
        setRenderError("PDF 预览画布初始化失败")
        return
      }

      const offsetX = (targetWidth - scaledViewport.width) / 2
      const offsetY = (targetHeight - scaledViewport.height) / 2

      canvas.width = Math.floor(targetWidth * devicePixelRatio)
      canvas.height = Math.floor(targetHeight * devicePixelRatio)
      canvas.style.width = `${targetWidth}px`
      canvas.style.height = `${targetHeight}px`
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({
        canvasContext: context,
        viewport: scaledViewport,
        transform: [
          devicePixelRatio,
          0,
          0,
          devicePixelRatio,
          offsetX * devicePixelRatio,
          offsetY * devicePixelRatio,
        ],
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
        width: targetWidth,
        height: targetHeight,
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
    if (isInteracting) {
      return
    }

    const nextPlacement = clampPlacement({
      placement,
      sealAspectRatio,
      renderWidth: renderSize.width,
      renderHeight: renderSize.height,
    })

    setDraftPlacement(currentPlacement =>
      isSamePlacement(currentPlacement, nextPlacement)
        ? currentPlacement
        : nextPlacement,
    )
  }, [isInteracting, placement, renderSize.height, renderSize.width, sealAspectRatio])

  useEffect(() => {
    if (isInteracting || isSamePlacement(resolvedPlacement, placement)) {
      return
    }

    onPlacementChange(resolvedPlacement)
  }, [isInteracting, onPlacementChange, placement, resolvedPlacement])

  const overlayHeightRatio = useMemo(() => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) {
      return 0
    }
    return (
      resolvedPlacement.widthRatio *
      sealAspectRatio *
      (renderSize.width / renderSize.height)
    )
  }, [renderSize.height, renderSize.width, resolvedPlacement.widthRatio, sealAspectRatio])

  const commitPlacement = (nextPlacement: SealPlacement) => {
    setInteractionMode("idle")
    setDraftPlacement(nextPlacement)
    draftPlacementRef.current = nextPlacement
    onPlacementChange(nextPlacement)
  }

  const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) return

    event.preventDefault()

    const pageRect = pageFrameRef.current?.getBoundingClientRect()
    if (!pageRect) return

    setInteractionMode("dragging")

    const overlayRect = event.currentTarget.getBoundingClientRect()
    const pointerOffsetX = event.clientX - overlayRect.left
    const pointerOffsetY = event.clientY - overlayRect.top
    const startPlacement = draftPlacementRef.current

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextPlacement = clampPlacement({
        placement: {
          ...startPlacement,
          xRatio: (moveEvent.clientX - pageRect.left - pointerOffsetX) / pageRect.width,
          yRatio: (moveEvent.clientY - pageRect.top - pointerOffsetY) / pageRect.height,
        },
        sealAspectRatio,
        renderWidth: renderSize.width,
        renderHeight: renderSize.height,
      })

      draftPlacementRef.current = nextPlacement
      setDraftPlacement(nextPlacement)
    }

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      commitPlacement(draftPlacementRef.current)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  const handleResizeStart = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (!sealAspectRatio || renderSize.width <= 0 || renderSize.height <= 0) return

    event.preventDefault()
    event.stopPropagation()

    const pageRect = pageFrameRef.current?.getBoundingClientRect()
    const overlayElement = event.currentTarget.parentElement
    const overlayRect = overlayElement?.getBoundingClientRect()
    if (!overlayRect) return

    setInteractionMode("resizing")

    const startX = event.clientX
    const startY = event.clientY
    const startPlacement = draftPlacementRef.current
    const pageWidth = pageRect?.width ?? renderSize.width
    const pageHeight = pageRect?.height ?? renderSize.height

    const onPointerMove = (moveEvent: PointerEvent) => {
      const widthRatioByX = (moveEvent.clientX - overlayRect.left) / pageWidth
      const widthRatioByY =
        (moveEvent.clientY - overlayRect.top) /
        pageHeight /
        (sealAspectRatio * (renderSize.width / renderSize.height))
      const prefersHorizontal =
        Math.abs(moveEvent.clientX - startX) >= Math.abs(moveEvent.clientY - startY)
      const nextWidthRatio = prefersHorizontal ? widthRatioByX : widthRatioByY
      const nextPlacement = clampPlacement({
        placement: {
          ...startPlacement,
          widthRatio: nextWidthRatio,
        },
        sealAspectRatio,
        renderWidth: renderSize.width,
        renderHeight: renderSize.height,
      })

      draftPlacementRef.current = nextPlacement
      setDraftPlacement(nextPlacement)
    }

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      commitPlacement(draftPlacementRef.current)
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
          className='mx-auto w-full max-w-[794px]'
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
              ref={pageFrameRef}
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
                    "absolute cursor-move border border-transparent bg-transparent p-0 shadow-sm transition-[border-color,box-shadow]",
                    "hover:border-primary/25 focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                    isInteracting && "border-primary/35",
                  )}
                  style={{
                    left: `${resolvedPlacement.xRatio * 100}%`,
                    top: `${resolvedPlacement.yRatio * 100}%`,
                    width: `${resolvedPlacement.widthRatio * 100}%`,
                    height: `${overlayHeightRatio * 100}%`,
                  }}
                  onPointerDown={handleDragStart}
                >
                  <img
                    src={sealPreviewUrl}
                    alt={sealName ?? "印章预览"}
                    className='pointer-events-none h-full w-full select-none object-contain'
                    draggable={false}
                    onLoad={event => {
                      const { naturalHeight, naturalWidth } = event.currentTarget
                      if (!naturalHeight || !naturalWidth) return
                      setSealAspectRatio(naturalHeight / naturalWidth)
                    }}
                  />

                  <span
                    role='presentation'
                    className='absolute -bottom-1.5 -right-1.5 h-5 w-5 cursor-nwse-resize border border-primary bg-background shadow-sm'
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
