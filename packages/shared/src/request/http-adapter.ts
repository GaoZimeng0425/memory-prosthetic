/**
 * HTTP Request Adapter
 *
 * Uses axios for HTTP requests. Suitable for browser extension
 * communicating with the desktop app's HTTP server.
 */

import axios, { type AxiosInstance } from 'axios'

import type { AdapterConfig, RequestAdapter } from './adapter'

const DEFAULT_TIMEOUT = 10000

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
      const response = await instance.get<T>(url, { params })
      return response.data
    },

    post: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.post<T>(url, data)
      return response.data
    },

    put: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.put<T>(url, data)
      return response.data
    },

    patch: async <T, D = unknown>(url: string, data?: D): Promise<T> => {
      const response = await instance.patch<T>(url, data)
      return response.data
    },

    delete: async <T>(url: string): Promise<T> => {
      const response = await instance.delete<T>(url)
      return response.data
    },
  }
}
