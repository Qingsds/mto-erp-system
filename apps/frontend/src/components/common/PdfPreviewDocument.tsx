import { useEffect, useRef, useState } from "react"
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * PDF 只读预览组件。
 *
 * 目标是复用项目现有 pdfjs 渲染方案，统一承载弹层里的多页滚动预览。
 */

interface PdfPreviewDocumentProps {
  previewUrl: string
  title: string
}

export function PdfPreviewDocument({
  previewUrl,
  title,
}: PdfPreviewDocumentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(
    null,
  )
  const [pageCount, setPageCount] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (!entry) return
      setContainerWidth(Math.max(0, entry.contentRect.width))
    })

    observer.observe(target)
    return () => observer.disconnect()
  }, [pdfDocument])

  useEffect(() => {
    let cancelled = false
    const loadingTask: PDFDocumentLoadingTask = getDocument(previewUrl)

    void loadingTask.promise
      .then(document => {
        if (cancelled) {
          void document.destroy()
          return
        }

        pdfDocumentRef.current = document
        setPdfDocument(document)
        setPageCount(document.numPages)
      })
      .catch(error => {
        if (cancelled) return
        setError(error instanceof Error ? error.message : "PDF 加载失败")
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      void loadingTask.destroy()
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      const currentDocument = pdfDocumentRef.current
      pdfDocumentRef.current = null
      if (currentDocument) {
        void currentDocument.destroy()
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        <i className='ri-loader-4-line mr-2 animate-spin' />
        PDF 加载中…
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-full items-center justify-center px-4 text-center text-sm text-destructive'>
        {error}
      </div>
    )
  }

  if (!pdfDocument || pageCount === 0) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        当前 PDF 暂无可预览页面
      </div>
    )
  }

  const targetWidth = Math.max(Math.min(containerWidth - 24, 1080), 280)

  return (
    <div className='h-full overflow-auto'>
      <div
        ref={containerRef}
        className='mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4 p-3 sm:p-4'
      >
        {Array.from({ length: pageCount }).map((_, index) => (
          <PdfPreviewPage
            key={`${previewUrl}-${index + 1}`}
            pdfDocument={pdfDocument}
            pageNumber={index + 1}
            renderWidth={targetWidth}
            title={title}
          />
        ))}
      </div>
    </div>
  )
}

interface PdfPreviewPageProps {
  pdfDocument: PDFDocumentProxy
  pageNumber: number
  renderWidth: number
  title: string
}

function PdfPreviewPage({
  pdfDocument,
  pageNumber,
  renderWidth,
  title,
}: PdfPreviewPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageLabel, setPageLabel] = useState(`第 ${pageNumber} 页`)

  useEffect(() => {
    const cancelCurrentRender = () => {
      const currentTask = renderTaskRef.current
      if (!currentTask) return
      renderTaskRef.current = null
      currentTask.cancel()
    }

    if (!canvasRef.current || renderWidth <= 0) {
      return
    }

    let cancelled = false
    cancelCurrentRender()

    void (async () => {
      const page = await pdfDocument.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const scale = renderWidth / viewport.width
      const scaledViewport = page.getViewport({ scale })
      const canvas = canvasRef.current

      if (!canvas || cancelled) return

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const context = canvas.getContext("2d")
      if (!context) {
        setPageError("PDF 画布初始化失败")
        return
      }

      canvas.width = Math.floor(scaledViewport.width * devicePixelRatio)
      canvas.height = Math.floor(scaledViewport.height * devicePixelRatio)
      canvas.style.width = `${scaledViewport.width}px`
      canvas.style.height = `${scaledViewport.height}px`

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, canvas.width, canvas.height)

      const renderTask = page.render({
        canvas,
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
          (error instanceof Error &&
            error.name === "RenderingCancelledException")
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
      setPageError(null)
      setPageLabel(
        pdfDocument.numPages > 1 ? `第 ${pageNumber} 页` : "单页文档",
      )
    })().catch(error => {
      if (cancelled) return
      setPageError(error instanceof Error ? error.message : "PDF 渲染失败")
    })

    return () => {
      cancelled = true
      cancelCurrentRender()
    }
  }, [pageNumber, pdfDocument, renderWidth])

  return (
    <section className='border border-border bg-card'>
      <div className='flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground'>
        <span>{pageLabel}</span>
        <span className='truncate'>{title}</span>
      </div>
      <div className='overflow-auto bg-muted/20 p-3'>
        {pageError ? (
          <div className='flex min-h-40 items-center justify-center text-sm text-destructive'>
            {pageError}
          </div>
        ) : (
          <div className='flex justify-center'>
            <canvas
              ref={canvasRef}
              className='block border border-border bg-white'
            />
          </div>
        )}
      </div>
    </section>
  )
}
