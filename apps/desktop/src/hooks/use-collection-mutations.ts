/**
 * Collection Mutations Hook with Optimistic Updates
 *
 * Provides mutation operations with:
 * - Optimistic cache updates (instant UI feedback)
 * - Automatic rollback on failure
 * - Race condition protection via mutation context
 *
 * **Optimistic Update Pattern:**
 * 1. Update cache immediately (optimistic)
 * 2. Send mutation to server
 * 3. On success: keep optimistic changes
 * 4. On error: rollback to previous state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toggleStar, archive } = useCollectionMutations()
 *
 *   return (
 *     <Button onClick={() => toggleStar(123)}>
 *       Toggle Star
 *     </Button>
 *   )
 * }
 * ```
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { collections } from '@/apis'
import type { CollectionListItem } from '@memory-prosthetic/shared/types'

interface UseCollectionMutationsReturn {
  setFavorite: (id: number, favoriteId: number | null) => Promise<void>
  toggleStar: (id: number) => Promise<void>
  archive: (id: number) => Promise<void>
  restore: (id: number) => Promise<void>
  delete: (id: number) => Promise<void>
  permanentlyDelete: (id: number) => Promise<void>
}

/**
 * Helper to update collections in cache with optimistic updates
 */
function updateCollectionInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
  updates: Partial<CollectionListItem>
) {
  queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
    if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
      return oldData
    }
    const collections = (oldData as { data: CollectionListItem[] }).data
    return {
      ...oldData,
      data: collections.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }
  })
}

/**
 * Helper to remove collection from cache (for delete operations)
 */
function removeCollectionFromCache(queryClient: ReturnType<typeof useQueryClient>, id: number) {
  queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
    if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
      return oldData
    }
    const collections = (oldData as { data: CollectionListItem[] }).data
    return {
      ...oldData,
      data: collections.filter((item) => item.id !== id),
    }
  })
}

export function useCollectionMutations(): UseCollectionMutationsReturn {
  const queryClient = useQueryClient()

  // setFavorite with optimistic update
  const setFavoriteMutation = useMutation({
    mutationFn: ({ id, favoriteId }: { id: number; favoriteId: number | null }) =>
      collections.api.setFavorite(id, favoriteId),
    onMutate: async ({ id, favoriteId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      // Snapshot previous value
      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Optimistically update cache
      updateCollectionInCache(queryClient, id, { favoriteId })

      // Return context with previous value for rollback
      return { previousCollections }
    },
    onError: (error, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      console.error('[setFavorite] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: ['sync'], // Invalidate favorites list
      })
    },
  })

  // toggleStar with optimistic update
  const toggleStarMutation = useMutation({
    mutationFn: (id: number) => collections.api.toggleStar(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Find current starred state
      const currentData = queryClient.getQueriesData({
        queryKey: collections.keys.lists(),
      })
      let currentStarred = false
      // Try to find the collection in cache
      if (Array.isArray(currentData) && currentData.length > 0) {
        const [, data] = currentData[0] as [unknown, unknown]
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          Array.isArray((data as { data: CollectionListItem[] }).data)
        ) {
          const collection = (data as { data: CollectionListItem[] }).data.find((item) => item.id === id)
          if (collection) {
            currentStarred = collection.starred ?? false
          }
        }
      }

      // Optimistically update to toggled state
      updateCollectionInCache(queryClient, id, { starred: !currentStarred })

      return { previousCollections, previousStarred: currentStarred }
    },
    onError: (error, variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      // Also rollback specific collection's starred state
      if (typeof context?.previousStarred === 'boolean') {
        updateCollectionInCache(queryClient, variables, {
          starred: context.previousStarred,
        })
      }
      console.error('[toggleStar] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: collections.keys.stats(),
      })
    },
  })

  // archive with optimistic update
  const archiveMutation = useMutation({
    mutationFn: (id: number) => collections.api.archive(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Note: We don't optimistically update status since CollectionListItem doesn't include status
      // The list will be refreshed via invalidateQueries after mutation settles

      return { previousCollections }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      console.error('[archive] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: collections.keys.stats(),
      })
    },
  })

  // restore with optimistic update
  const restoreMutation = useMutation({
    mutationFn: (id: number) => collections.api.restore(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Note: We don't optimistically update status since CollectionListItem doesn't include status
      // The list will be refreshed via invalidateQueries after mutation settles

      return { previousCollections }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      console.error('[restore] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: collections.keys.stats(),
      })
    },
  })

  // delete (soft delete) with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (id: number) => collections.api.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Note: We don't optimistically update status since CollectionListItem doesn't include status
      // The list will be refreshed via invalidateQueries after mutation settles

      return { previousCollections }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      console.error('[delete] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: collections.keys.stats(),
      })
    },
  })

  // permanentlyDelete with optimistic update
  const permanentlyDeleteMutation = useMutation({
    mutationFn: (id: number) => collections.api.permanentlyDelete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousCollections = queryClient.getQueryData(collections.keys.lists())

      // Optimistically remove from cache
      removeCollectionFromCache(queryClient, id)

      return { previousCollections }
    },
    onError: (error, _variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(collections.keys.lists(), context.previousCollections)
      }
      console.error('[permanentlyDelete] Mutation failed, rolled back:', error)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collections.keys.lists(),
      })
      void queryClient.invalidateQueries({
        queryKey: collections.keys.stats(),
      })
    },
  })

  return {
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
