import { useCallback, useEffect, useRef, useState } from "react"

export type PreviewFileKind = "image" | "pdf" | "unsupported"

export interface OpenFilePreviewOptions {
  title: string
  fileKind: PreviewFileKind
  previewUrl?: string
  loadPreview?: () => Promise<Blob>
  onDownload?: () => void | Promise<void>
}

interface FilePreviewState {
  open: boolean
  title: string
  fileKind: PreviewFileKind
  previewUrl: string | null
  isLoading: boolean
  error: string | null
  onDownload?: (() => void | Promise<void>) | null
}

const DEFAULT_STATE: FilePreviewState = {
  open: false,
  title: "",
  fileKind: "unsupported",
  previewUrl: null,
  isLoading: false,
  error: null,
  onDownload: null,
}

/**
 * 受保护文件预览状态。
 *
 * 负责 blob 拉取、object URL 生命周期，以及弹层开关状态。
 */
export function useFilePreviewDialog() {
  const [state, setState] = useState<FilePreviewState>(DEFAULT_STATE)
  const ownedPreviewUrlRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)

  const revokeOwnedPreviewUrl = useCallback(() => {
    if (!ownedPreviewUrlRef.current) return
    window.URL.revokeObjectURL(ownedPreviewUrlRef.current)
    ownedPreviewUrlRef.current = null
  }, [])

  const closePreview = useCallback(() => {
    requestIdRef.current += 1
    revokeOwnedPreviewUrl()
    setState(prev => ({
      ...prev,
      open: false,
      previewUrl: null,
      isLoading: false,
      error: null,
    }))
  }, [revokeOwnedPreviewUrl])

  const openPreview = useCallback(
    async ({
      title,
      fileKind,
      previewUrl,
      loadPreview,
      onDownload,
    }: OpenFilePreviewOptions) => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      revokeOwnedPreviewUrl()

      setState({
        open: true,
        title,
        fileKind,
        previewUrl: previewUrl ?? null,
        isLoading: !previewUrl && !!loadPreview && fileKind !== "unsupported",
        error: null,
        onDownload: onDownload ?? null,
      })

      if (previewUrl || !loadPreview || fileKind === "unsupported") {
        return
      }

      try {
        const blob = await loadPreview()
        if (requestId !== requestIdRef.current) return

        const objectUrl = window.URL.createObjectURL(blob)
        ownedPreviewUrlRef.current = objectUrl
        setState(prev => ({
          ...prev,
          previewUrl: objectUrl,
          isLoading: false,
        }))
      } catch (error) {
        if (requestId !== requestIdRef.current) return

        setState(prev => ({
          ...prev,
          previewUrl: null,
          isLoading: false,
          error:
            error instanceof Error ? error.message : "文件预览加载失败",
        }))

        throw error
      }
    },
    [revokeOwnedPreviewUrl],
  )

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closePreview()
      }
    },
    [closePreview],
  )

  useEffect(() => revokeOwnedPreviewUrl, [revokeOwnedPreviewUrl])

  return {
    ...state,
    openPreview,
    closePreview,
    onOpenChange,
  }
}
