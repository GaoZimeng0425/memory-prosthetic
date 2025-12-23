/**
 * Collection Entity Types
 *
 * Represents collected web content stored in the local SQLite database.
 * These types map to the Rust structs and SQLite schema.
 */

/**
 * Collection entity as stored in the database
 *
 * SQLite table: collections
 * - id: INTEGER PRIMARY KEY AUTOINCREMENT
 * - url: TEXT NOT NULL UNIQUE
 * - title: TEXT NOT NULL
 * - content: TEXT NOT NULL
 * - summary: TEXT (nullable, for AI-generated summary)
 * - created_at: TEXT NOT NULL (ISO 8601)
 * - updated_at: TEXT NOT NULL (ISO 8601)
 */
export interface Collection {
  id: number
  url: string
  title: string
  content: string
  summary?: string
  embeddingStatus?: EmbeddingStatus
  createdAt: string
  updatedAt: string
}

/**
 * Collection with embedding status
 * Used when displaying collection list with processing state
 */
export interface CollectionWithStatus extends Collection {
  embeddingStatus: EmbeddingStatus
}

/**
 * Embedding processing status
 */
export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Collection statistics for dashboard
 */
export interface CollectionStats {
  total: number
  thisWeek: number
  lastCollectedAt?: string
}

/**
 * Collection list item (lightweight for list display)
 */
export interface CollectionListItem {
  id: number
  url: string
  title: string
  domain: string
  createdAt: string
}

/**
 * Input for creating a new collection (from browser extension)
 */
export interface CreateCollectionInput {
  url: string
  title: string
  content: string
}

/**
 * Input for updating an existing collection
 */
export interface UpdateCollectionInput {
  id: number
  title?: string
  content?: string
  summary?: string
}
