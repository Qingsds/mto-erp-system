import { useCallback, useEffect } from "react"

const DEFAULT_MESSAGE = "你有未保存的零件修改，确认离开当前编辑吗？"

interface UseUnsavedChangesGuardOptions {
  enabled: boolean
  message?: string
}

/**
 * Protect in-progress edits from accidental loss caused by route changes,
 * mode switches, or browser/tab close events.
 */
export function useUnsavedChangesGuard({
  enabled,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesGuardOptions) {
  const confirmDiscard = useCallback(() => {
    if (!enabled) return true
    return window.confirm(message)
  }, [enabled, message])

  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [enabled, message])

  return { confirmDiscard }
}
