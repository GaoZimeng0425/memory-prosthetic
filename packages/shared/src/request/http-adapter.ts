/**
 * HTTP Request Adapter
 *
 * Uses axios for HTTP requests. Suitable for browser extension
 * communicating with the desktop app's HTTP server.
 */

import axios, { type AxiosInstance } from 'axios'

import type { AdapterConfig, RequestAdapter } from './adapter'

const DEFAULT_TIMEOUT = 10000

/**
 * API response wrapper from backend
 */
interface ApiResponseWrapper<T> {
  success: boolean
  data: T
}

/**
 * API error response wrapper
 */
interface ApiErrorWrapper {
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
function unwrapResponse<T>(data: T | ApiResponseWrapper<T> | ApiErrorWrapper): T {
  if (typeof data === 'object' && data !== null) {
    // Check if it's an error response
    if ('success' in data && data.success === false && 'error' in data) {
      // For error responses, throw an error with the error message
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

export function createHttpAdapter(config?: AdapterConfig): RequestAdapter {
  const instance: AxiosInstance = axios.create({
    baseURL: config?.baseURL,
    timeout: config?.timeout ?? DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      ...config?.headers,
    },
  })

  return {
    get: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
      const response = await instance.get<T | ApiResponseWrapper<T>>(url, { params })
      return unwrapResponse(response.data)
    },

    post: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.post<T | ApiResponseWrapper<T>>(url, data)
      return unwrapResponse(response.data)
    },

    put: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.put<T | ApiResponseWrapper<T>>(url, data)
      return unwrapResponse(response.data)
    },

    patch: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.patch<T | ApiResponseWrapper<T>>(url, data)
      return unwrapResponse(response.data)
    },

    delete: async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
      const response = await instance.delete<T | ApiResponseWrapper<T>>(url, { params })
      return unwrapResponse(response.data)
    },
  }
}
