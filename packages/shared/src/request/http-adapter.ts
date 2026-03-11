/**
 * HTTP Request Adapter
 *
 * Uses native fetch API for HTTP requests. Suitable for browser extension
 * communicating with the desktop app's HTTP server or development testing.
 */

import type { RequestAdapter } from './adapter'

/**
 * API response wrapper from backend
 */
type ApiResponseWrapper<T> = {
  success: true
  data: T
}

/**
 * API error response wrapper
 */
type ApiErrorWrapper = {
  success: false
  error: {
    code: string
    message: string
  }
}

/**
 * Unwrap API response if it's wrapped in { success, data }
 * For error responses, preserve the error structure
 */
const unwrapResponse = <T>(data: T | ApiResponseWrapper<T> | ApiErrorWrapper): T => {
  if (typeof data === 'object' && data !== null) {
    // Check if it's an error response
    if ('success' in data && data.success === false && 'error' in data) {
      const errorWrapper = data as ApiErrorWrapper
      const error = new Error(errorWrapper.error.message)
      // Attach error code to the error object
      ;(error as Error & { code?: string }).code = errorWrapper.error.code
      throw error
    }
    // Check if it's a success response wrapper
    if ('success' in data && 'data' in data && data.success === true) {
      const wrapped = data as ApiResponseWrapper<T>
      return wrapped.data
    }
  }
  return data as T
}

/**
 * Create an HTTP adapter using native fetch
 *
 * @param baseUrl - Base URL for all requests (e.g., 'http://localhost:21890')
 */
export function createHttpAdapter(baseUrl: string): RequestAdapter {
  return {
    get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const url = new URL(endpoint, baseUrl)

      // Add query parameters with proper array serialization
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Map camelCase to snake_case for backend compatibility
            const paramKeyMap: Record<string, string> = {
              favoriteId: 'favorite_id',
              tagIds: 'tag_ids',
            }
            const paramKey = paramKeyMap[key] || key

            if (Array.isArray(value)) {
              // Serialize arrays using repeated parameter names: tag_ids=1&tag_ids=2
              // This is the standard format supported by serde_urlencoded (Axum default)
              value.forEach((item) => {
                if (item !== undefined && item !== null) {
                  url.searchParams.append(paramKey, String(item))
                }
              })
            } else {
              url.searchParams.set(paramKey, String(value))
            }
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return unwrapResponse<T>(data)
    },

    post: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const url = new URL(endpoint, baseUrl)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      return unwrapResponse<T>(responseData)
    },

    put: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const url = new URL(endpoint, baseUrl)

      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      return unwrapResponse<T>(responseData)
    },

    patch: async <T, D = unknown>(endpoint: string, data?: D): Promise<T> => {
      const url = new URL(endpoint, baseUrl)

      const response = await fetch(url.toString(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      return unwrapResponse<T>(responseData)
    },

    delete: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
      const url = new URL(endpoint, baseUrl)

      // Add query parameters with proper array serialization
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Map camelCase to snake_case for backend compatibility
            const paramKeyMap: Record<string, string> = {
              favoriteId: 'favorite_id',
              tagIds: 'tag_ids',
            }
            const paramKey = paramKeyMap[key] || key

            if (Array.isArray(value)) {
              // Serialize arrays using bracket notation: tag_ids[]=1&tag_ids[]=2
              value.forEach((item) => {
                if (item !== undefined && item !== null) {
                  url.searchParams.append(`${paramKey}[]`, String(item))
                }
              })
            } else {
              url.searchParams.set(paramKey, String(value))
            }
          }
        })
      }

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return unwrapResponse<T>(data)
    },
  }
}
