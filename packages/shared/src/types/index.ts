/**
 * Shared Types - Barrel Export
 *
 * All types used across desktop app and browser extension
 */

// AI Metadata types
export type {
  AiMetadata,
  AiProcessingLog,
  ContentType,
  Difficulty,
  Domain,
  Keyword,
  Language,
  SummaryType,
  Topic,
} from './ai'
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
  CollectionStatus,
  CollectionType,
  CollectionWithStatus,
  CreateCollectionInput,
  EmbeddingStatus,
  Favorite,
  Tag,
  UpdateCollectionInput,
} from './collection'
// Knowledge Graph types
export type {
  Association,
  AssociationReason,
  AssociationType,
  ClusteringResult,
  GraphData,
  GraphEdge,
  GraphFilters,
  GraphNode,
  GraphStatistics,
  UserFeedback,
} from './graph'
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
