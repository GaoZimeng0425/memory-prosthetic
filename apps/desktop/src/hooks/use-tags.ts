/**
 * Tags Hook
 *
 * Fetches and manages tags data using react-query.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateTagInput, TagSortOrder, UpdateTagInput } from '@memory-prosthetic/shared/apis'
import type { Tag } from '@memory-prosthetic/shared/types'
import { tags } from '@/apis'

interface UseTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  createTag: (input: CreateTagInput) => Promise<number>
  updateTag: (id: number, input: UpdateTagInput) => Promise<void>
  deleteTag: (id: number) => Promise<boolean>
  setSort: (sort: TagSortOrder) => void
}

export function useTags(sort?: TagSortOrder): UseTagsReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    ...tags.queries.list(sort),
  })

  const createMutation = useMutation({
    ...tags.mutations.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tags.keys.lists() })
    },
  })

  const updateMutation = useMutation({
    ...tags.mutations.update(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tags.keys.lists() })
      queryClient.invalidateQueries({ queryKey: tags.keys.details() })
    },
  })

  const deleteMutation = useMutation({
    ...tags.mutations.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tags.keys.lists() })
      queryClient.invalidateQueries({ queryKey: tags.keys.details() })
      // Also invalidate collections since tag filters may change
      queryClient.invalidateQueries({ queryKey: ['collections'] })
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: tags.keys.lists() })
  }

  const setSort = (_newSort: TagSortOrder) => {
    queryClient.invalidateQueries({ queryKey: tags.keys.lists() })
  }

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refresh,
    createTag: async (input: CreateTagInput) => {
      return createMutation.mutateAsync(input)
    },
    updateTag: async (id: number, input: UpdateTagInput) => {
      return updateMutation.mutateAsync({ id, data: input })
    },
    deleteTag: async (id: number) => {
      return deleteMutation.mutateAsync(id)
    },
    setSort,
  }
}
