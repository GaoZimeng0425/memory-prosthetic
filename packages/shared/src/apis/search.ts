/**
 * Search API
 *
 * Semantic search across collected content.
 */

import { type MutationOptions, queryOptions } from '@tanstack/react-query'

import type { RequestAdapter } from '../request/adapter'
import type { SearchResultItem } from '../types/api'

const ENDPOINTS = {
  search: '/api/search',
} as const

const KEYS = {
  all: ['search'] as const,
  results: (query: string) => [...KEYS.all, query] as const,
}

export interface SearchParams {
  query: string
  limit?: number
}

export interface SearchResult {
  results: SearchResultItem[]
  query: string
}

export function createSearchApi(adapter: RequestAdapter) {
  const api = {
    /** Perform semantic search */
    search: (params: SearchParams) => adapter.post<SearchResult>(ENDPOINTS.search, params),
  }

  const queries = {
    /** Search results query options (for cached searches) */
    results: (query: string, limit?: number) =>
      queryOptions({
        queryKey: KEYS.results(query),
        queryFn: () => api.search({ query, limit }),
        enabled: query.trim().length > 0,
        staleTime: 60_000, // Cache for 1 minute
      }),
  }

  const mutations = {
    /** Search mutation (for imperative searches) */
    search: (): MutationOptions<SearchResult, Error, SearchParams> => ({
      mutationKey: ['search'],
      mutationFn: api.search,
    }),
  }

  return {
    keys: KEYS,
    api,
    queries,
    mutations,
  }
}

export type SearchApi = ReturnType<typeof createSearchApi>
