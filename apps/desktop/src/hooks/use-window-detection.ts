/**
 * Window Detection Hook
 *
 * Provides utilities for detecting window type and managing window-specific behavior.
 * Extracted from __root.tsx for better separation of concerns.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type WindowType = 'main' | 'search'

/**
 * Detects the current window type
 *
 * Uses window label to determine if this is the main window or search window.
 * Falls back to route path if label detection fails.
 *
 * @returns Window type ('main' | 'search')
 */
export function useWindowType(): WindowType {
  const [windowType, setWindowType] = useState<WindowType>('main')
  const navigate = useNavigate()

  useEffect(() => {
    const checkWindowType = async () => {
      try {
        const currentWindow = getCurrentWindow()
        const label = currentWindow.label
        const isSearch = label === 'search'
        setWindowType(isSearch ? 'search' : 'main')

        // If this is search window, ensure we're on /search route
        if (isSearch && window.location.pathname !== '/search') {
          console.log('[useWindowType] Search window detected, navigating to /search')
          void navigate({ to: '/search', replace: true })
        }
      } catch (error) {
        console.error('[useWindowType] Failed to get window label:', error)
        // Fallback: check by route path
        const isSearch = window.location.pathname === '/search'
        setWindowType(isSearch ? 'search' : 'main')
        if (isSearch && window.location.pathname !== '/search') {
          void navigate({ to: '/search', replace: true })
        }
      }
    }
    void checkWindowType()
  }, [navigate])

  return windowType
}

/**
 * Hook for window-specific effects
 *
 * Combines window type detection with conditional logic execution.
 * Useful for effects that should only run in specific window types.
 *
 * @param mainWindowEffect - Effect to run only in main window
 * @param searchWindowEffect - Effect to run only in search window
 * @param deps - Effect dependencies
 */
export function useWindowEffect(
  mainWindowEffect: () => void | (() => void),
  searchWindowEffect: () => void | (() => void),
  deps: unknown[] = []
) {
  const windowType = useWindowType()

  useEffect(() => {
    if (windowType === 'main') {
      return mainWindowEffect()
    } else {
      return searchWindowEffect()
    }
  }, [windowType, ...deps])
}

/**
 * Redirect hook
 *
 * Handles automatic redirects based on window type and current route.
 * Extracted from RootLayout for better separation of concerns.
 */
export function useRouteRedirects(windowType: WindowType) {
  const navigate = useNavigate()

  // Redirect root route to /all (main window only)
  useEffect(() => {
    if (windowType === 'main' && window.location.pathname === '/') {
      void navigate({ to: '/all', replace: true })
    }
  }, [navigate, windowType])

  // Redirect old /article/$articleId route to /all/article/$articleId
  useEffect(() => {
    if (windowType === 'main') {
      const pathname = window.location.pathname
      const articleMatch = pathname.match(/^\/article\/(\d+)$/)
      if (articleMatch) {
        const articleId = articleMatch[1]
        console.log('[useRouteRedirects] Redirecting old article route to /all/article/$articleId')
        void navigate({ to: '/all/article/$articleId', params: { articleId }, replace: true })
      }
    }
  }, [navigate, windowType])
}
