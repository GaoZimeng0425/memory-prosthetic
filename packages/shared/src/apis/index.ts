/**
 * APIs Module - Barrel Export
 */

// API factories
export { type CollectionsApi, createCollectionsApi, type GetCollectionsParams } from './collections'
export { createHealthApi, type HealthApi } from './health'
export { createSearchApi, type SearchApi, type SearchParams, type SearchResult } from './search'

// Convenience function to create all APIs at once
import type { RequestAdapter } from '../request/adapter'
import { createCollectionsApi } from './collections'
import { createHealthApi } from './health'
import { createSearchApi } from './search'

export interface ApiBundle {
  health: ReturnType<typeof createHealthApi>
  collections: ReturnType<typeof createCollectionsApi>
  search: ReturnType<typeof createSearchApi>
}

/**
 * Create all API instances with a single adapter
 */
export function createApis(adapter: RequestAdapter): ApiBundle {
  return {
    health: createHealthApi(adapter),
    collections: createCollectionsApi(adapter),
    search: createSearchApi(adapter),
  }
}
