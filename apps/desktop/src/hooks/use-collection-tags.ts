/**
 * Collection Tags Hook
 *
 * Manages tags for a specific collection.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Tag } from '@memory-prosthetic/shared'
import { collections } from '@/apis'

interface UseCollectionTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  addTags: (tagIds: number[]) => Promise<void>
  removeTag: (tagId: number) => Promise<void>
  refresh: () => Promise<void>
}

export function useCollectionTags(collectionId: number | null): UseCollectionTagsReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['collectionTags', collectionId],
    queryFn: async () => {
      if (!collectionId) return []
      return collections.api.getCollectionTags(collectionId)
    },
    enabled: collectionId !== null && collectionId > 0,
  })

  const addTagsMutation = useMutation({
    mutationFn: async (tagIds: number[]) => {
      if (!collectionId) {
        throw new Error('Collection ID is required')
      }
      return collections.api.addCollectionTags(collectionId, tagIds)
    },
    onSuccess: async () => {
      // Invalidate all collection-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collectionTags', collectionId] }),
        queryClient.invalidateQueries({ queryKey: collections.keys.all }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ])
      // Force refetch all collection lists and stats
      await Promise.all([
        queryClient.refetchQueries({ queryKey: collections.keys.lists() }),
        queryClient.refetchQueries({ queryKey: collections.keys.stats() }),
      ])
    },
  })

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (!collectionId) {
        throw new Error('Collection ID is required')
      }
      return collections.api.removeCollectionTag(collectionId, tagId)
    },
    onSuccess: async () => {
      // Invalidate all collection-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collectionTags', collectionId] }),
        queryClient.invalidateQueries({ queryKey: collections.keys.all }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
      ])
      // Force refetch all collection lists and stats
      await Promise.all([
        queryClient.refetchQueries({ queryKey: collections.keys.lists() }),
        queryClient.refetchQueries({ queryKey: collections.keys.stats() }),
      ])
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['collectionTags', collectionId] })
  }

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    addTags: async (tagIds: number[]) => {
      return addTagsMutation.mutateAsync(tagIds)
    },
    removeTag: async (tagId: number) => {
      return removeTagMutation.mutateAsync(tagId)
    },
    refresh,
  }
}
