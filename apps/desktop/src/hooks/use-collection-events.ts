/**
 * Collection Events Hook
 *
 * Listens to collection events from Tauri backend and updates React Query cache optimistically.
 * This replaces polling with real-time event-driven updates.
 *
 * **Purpose:**
 * - Listen to 'collection-event' broadcasts from backend
 * - Update cache optimistically based on event type
 * - Eliminate need for refetchInterval polling
 *
 * **Event Types:**
 * - Created { id } - Invalidate collections list
 * - Updated { id } - Invalidate specific collection
 * - Deleted { id } - Remove from cache
 * - FavoriteChanged { id, favorite_id } - Update favorite in cache
 * - StarToggled { id, starred } - Update starred status in cache
 * - Archived { id } - Update status in cache
 * - Restored { id } - Update status in cache
 * - TagsChanged { id } - Invalidate collection tags
 *
 * @example
 * ```tsx
 * function App() {
 *   useCollectionEvents() // Enable event-driven updates
 *
 *   const { collections } = useCollections() // No polling needed!
 *
 *   return <CollectionList collections={collections} />
 * }
 * ```
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'

import { collections } from '@/apis'

/**
 * Collection event types from backend
 */
interface CollectionEvent {
  Created: { id: number }
  Updated: { id: number }
  Deleted: { id: number }
  FavoriteChanged: { id: number; favorite_id: number | null }
  StarToggled: { id: number; starred: boolean }
  Archived: { id: number }
  Restored: { id: number }
  TagsChanged: { id: number }
}

type CollectionEventType = keyof CollectionEvent

/**
 * Hook to listen to collection events and update cache optimistically
 *
 * This hook:
 * 1. Sets up Tauri event listener for 'collection-event'
 * 2. Updates React Query cache based on event type
 * 3. Cleans up listener on unmount
 *
 * No return value - works by side-effect on the query cache
 */
export function useCollectionEvents(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Don't set up listener in search window
    const isSearchWindow = window.location.pathname === '/search'
    if (isSearchWindow) {
      return
    }

    console.log('[useCollectionEvents] Setting up collection event listener')

    const unlistenPromise = listen<CollectionEventType & Record<string, unknown>>('collection-event', async (event) => {
      const { type, payload } = event.payload as unknown as {
        type: CollectionEventType
        payload: Record<string, unknown>
      }

      console.log('[useCollectionEvents] Received event:', type, payload)

      // Handle different event types with optimistic updates
      switch (type) {
        case 'Created': {
          // Invalidate collections list to fetch new item
          await queryClient.invalidateQueries({
            queryKey: collections.keys.lists(),
          })
          // Also invalidate stats
          await queryClient.invalidateQueries({
            queryKey: collections.keys.stats(),
          })
          break
        }

        case 'Updated': {
          // Invalidate specific collection queries (no ID needed in cache invalidation)
          await queryClient.invalidateQueries({
            queryKey: collections.keys.lists(),
          })
          break
        }

        case 'Deleted': {
          const { id } = payload as CollectionEvent['Deleted']
          // Remove from cache optimistically
          queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
              return oldData
            }
            const collections = (oldData as { data: unknown[] }).data
            return {
              ...oldData,
              data: collections.filter(
                (c: unknown) => typeof c === 'object' && c !== null && 'id' in c && (c as { id: number }).id !== id
              ),
            }
          })
          // Invalidate stats
          await queryClient.invalidateQueries({
            queryKey: collections.keys.stats(),
          })
          break
        }

        case 'FavoriteChanged': {
          const { id, favorite_id } = payload as CollectionEvent['FavoriteChanged']
          // Update favorite_id in cache
          queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
              return oldData
            }
            const collections = (oldData as { data: unknown[] }).data
            return {
              ...oldData,
              data: collections.map((item: unknown) =>
                typeof item === 'object' && item !== null && 'id' in item && (item as { id: number }).id === id
                  ? { ...item, favorite_id: favorite_id }
                  : item
              ),
            }
          })
          // Invalidate sync data (favorites list)
          await queryClient.invalidateQueries({
            queryKey: ['sync'],
          })
          break
        }

        case 'StarToggled': {
          const { id, starred } = payload as CollectionEvent['StarToggled']
          // Update starred status in cache
          queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
              return oldData
            }
            const collections = (oldData as { data: unknown[] }).data
            return {
              ...oldData,
              data: collections.map((item: unknown) =>
                typeof item === 'object' && item !== null && 'id' in item && (item as { id: number }).id === id
                  ? { ...item, starred }
                  : item
              ),
            }
          })
          // Invalidate stats (starred count)
          await queryClient.invalidateQueries({
            queryKey: collections.keys.stats(),
          })
          break
        }

        case 'Archived': {
          const { id } = payload as CollectionEvent['Archived']
          // Update status in cache
          queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
              return oldData
            }
            const collections = (oldData as { data: unknown[] }).data
            return {
              ...oldData,
              data: collections.map((item: unknown) =>
                typeof item === 'object' && item !== null && 'id' in item && (item as { id: number }).id === id
                  ? { ...item, status: 'archived' }
                  : item
              ),
            }
          })
          // Invalidate stats (archived count)
          await queryClient.invalidateQueries({
            queryKey: collections.keys.stats(),
          })
          break
        }

        case 'Restored': {
          const { id } = payload as CollectionEvent['Restored']
          // Update status in cache
          queryClient.setQueriesData({ queryKey: collections.keys.lists() }, (oldData: unknown) => {
            if (!oldData || typeof oldData !== 'object' || !('data' in oldData)) {
              return oldData
            }
            const collections = (oldData as { data: unknown[] }).data
            return {
              ...oldData,
              data: collections.map((item: unknown) =>
                typeof item === 'object' && item !== null && 'id' in item && (item as { id: number }).id === id
                  ? { ...item, status: 'active' }
                  : item
              ),
            }
          })
          // Invalidate stats (archived count)
          await queryClient.invalidateQueries({
            queryKey: collections.keys.stats(),
          })
          break
        }

        case 'TagsChanged': {
          const { id } = payload as CollectionEvent['TagsChanged']
          // Invalidate collection tags query
          await queryClient.invalidateQueries({
            queryKey: ['collection', 'tags', id],
          })
          // Invalidate collections list to show updated tags
          await queryClient.invalidateQueries({
            queryKey: collections.keys.lists(),
          })
          break
        }

        default:
          console.warn('[useCollectionEvents] Unknown event type:', type)
      }
    })

    // Cleanup function
    return () => {
      console.log('[useCollectionEvents] Cleaning up collection event listener')
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [queryClient])
}
