/**
 * Collections Hook - Main Content Area Data Fetching
 *
 * @deprecated For sidebar scenarios, use {@link useSidebarSync} instead.
 *
 * **Purpose:**
 * - Main content area: Fetch article lists with filtering, pagination, and mutations
 * - Mutation operations: setFavorite, toggleStar, archive, restore, delete, permanentlyDelete
 *
 * **When to use:**
 * - ✅ Main content area (article lists, filtering, pagination)
 * - ✅ Mutation operations (archive, delete, star, etc.)
 * - ❌ Sidebar scenarios (use {@link useSidebarSync} instead for favorites list + statistics)
 *
 * **Sidebar scenarios:**
 * For displaying favorites list with article counts and global statistics,
 * use `useSidebarSync()` which is optimized for sidebar data fetching.
 *
 * **Optimistic Updates:**
 * All mutation operations now use optimistic updates with automatic rollback on failure.
 * The UI updates instantly, and if the server operation fails, changes are rolled back.
 *
 * @example
 * ```tsx
 * // ❌ Wrong for sidebar:
 * const { collections, stats } = useCollections() // Returns articles, not favorites
 *
 * // ✅ Correct for sidebar:
 * const { favorites, stats } = useSidebarSync() // Returns favorites with counts
 *
 * // ✅ Correct for main content area:
 * const { collections, archive, delete } = useCollections({ favoriteId: 1 })
 * ```
 *
 * @see {@link useSidebarSync} for sidebar-optimized data fetching
 * @see {@link useCollectionMutations} for optimistic mutation logic
 */

import { useQuery } from '@tanstack/react-query'

import type { GetCollectionsParams } from '@memory-prosthetic/shared/apis'
import type { CollectionListItem, CollectionStats } from '@memory-prosthetic/shared/types'
import { collections } from '@/apis'
import { useCollectionMutations } from './use-collection-mutations'

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
  const listQuery = useQuery({
    ...collections.queries.list({
      // Merge params first, then ensure limit and offset are always set
      ...params,
      limit: params?.limit ?? 1000,
      offset: params?.offset ?? 0,
    }),
    // No refetchInterval - using event-driven updates via useCollectionEvents
  })

  const statsQuery = useQuery({
    ...collections.queries.stats(),
    // No refetchInterval - using event-driven updates via useCollectionEvents
  })

  // Use optimistic mutations with rollback protection
  const mutations = useCollectionMutations()

  return {
    collections: listQuery.data ?? [],
    stats: statsQuery.data ?? null,
    isLoading: listQuery.isLoading || statsQuery.isLoading,
    error: listQuery.error?.message ?? statsQuery.error?.message ?? null,
    refresh: async () => {
      // Note: With event-driven updates, explicit refresh is rarely needed
      // This method is kept for manual refresh scenarios
      await Promise.all([
        listQuery.refetch(),
        statsQuery.refetch(),
      ])
    },
    ...mutations,
  }
}
