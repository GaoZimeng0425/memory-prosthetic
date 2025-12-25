/**
 * Collection Entity Types
 *
 * Represents collected web content stored in the local SQLite database.
 * These types map to the Rust structs and SQLite schema.
 */

/**
 * Collection status
 */
export type CollectionStatus = 'active' | 'archived' | 'deleted'

/**
 * Collection entity as stored in the database
 *
 * SQLite table: collections
 * - id: INTEGER PRIMARY KEY AUTOINCREMENT
 * - url: TEXT NOT NULL UNIQUE
 * - title: TEXT NOT NULL
 * - content: TEXT NOT NULL
 * - summary: TEXT (nullable, for AI-generated summary)
 * - favorite_id: INTEGER (nullable, foreign key to favorites)
 * - status: TEXT NOT NULL DEFAULT 'active'
 * - created_at: TEXT NOT NULL (ISO 8601)
 * - updated_at: TEXT NOT NULL (ISO 8601)
 */
export type Collection = {
  id: number
  url: string
  title: string
  content: string
  summary?: string
  starred: boolean
  embeddingStatus?: EmbeddingStatus
  favoriteId?: number
  status: CollectionStatus
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
  archived: number
  deleted: number
  lastCollectedAt?: string
}

/**
 * Collection list item (lightweight for list display)
 */
export type CollectionListItem = {
  id: number
  url: string
  title: string
  domain: string
  starred: boolean
  favoriteId?: number | null
  createdAt: string
}

/**
 * Input for creating a new collection (from browser extension)
 */
export type CreateCollectionInput = {
  url: string
  title: string
  content: string
}

/**
 * Input for updating an existing collection
 */
export type UpdateCollectionInput = {
  id: number
  title?: string
  content?: string
  summary?: string
}

/**
 * Favorite (folder) entity
 */
export type Favorite = {
  id: number
  name: string
  icon?: string
  createdAt: string
  updatedAt: string
}

/**
 * Tag entity
 */
export type Tag = {
  id: number
  name: string
  color?: string
  createdAt: string
  updatedAt: string
}
