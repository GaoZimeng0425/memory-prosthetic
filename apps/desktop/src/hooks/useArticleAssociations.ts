/**
 * useArticleAssociations Hook
 *
 * Fetches and manages associations for a specific article/collection
 * Supports filtering by type and weight
 *
 * @example
 * ```tsx
 * const { associations, isLoading, error, refetch } = useArticleAssociations(articleId, {
 *   limit: 20,
 *   types: ['semantic'],
 *   minWeight: 0.5,
 * })
 * ```
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { Association, AssociationType } from '@memory-prosthetic/shared'

export interface UseArticleAssociationsOptions {
  limit?: number
  types?: AssociationType[]
  minWeight?: number
}

export interface UseArticleAssociationsResult {
  associations: Association[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<unknown>
}

/**
 * Fetches associations for a specific article/collection
 *
 * @param articleId - The ID of the article to fetch associations for (null/undefined to skip fetch)
 * @param options - Optional filters and limits
 * @returns Associations, loading state, error, and refetch function
 */
export function useArticleAssociations(
  articleId: number | null | undefined,
  options: UseArticleAssociationsOptions = {}
): UseArticleAssociationsResult {
  const { limit = 50, types, minWeight } = options

  const query = useQuery({
    enabled: articleId !== null && articleId !== undefined,
    queryKey: ['associations', 'article', articleId, limit, types, minWeight],
    queryFn: async () => {
      try {
        const result = await invoke<{ success: boolean; data: Association[]; error?: string }>(
          'get_collection_associations',
          {
            collectionId: articleId,
            limit,
          }
        )

        if (!result.success) {
          throw new Error(result.error ?? 'Failed to fetch associations')
        }

        return result.data ?? []
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        throw new Error(`Failed to fetch associations: ${message}`)
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Apply client-side filters only when data is available
  const associations = useMemo(() => {
    if (!query.data) return []

    let filtered = query.data

    // Filter by type
    if (types && types.length > 0) {
      filtered = filtered.filter((assoc) => types.includes(assoc.type))
    }

    // Filter by minimum weight
    if (minWeight !== undefined) {
      filtered = filtered.filter((assoc) => assoc.weight >= minWeight)
    }

    // Sort by weight descending (already sorted by backend, but ensure consistency)
    return filtered.sort((a, b) => b.weight - a.weight)
  }, [query.data, types, minWeight])

  return {
    associations,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
