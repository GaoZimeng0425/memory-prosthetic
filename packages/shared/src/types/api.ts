/**
 * HTTP API Types for Browser Extension ↔ Desktop App Communication
 *
 * These types define the contract between the browser extension
 * and the Tauri desktop app's HTTP server (localhost:21890)
 */

// ============================================
// Health Check API
// ============================================

/**
 * GET /api/health response
 */
export interface HealthResponse {
  status: 'ok' | 'error'
  version: string
}

// ============================================
// Collect API
// ============================================

/**
 * POST /api/collect request body
 * Note: Field names must be camelCase to match backend serde(rename_all = "camelCase")
 */
export interface CollectRequest {
  url: string
  title: string
  content: string
  favoriteId?: number
  tags?: number[]
}

/**
 * POST /api/collect success response
 */
export interface CollectSuccessResponse {
  success: true
  data: {
    id: number
  }
}

/**
 * API error detail
 */
export interface ApiErrorDetail {
  code: string
  message: string
}

/**
 * POST /api/collect error response
 */
export interface CollectErrorResponse {
  success: false
  error: ApiErrorDetail
}

/**
 * POST /api/collect response (union type)
 */
export type CollectResponse = CollectSuccessResponse | CollectErrorResponse

// ============================================
// Search API (Future)
// ============================================

/**
 * GET /api/search query params
 */
export interface SearchQuery {
  q: string
  limit?: number
}

/**
 * Search result item
 */
export interface SearchResultItem {
  id: number
  url: string
  title: string
  snippet?: string
  /** @deprecated Use similarity instead. Backend returns similarity field. */
  score?: number
  /** Similarity score from semantic search (0-1 range) */
  similarity?: number
  domain?: string
  createdAt?: string
}

/**
 * GET /api/search response
 */
export interface SearchResponse {
  success: true
  data: {
    results: SearchResultItem[]
    total: number
  }
}

// ============================================
// Generic API Response Types
// ============================================

/**
 * Generic API success response
 */
export interface ApiResponse<T> {
  success: true
  data: T
}

/**
 * Generic API error response
 */
export interface ApiError {
  success: false
  error: ApiErrorDetail
}

/**
 * Union type for any API response
 */
export type ApiResult<T> = ApiResponse<T> | ApiError

// ============================================
// Error Codes
// ============================================

export const API_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]
