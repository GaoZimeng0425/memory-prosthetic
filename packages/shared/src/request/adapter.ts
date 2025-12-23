/**
 * Request Adapter Interface
 *
 * Abstracts the transport layer to support different implementations:
 * - HTTP (axios) for browser extension
 * - Tauri IPC (invoke) for desktop app
 */

export interface RequestAdapter {
  /** GET request */
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>
  /** POST request */
  post<T, D = unknown>(endpoint: string, data?: D): Promise<T>
  /** PUT request */
  put<T, D = unknown>(endpoint: string, data?: D): Promise<T>
  /** PATCH request */
  patch<T, D = unknown>(endpoint: string, data?: D): Promise<T>
  /** DELETE request */
  delete<T>(endpoint: string): Promise<T>
}

export interface AdapterConfig {
  /** Base URL for HTTP requests */
  baseURL?: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Custom headers */
  headers?: Record<string, string>
}

/** Factory function type for creating adapters */
export type AdapterFactory = (config?: AdapterConfig) => RequestAdapter
