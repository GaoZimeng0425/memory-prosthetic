/**
 * Collections API
 *
 * CRUD operations for collected web content.
 */

import { type MutationOptions, queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { CollectRequest, CollectSuccessResponse } from '../types/api'
import type { Collection, CollectionListItem, CollectionStats, Tag } from '../types/collection'

const ENDPOINTS = {
  collections: '/api/collections',
  stats: '/api/collections/stats',
  collection: '/api/collection',
  collect: '/api/collect',
} as const

const KEYS = {
  all: ['collections'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (params?: GetCollectionsParams) =>
    [
      ...KEYS.lists(),
      {
        limit: params?.limit,
        offset: params?.offset,
        favoriteId: params?.favoriteId,
        uncategorized: params?.uncategorized,
        tagIds: params?.tagIds,
        status: params?.status,
      },
    ] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
}

export interface GetCollectionsParams {
  limit?: number
  offset?: number
  favoriteId?: number
  uncategorized?: boolean
  tagIds?: number[]
  status?: 'active' | 'archived' | 'deleted'
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
    collect: (data: CollectRequest) => adapter.post<CollectSuccessResponse['data']>(ENDPOINTS.collect, data),

    /** Delete a collection */
    delete: (id: number) => adapter.delete<void>(`${ENDPOINTS.collection}/${id}`),

    /** Set collection favorite */
    setFavorite: (id: number, favoriteId: number | null) =>
      adapter.patch<void>(`${ENDPOINTS.collection}/${id}`, { favoriteId }),

    /** Toggle starred status for a collection */
    toggleStar: (id: number) => adapter.post<boolean>(`${ENDPOINTS.collection}/toggle-star`, { id }),

    /** Get tags for a collection */
    getCollectionTags: (id: number) =>
      adapter.get<Tag[]>(`${ENDPOINTS.collection}/tags`, { collectionId: id } as Record<string, unknown>),

    /** Add tags to a collection */
    addCollectionTags: (id: number, tagIds: number[]) =>
      adapter.post<void>(`${ENDPOINTS.collection}/tags`, { collectionId: id, tagIds }),

    /** Remove a tag from a collection */
    removeCollectionTag: (id: number, tagId: number) =>
      adapter.delete<void>(`${ENDPOINTS.collection}/tag`, { collectionId: id, tagId } as Record<string, unknown>),

    /** Archive a collection */
    archive: (id: number) => adapter.post<void>(`${ENDPOINTS.collection}/archive`, { id }),

    /** Restore an archived collection */
    restore: (id: number) => adapter.post<void>(`${ENDPOINTS.collection}/restore`, { id }),

    /** Permanently delete a collection */
    permanentlyDelete: (id: number) => adapter.post<void>(`${ENDPOINTS.collection}/permanently-delete`, { id }),
  }

  const queries = {
    /** List collections query options */
    list: (params?: GetCollectionsParams) =>
      queryOptions({
        queryKey: KEYS.list(params),
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
    collect: (): MutationOptions<CollectSuccessResponse['data'], unknown, CollectRequest> => ({
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
