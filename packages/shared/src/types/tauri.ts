/**
 * Tauri IPC Types
 *
 * Types for communication between React frontend and Rust backend
 * via Tauri's invoke() API.
 */

// ============================================
// Command Response Types
// ============================================

/**
 * Tauri command success response wrapper
 */
export interface CommandResult<T> {
  data: T
}

/**
 * Tauri command error response
 */
export interface CommandError {
  code: CommandErrorCode
  message: string
  details?: unknown
}

/**
 * Command error codes
 */
export const COMMAND_ERROR_CODES = {
  DB_ERROR: 'DB_ERROR',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
} as const

export type CommandErrorCode = (typeof COMMAND_ERROR_CODES)[keyof typeof COMMAND_ERROR_CODES]

// ============================================
// Tauri Event Types
// ============================================

/**
 * Tauri event names
 * Format: domain:action
 */
export const TAURI_EVENTS = {
  // Collection events
  COLLECTION_STARTED: 'collection:started',
  COLLECTION_COMPLETED: 'collection:completed',
  COLLECTION_FAILED: 'collection:failed',

  // Embedding events
  EMBEDDING_PROGRESS: 'embedding:progress',
  EMBEDDING_COMPLETED: 'embedding:completed',
  EMBEDDING_FAILED: 'embedding:failed',

  // Search events
  SEARCH_STARTED: 'search:started',
  SEARCH_COMPLETED: 'search:completed',
} as const

export type TauriEventName = (typeof TAURI_EVENTS)[keyof typeof TAURI_EVENTS]

/**
 * Collection completed event payload
 */
export interface CollectionCompletedPayload {
  id: number
  url: string
  title: string
  timestamp: string
}

/**
 * Embedding progress event payload
 */
export interface EmbeddingProgressPayload {
  collectionId: number
  progress: number // 0-100
  status: 'processing' | 'completed' | 'failed'
}

/**
 * Generic event payload with timestamp
 */
export interface EventPayload<T> {
  data: T
  timestamp: string
}
