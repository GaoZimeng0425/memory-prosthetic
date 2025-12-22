import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

import type { CollectionListItem, CollectionStats, CommandResult } from '@/types/api'

interface UseCollectionsReturn {
  collections: CollectionListItem[]
  stats: CollectionStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useCollections(): UseCollectionsReturn {
  const [collections, setCollections] = useState<CollectionListItem[]>([])
  const [stats, setStats] = useState<CollectionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [collectionsResult, statsResult] = await Promise.all([
        invoke<CommandResult<CollectionListItem[]>>('get_collections', {
          limit: 50,
          offset: 0,
        }),
        invoke<CommandResult<CollectionStats>>('get_collection_stats'),
      ])

      setCollections(collectionsResult.data)
      setStats(statsResult.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // Poll every 5 seconds to check for new collections
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
    // biome-ignore lint/correctness/useExhaustiveDependencies: initial load only
  }, [refresh])

  return {
    collections,
    stats,
    isLoading,
    error,
    refresh,
  }
}
