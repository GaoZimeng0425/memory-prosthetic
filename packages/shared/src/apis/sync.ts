/**
 * Sync API
 *
 * Unified sync endpoint for sidebar data (favorites with counts + statistics).
 */

import { queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { SyncResponse } from '../types/collection'

const ENDPOINTS = {
  sync: '/api/sync',
  stream: '/api/sync/stream',
} as const

const SYNC_KEYS = {
  all: ['sidebar-sync'] as const,
  data: () => [...SYNC_KEYS.all, 'data'] as const,
} as const

export function createSyncApi(adapter: RequestAdapter) {
  const api = {
    /** Get sync data (favorites with counts + statistics) */
    getSync: () => adapter.get<SyncResponse>(ENDPOINTS.sync),

    /** Get collections for a specific favorite */
    getFavoriteCollections: (id: number, params?: { limit?: number; offset?: number }) =>
      adapter.get<unknown[]>(`/api/favorites/${id}/collections`, params as Record<string, unknown>),
  }

  const queries = {
    /** Sync data query options */
    data: () =>
      queryOptions({
        queryKey: SYNC_KEYS.data(),
        queryFn: api.getSync,
      }),

    /** Favorite collections query options */
    favoriteCollections: (id: number, params?: { limit?: number; offset?: number }) =>
      queryOptions({
        queryKey: ['favorite-collections', id, params],
        queryFn: () => api.getFavoriteCollections(id, params),
        enabled: id > 0,
      }),
  }

  return {
    keys: SYNC_KEYS,
    api,
    queries,
  }
}

export type SyncApi = ReturnType<typeof createSyncApi>
