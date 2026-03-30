import { useEffect, useState } from "react"

/**
 * Delay unstable UI input before using it in side effects like network requests.
 * This keeps fast typing responsive and reduces request thrashing.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}
