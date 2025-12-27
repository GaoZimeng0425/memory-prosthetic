/**
 * Collections Hook
 *
 * Fetches and manages collection data using react-query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { GetCollectionsParams } from '@memory-prosthetic/shared/apis'
import type { CollectionListItem, CollectionStats } from '@memory-prosthetic/shared/types'
import { collections } from '@/apis'

interface UseCollectionsReturn {
  collections: CollectionListItem[]
  stats: CollectionStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  setFavorite: (id: number, favoriteId: number | null) => Promise<void>
  toggleStar: (id: number) => Promise<void>
  archive: (id: number) => Promise<void>
  restore: (id: number) => Promise<void>
  delete: (id: number) => Promise<void>
  permanentlyDelete: (id: number) => Promise<void>
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

  // Mutations
  const setFavoriteMutation = useMutation({
    mutationFn: ({ id, favoriteId }: { id: number; favoriteId: number | null }) =>
      collections.api.setFavorite(id, favoriteId),
    onSuccess: () => {
      void refresh()
    },
  })

  const toggleStarMutation = useMutation({
    mutationFn: (id: number) => collections.api.toggleStar(id),
    onSuccess: () => {
      void refresh()
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: number) => collections.api.archive(id),
    onSuccess: () => {
      void refresh()
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => collections.api.restore(id),
    onSuccess: () => {
      void refresh()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => collections.api.delete(id),
    onSuccess: () => {
      void refresh()
    },
  })

  const permanentlyDeleteMutation = useMutation({
    mutationFn: (id: number) => collections.api.permanentlyDelete(id),
    onSuccess: () => {
      void refresh()
    },
  })

  return {
    collections: listQuery.data ?? [],
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    error: listQuery.error?.message ?? statsQuery.error?.message ?? null,
    refresh,
    setFavorite: async (id: number, favoriteId: number | null) => {
      await setFavoriteMutation.mutateAsync({ id, favoriteId })
    },
    toggleStar: async (id: number) => {
      await toggleStarMutation.mutateAsync(id)
    },
    archive: async (id: number) => {
      await archiveMutation.mutateAsync(id)
    },
    restore: async (id: number) => {
      await restoreMutation.mutateAsync(id)
    },
    delete: async (id: number) => {
      await deleteMutation.mutateAsync(id)
    },
    permanentlyDelete: async (id: number) => {
      await permanentlyDeleteMutation.mutateAsync(id)
    },
  }
}
