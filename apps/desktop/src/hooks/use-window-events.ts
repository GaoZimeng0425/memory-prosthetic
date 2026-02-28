/**
 * Event Listeners Hook
 *
 * Handles Tauri event listeners for cross-window communication.
 * Extracted from __root.tsx for better separation of concerns.
 */

import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

/**
 * Hook for search result selection events
 *
 * Listens for 'search:select' events from the search window
 * and navigates to the selected article in the main window.
 *
 * Only active in main window (not search window).
 *
 * @param isSearchWindow - Whether current window is the search window
 */
export function useSearchSelectListener(isSearchWindow: boolean) {
  const navigate = useNavigate()

  useEffect(() => {
    if (isSearchWindow) return // Don't listen in search window

    const unlisten = listen<{ id: number }>('search:select', async (event) => {
      console.log('[useSearchSelectListener] Received search:select event:', event.payload)
      const { id } = event.payload

      // Show and focus main window (handles hidden and minimized states)
      try {
        await invoke('show_main_window')
      } catch (error) {
        console.error('[useSearchSelectListener] Failed to show main window:', error)
        // If command fails, try direct window manipulation (fallback)
        try {
          const mainWindow = await WebviewWindow.getByLabel('main')
          if (mainWindow) {
            await mainWindow.show()
            await mainWindow.unminimize()
            await mainWindow.setFocus()
          }
        } catch (fallbackError) {
          console.error('[useSearchSelectListener] Fallback window show also failed:', fallbackError)
        }
      }

      // Navigate to article route
      void navigate({ to: '/all/article/$articleId', params: { articleId: String(id) }, resetScroll: false })
    })

    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [navigate, isSearchWindow])
}

/**
 * Hook for navigation events from tray menu
 *
 * Listens for 'navigate' events from the system tray/menu
 * and handles special navigation actions.
 *
 * Only active in main window (not search window).
 *
 * @param isSearchWindow - Whether current window is the search window
 * @param onOpenSettings - Callback to open settings dialog
 */
export function useTrayNavigationListener(
  isSearchWindow: boolean,
  onOpenSettings?: () => void
) {
  useEffect(() => {
    if (isSearchWindow) return // Don't listen in search window

    const unlisten = listen<string>('navigate', async (event) => {
      console.log('[useTrayNavigationListener] Received navigate event:', event.payload)
      const target = event.payload

      if (target === 'settings') {
        // Show main window first
        try {
          await invoke('show_main_window')
        } catch (error) {
          console.error('[useTrayNavigationListener] Failed to show main window:', error)
        }
        // Trigger settings dialog callback
        onOpenSettings?.()
      }
    })

    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [isSearchWindow, onOpenSettings])
}

/**
 * Combined hook for all window event listeners
 *
 * Convenience hook that sets up all event listeners at once.
 *
 * @param isSearchWindow - Whether current window is the search window
 * @param onOpenSettings - Callback to open settings dialog
 */
export function useWindowEventListeners(
  isSearchWindow: boolean,
  onOpenSettings?: () => void
) {
  useSearchSelectListener(isSearchWindow)
  useTrayNavigationListener(isSearchWindow, onOpenSettings)
}
