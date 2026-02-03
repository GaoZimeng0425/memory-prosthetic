/**
 * APIs Module - Barrel Export
 */

// API factories
export { type CollectionsApi, createCollectionsApi, type GetCollectionsParams } from './collections'
export {
  type CreateFavoriteInput,
  createFavoritesApi,
  type FavoritesApi,
  type UpdateFavoriteInput,
} from './favorites'
export { createHealthApi, type HealthApi } from './health'
export { createSearchApi, type SearchApi, type SearchParams, type SearchResult } from './search'
export {
  type CreateTagInput,
  createTagsApi,
  type TagSortOrder,
  type TagsApi,
  type UpdateTagInput,
} from './tags'
export { type SyncApi, createSyncApi } from './sync'

// Convenience function to create all APIs at once
import type { RequestAdapter } from '../request/adapter'
import { createCollectionsApi } from './collections'
import { createFavoritesApi } from './favorites'
import { createHealthApi } from './health'
import { createSearchApi } from './search'
import { createSyncApi } from './sync'
import { createTagsApi } from './tags'

export interface ApiBundle {
  health: ReturnType<typeof createHealthApi>
  collections: ReturnType<typeof createCollectionsApi>
  favorites: ReturnType<typeof createFavoritesApi>
  tags: ReturnType<typeof createTagsApi>
  search: ReturnType<typeof createSearchApi>
  sync: ReturnType<typeof createSyncApi>
}

/**
 * Create all API instances with a single adapter
 */
export function createApis(adapter: RequestAdapter): ApiBundle {
  return {
    health: createHealthApi(adapter),
    collections: createCollectionsApi(adapter),
    favorites: createFavoritesApi(adapter),
    tags: createTagsApi(adapter),
    search: createSearchApi(adapter),
    sync: createSyncApi(adapter),
  }
}
