/**
 * Hybrid Request Adapter
 *
 * Automatically selects the best adapter based on runtime environment:
 * - Development environment → HTTP (better testability)
 * - Production environment → Tauri IPC (better performance)
 * - Browser extension → HTTP (compatibility)
 */

import type { RequestAdapter } from './adapter'

/**
 * Enhanced hybrid adapter with runtime switching capability
 */
export type EnhancedHybridAdapter = RequestAdapter & {
  /**
   * Switch to a specific adapter
   * @param mode - 'http' to force HTTP, 'tauri' to force Tauri IPC, 'auto' to restore automatic detection
   */
  switchAdapter: (mode: 'http' | 'tauri' | 'auto') => void

  /**
   * Get the current underlying adapter type
   */
  getCurrentAdapter: () => 'http' | 'tauri'
}

/**
 * Create a hybrid adapter that auto-switches between HTTP and Tauri
 *
 * @param options - Configuration options
 */
export function createHybridAdapter(options: {
  httpBaseUrl: string
  httpAdapter: RequestAdapter
  tauriAdapter: RequestAdapter
}): EnhancedHybridAdapter {
  let currentAdapter: RequestAdapter

  // Environment detection
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isBrowserExtension = typeof window !== 'undefined' && !window.__TAURI__

  // Initial adapter selection
  if (isBrowserExtension) {
    currentAdapter = options.httpAdapter
  } else if (isDevelopment) {
    currentAdapter = options.httpAdapter // Development uses HTTP
  } else {
    currentAdapter = options.tauriAdapter // Production uses Tauri
  }

  const getAdapterType = (): 'http' | 'tauri' => {
    return currentAdapter === options.httpAdapter ? 'http' : 'tauri'
  }

  return {
    get: <T>(endpoint: string, params?: Record<string, unknown>) =>
      currentAdapter.get<T>(endpoint, params),

    post: <T, D>(endpoint: string, data?: D) =>
      currentAdapter.post<T, D>(endpoint, data),

    put: <T, D>(endpoint: string, data?: D) =>
      currentAdapter.put<T, D>(endpoint, data),

    patch: <T, D>(endpoint: string, data?: D) =>
      currentAdapter.patch<T, D>(endpoint, data),

    delete: <T>(endpoint: string, params?: Record<string, unknown>) =>
      currentAdapter.delete<T>(endpoint, params),

    switchAdapter: (mode: 'http' | 'tauri' | 'auto') => {
      if (mode === 'auto') {
        // Restore default behavior
        if (isBrowserExtension) {
          currentAdapter = options.httpAdapter
        } else if (isDevelopment) {
          currentAdapter = options.httpAdapter
        } else {
          currentAdapter = options.tauriAdapter
        }
      } else {
        currentAdapter = mode === 'http' ? options.httpAdapter : options.tauriAdapter
      }
    },

    getCurrentAdapter: getAdapterType,
  }
}
