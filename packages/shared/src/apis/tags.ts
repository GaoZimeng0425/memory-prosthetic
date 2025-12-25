/**
 * Tags API
 *
 * CRUD operations for tags.
 */

import { type MutationOptions, queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { Tag } from '../types/collection'

const ENDPOINTS = {
  tags: '/api/tags',
  tag: '/api/tag',
} as const

const KEYS = {
  all: ['tags'] as const,
  lists: () => [...KEYS.all, 'list'] as const,
  list: (sort?: string) => [...KEYS.lists(), { sort }] as const,
  details: () => [...KEYS.all, 'detail'] as const,
  detail: (id: number) => [...KEYS.details(), id] as const,
}

export interface CreateTagInput {
  name: string
  color?: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
}

export type TagSortOrder = 'name' | 'usage' | 'created'

export function createTagsApi(adapter: RequestAdapter) {
  const api = {
    /** Get all tags */
    getList: (sort?: TagSortOrder) => adapter.get<Tag[]>(ENDPOINTS.tags, { sort } as Record<string, unknown>),

    /** Get a single tag by ID */
    getById: (id: number) => adapter.get<Tag>(ENDPOINTS.tag, { id } as Record<string, unknown>),

    /** Create a new tag */
    create: (data: CreateTagInput) => adapter.post<number>(ENDPOINTS.tags, data),

    /** Update a tag */
    update: (id: number, data: UpdateTagInput) => adapter.patch<void>(`${ENDPOINTS.tag}/${id}`, data),

    /** Delete a tag */
    delete: (id: number) => adapter.delete<boolean>(`${ENDPOINTS.tag}/${id}`),
  }

  const queries = {
    /** List tags query options */
    list: (sort?: TagSortOrder) =>
      queryOptions({
        queryKey: KEYS.list(sort),
        queryFn: () => api.getList(sort),
      }),

    /** Single tag detail query options */
    detail: (id: number) =>
      queryOptions({
        queryKey: KEYS.detail(id),
        queryFn: () => api.getById(id),
        enabled: id > 0,
      }),
  }

  const mutations = {
    /** Create tag mutation options */
    create: (): MutationOptions<number, Error, CreateTagInput> => ({
      mutationKey: ['createTag'],
      mutationFn: api.create,
    }),

    /** Update tag mutation options */
    update: (): MutationOptions<void, Error, { id: number; data: UpdateTagInput }> => ({
      mutationKey: ['updateTag'],
      mutationFn: ({ id, data }) => api.update(id, data),
    }),

    /** Delete tag mutation options */
    delete: (): MutationOptions<boolean, Error, number> => ({
      mutationKey: ['deleteTag'],
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

export type TagsApi = ReturnType<typeof createTagsApi>
