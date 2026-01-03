import { type RefObject, useEffect, useRef } from 'react'

export interface UseResizeObserverOptions {
  /** Callback function called when the element is resized */
  onResize?: (entry: ResizeObserverEntry) => void
  /** Debounce delay in milliseconds (default: 0, no debounce) */
  debounceMs?: number
  /** Whether the observer is enabled (default: true) */
  enabled?: boolean
}

/**
 * Hook to observe element size changes using ResizeObserver
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * useResizeObserver(containerRef, {
 *   onResize: (entry) => {
 *     console.log('Size changed:', entry.contentRect)
 *   },
 *   debounceMs: 100,
 * })
 * ```
 */
export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  options: UseResizeObserverOptions = {}
): void {
  const { onResize, debounceMs = 0, enabled = true } = options
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(onResize)

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = onResize
  }, [onResize])

  useEffect(() => {
    if (!enabled || !ref.current) {
      return
    }

    const element = ref.current

    const resizeObserver = new ResizeObserver((entries) => {
      // ResizeObserver can observe multiple elements, but we only care about the first one
      const entry = entries[0]
      if (!entry) return

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Apply debounce if specified
      if (debounceMs > 0) {
        timeoutRef.current = setTimeout(() => {
          callbackRef.current?.(entry)
        }, debounceMs)
      } else {
        // Call immediately if no debounce
        callbackRef.current?.(entry)
      }
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [ref, enabled, debounceMs])
}
