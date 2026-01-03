import { useEffect } from 'react'

export interface HotkeyConfig {
  /** The main key to press (e.g., 'k', 'Enter', 'Escape') */
  key: string
  /** Whether to require Command (macOS) / Ctrl (Windows/Linux) */
  metaKey?: boolean
  /** Whether to require Control key */
  ctrlKey?: boolean
  /** Whether to require Shift key */
  shiftKey?: boolean
  /** Whether to require Alt/Option key */
  altKey?: boolean
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean
  /** Callback function when the hotkey is pressed */
  onPress: () => void
  /** Whether to prevent default behavior (default: true) */
  preventDefault?: boolean
}

/**
 * Hook to register a keyboard shortcut
 *
 * @example
 * ```tsx
 * useHotkey({
 *   key: ',',
 *   metaKey: true,
 *   onPress: () => openSettings(),
 * })
 * ```
 */
export function useHotkey(config: HotkeyConfig) {
  const {
    key,
    metaKey = false,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
    enabled = true,
    onPress,
    preventDefault = true,
  } = config

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the main key matches
      if (e.key !== key) return

      // Check modifier keys
      // For metaKey, we allow either metaKey (macOS) or ctrlKey (Windows/Linux) for cross-platform support
      const hasMetaOrCtrl = e.metaKey || e.ctrlKey
      const metaMatch = metaKey ? hasMetaOrCtrl : !hasMetaOrCtrl
      const ctrlMatch = ctrlKey ? e.ctrlKey : !e.ctrlKey
      const shiftMatch = shiftKey ? e.shiftKey : !e.shiftKey
      const altMatch = altKey ? e.altKey : !e.altKey

      if (metaMatch && ctrlMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          e.preventDefault()
          e.stopPropagation()
        }
        onPress()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, metaKey, ctrlKey, shiftKey, altKey, enabled, onPress, preventDefault])
}
