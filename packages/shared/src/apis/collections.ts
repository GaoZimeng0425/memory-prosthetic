/**
 * Collections API
 *
 * CRUD operations for collected web content.
 */

import { type MutationOptions, queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { CollectRequest, CollectResponse } from '../types/api'
import type { Collection, CollectionListItem, CollectionStats } from '../types/collection'

const ENDPOINTS = {
  collections: '/api/collections',
  stats: '/api/collections/stats',
  collection: '/api/collection',
  collect: '/api/collect',
} as const

const KEYS = {
  all: ['collections'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (limit?: number, offset?: number) => [...KEYS.lists(), { limit, offset }] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
}

export interface GetCollectionsParams {
  limit?: number
  offset?: number
}

export function createCollectionsApi(adapter: RequestAdapter) {
  const api = {
    /** Get paginated list of collections */
    getList: (params?: GetCollectionsParams) =>
      adapter.get<CollectionListItem[]>(ENDPOINTS.collections, params as Record<string, unknown>),

    /** Get collection statistics */
    getStats: () => adapter.get<CollectionStats>(ENDPOINTS.stats),

    /** Get a single collection by ID */
    getById: (id: number) => adapter.get<Collection>(ENDPOINTS.collection, { id } as Record<string, unknown>),

    /** Collect new content */
    collect: (data: CollectRequest) => adapter.post<CollectResponse>(ENDPOINTS.collect, data),

    /** Delete a collection */
    delete: (id: number) => adapter.delete<void>(`${ENDPOINTS.collection}/${id}`),
  }

  const queries = {
    /** List collections query options */
    list: (params?: GetCollectionsParams) =>
      queryOptions({
        queryKey: KEYS.list(params?.limit, params?.offset),
        queryFn: () => api.getList(params),
      }),

    /** Collection stats query options */
    stats: () =>
      queryOptions({
        queryKey: KEYS.stats(),
        queryFn: api.getStats,
      }),

    /** Single collection detail query options */
    detail: (id: number) =>
      queryOptions({
        queryKey: KEYS.detail(id),
        queryFn: () => api.getById(id),
        enabled: id > 0,
      }),
  }

  const mutations = {
    /** Collect content mutation options */
    collect: (): MutationOptions<CollectResponse, Error, CollectRequest> => ({
      mutationKey: ['collect'],
      mutationFn: api.collect,
    }),

    /** Delete collection mutation options */
    delete: (): MutationOptions<void, Error, number> => ({
      mutationKey: ['deleteCollection'],
      mutationFn: api.delete,
    }),
  }

  return {
    keys: KEYS,
    api,
    queries,
    mutations,
  }
}

export type CollectionsApi = ReturnType<typeof createCollectionsApi>
