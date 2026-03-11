/**
 * Favorites Hook
 *
 * Fetches and manages favorites data using react-query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateFavoriteInput, UpdateFavoriteInput } from '@memory-prosthetic/shared/apis'
import type { Favorite } from '@memory-prosthetic/shared/types'
import { favorites } from '@/apis'

interface UseFavoritesReturn {
  favorites: Favorite[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createFavorite: (input: CreateFavoriteInput) => Promise<number>
  updateFavorite: (id: number, input: UpdateFavoriteInput) => Promise<void>
  deleteFavorite: (id: number) => Promise<boolean>
}

export function useFavorites(): UseFavoritesReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    ...favorites.queries.list(),
  })

  const createMutation = useMutation({
    ...favorites.mutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favorites.keys.lists() })
    },
  })

  const updateMutation = useMutation({
    ...favorites.mutations.update(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favorites.keys.lists() })
      queryClient.invalidateQueries({ queryKey: favorites.keys.details() })
    },
  })

  const deleteMutation = useMutation({
    ...favorites.mutations.delete(),
    onSuccess: () => {
      // Invalidate favorites API queries
      queryClient.invalidateQueries({ queryKey: favorites.keys.lists() })
      queryClient.invalidateQueries({ queryKey: favorites.keys.details() })
      // Invalidate sync API queries (for sidebar)
      queryClient.invalidateQueries({ queryKey: ['sidebar-sync'] })
      // Also invalidate collections since favorite counts may change
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: favorites.keys.lists() })
  }

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refresh,
    createFavorite: async (input: CreateFavoriteInput) => {
      return createMutation.mutateAsync(input)
    },
    updateFavorite: async (id: number, input: UpdateFavoriteInput) => {
      return updateMutation.mutateAsync({ id, data: input })
    },
    deleteFavorite: async (id: number) => {
      return deleteMutation.mutateAsync(id)
    },
  }
}
