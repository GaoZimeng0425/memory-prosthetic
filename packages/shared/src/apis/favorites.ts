/**
 * Favorites API
 *
 * CRUD operations for favorites (folders).
 */

import { type MutationOptions, queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { Favorite } from '../types/collection'

const ENDPOINTS = {
  favorites: '/api/favorites',
  favorite: '/api/favorite',
} as const

const KEYS = {
  all: ['favorites'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: () => [...KEYS.lists()] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
}

export interface CreateFavoriteInput {
  name: string
  icon?: string
}

export interface UpdateFavoriteInput {
  name?: string
  icon?: string
}

export function createFavoritesApi(adapter: RequestAdapter) {
  const api = {
    /** Get all favorites */
    getList: () => adapter.get<Favorite[]>(ENDPOINTS.favorites),

    /** Get a single favorite by ID */
    getById: (id: number) => adapter.get<Favorite>(ENDPOINTS.favorite, { id } as Record<string, unknown>),

    /** Create a new favorite */
    create: (data: CreateFavoriteInput) => adapter.post<number>(ENDPOINTS.favorites, data),

    /** Update a favorite */
    update: (id: number, data: UpdateFavoriteInput) => adapter.patch<void>(`${ENDPOINTS.favorite}/${id}`, data),

    /** Delete a favorite */
    delete: (id: number) => adapter.delete<boolean>(`${ENDPOINTS.favorite}/${id}`),
  }

  const queries = {
    /** List favorites query options */
    list: () =>
      queryOptions({
        queryKey: KEYS.list(),
        queryFn: api.getList,
      }),

    /** Single favorite detail query options */
    detail: (id: number) =>
      queryOptions({
        queryKey: KEYS.detail(id),
        queryFn: () => api.getById(id),
        enabled: id > 0,
      }),
  }

  const mutations = {
    /** Create favorite mutation options */
    create: (): MutationOptions<number, Error, CreateFavoriteInput> => ({
      mutationKey: ['createFavorite'],
      mutationFn: api.create,
    }),

    /** Update favorite mutation options */
    update: (): MutationOptions<void, Error, { id: number; data: UpdateFavoriteInput }> => ({
      mutationKey: ['updateFavorite'],
      mutationFn: ({ id, data }) => api.update(id, data),
    }),

    /** Delete favorite mutation options */
    delete: (): MutationOptions<boolean, Error, number> => ({
      mutationKey: ['deleteFavorite'],
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

export type FavoritesApi = ReturnType<typeof createFavoritesApi>
