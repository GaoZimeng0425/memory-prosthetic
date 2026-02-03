/**
 * Sidebar Sync Hook
 *
 * Optimized hook for sidebar data (favorites with counts + statistics).
 * Uses unified /api/sync endpoint to avoid dual polling.
 */

import { useQuery } from '@tanstack/react-query'

import type { FavoriteWithCount, SyncStats } from '@memory-prosthetic/shared/types'
import { sync } from '@/apis'

interface UseSidebarSyncReturn {
  favorites: FavoriteWithCount[]
  stats: SyncStats | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook for sidebar synchronization data
 *
 * Returns favorites with article counts and global statistics.
 * Polls every 5 seconds to keep sidebar data fresh.
 *
 * @example
 * ```tsx
 * const { favorites, stats, isLoading } = useSidebarSync()
 *
 * return (
 *   <Sidebar>
 *     {favorites.map(fav => (
 *       <FavoriteItem key={fav.id} name={fav.name} count={fav.count} />
 *     ))}
 *     <Stats total={stats?.total} />
 *   </Sidebar>
 * )
 * ```
 */
export function useSidebarSync(): UseSidebarSyncReturn {
  const syncQuery = useQuery({
    ...sync.queries.data(),
    refetchInterval: 5000, // Poll every 5 seconds
  })

  return {
    favorites: syncQuery.data?.favorites ?? [],
    stats: syncQuery.data?.stats ?? null,
    isLoading: syncQuery.isLoading,
    error: syncQuery.error ?? null,
    refresh: async () => {
      await syncQuery.refetch()
    },
  }
}
