/**
 * API Types for Browser Extension
 *
 * Note: These mirror the types in @memory-prosthetic/shared
 * In a full setup, we'd import from shared package
 */

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'error'
  version: string
}

/** Collect request body */
export interface CollectRequest {
  url: string
  title: string
  content: string
  favoriteId?: number
  tags?: number[]
}

/** Collect success response */
export interface CollectSuccessResponse {
  success: true
  data: {
    id: number
  }
}

/** API error detail */
export interface ApiErrorDetail {
  code: string
  message: string
}

/** Collect error response */
export interface CollectErrorResponse {
  success: false
  error: ApiErrorDetail
}

/** Collect response union */
export type CollectResponse = CollectSuccessResponse | CollectErrorResponse

/** Connection status */
export type ConnectionStatus = 'checking' | 'connected' | 'disconnected'
