/**
 * Shared Types - Barrel Export
 *
 * All types used across desktop app and browser extension
 */

// API types (HTTP communication)
export type {
  ApiError,
  ApiErrorCode,
  ApiErrorDetail,
  ApiResponse,
  ApiResult,
  CollectErrorResponse,
  CollectRequest,
  CollectResponse,
  CollectSuccessResponse,
  HealthResponse,
  SearchQuery,
  SearchResponse,
  SearchResultItem,
} from './api'
export { API_ERROR_CODES } from './api'
// Collection entity types
export type {
  Collection,
  CollectionListItem,
  CollectionStats,
  CollectionWithStatus,
  CreateCollectionInput,
  EmbeddingStatus,
  UpdateCollectionInput,
} from './collection'
// Tauri IPC types
export type {
  CollectionCompletedPayload,
  CommandError,
  CommandErrorCode,
  CommandResult,
  EmbeddingProgressPayload,
  EventPayload,
  TauriEventName,
} from './tauri'
export { COMMAND_ERROR_CODES, TAURI_EVENTS } from './tauri'
