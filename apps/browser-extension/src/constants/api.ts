/**
 * API Configuration Constants
 */

/** Default port for the desktop app HTTP server */
export const DEFAULT_PORT = 21890

/** Default host for the desktop app HTTP server */
export const DEFAULT_HOST = '127.0.0.1'

/** Get the base URL for the API */
export const getApiBaseUrl = (port: number = DEFAULT_PORT): string => {
  return `http://${DEFAULT_HOST}:${port}`
}

/** API endpoints */
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  COLLECT: '/api/collect',
} as const

/** Connection check timeout in milliseconds */
export const CONNECTION_TIMEOUT = 3000
