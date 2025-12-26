/**
 * Collections Hook
 *
 * Fetches and manages collection data using react-query.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { GetCollectionsParams } from '@memory-prosthetic/shared/apis'
import type { CollectionListItem, CollectionStats } from '@memory-prosthetic/shared/types'
import { collections } from '@/apis'

interface UseCollectionsReturn {
  collections: CollectionListItem[]
  stats: CollectionStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCollections(params?: GetCollectionsParams): UseCollectionsReturn {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    ...collections.queries.list({
      // Merge params first, then ensure limit and offset are always set
      ...params,
      limit: params?.limit ?? 1000,
      offset: params?.offset ?? 0,
    }),
    refetchInterval: 5000, // Poll every 5 seconds
  })

  const statsQuery = useQuery({
    ...collections.queries.stats(),
    refetchInterval: 5000,
  })

  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: collections.keys.all })])
    // Force refetch to ensure data is updated immediately
    await Promise.all([
      queryClient.refetchQueries({ queryKey: collections.keys.lists() }),
      queryClient.refetchQueries({ queryKey: collections.keys.stats() }),
    ])
  }

  return {
    collections: listQuery.data ?? [],
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    error: listQuery.error?.message ?? statsQuery.error?.message ?? null,
    refresh,
  }
}
