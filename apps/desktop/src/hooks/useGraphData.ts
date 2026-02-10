/**
 * useGraphData Hook
 *
 * Fetches and manages knowledge graph data using TanStack Query
 * Provides data loading state, error handling, and refetch capability
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useGraphData({
 *   minWeight: 0.3,
 *   types: ['semantic'],
 *   maxNodes: 100,
 * })
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { CommandResult, GraphData, GraphFilters } from '@memory-prosthetic/shared'

interface UseGraphDataResult {
  data: GraphData | undefined
  isLoading: boolean
  error: string | null
  refetch: () => Promise<unknown>
}

/**
 * Fetches graph data from the backend with optional filters
 *
 * @param filters - Optional filters to apply to the graph data query
 * @returns Graph data, loading state, error, and refetch function
 */
export function useGraphData(filters?: GraphFilters): UseGraphDataResult {
  const query = useQuery({
    queryKey: ['graph', 'data', filters],
    queryFn: async () => {
      try {
        const result = await invoke<CommandResult<GraphData>>('get_graph_data', {
          filters: {
            minWeight: filters?.minWeight,
            types: filters?.types,
            maxNodes: filters?.maxNodes,
            focusedNodeId: filters?.focusedNodeId,
            maxDepth: filters?.maxDepth,
          },
        })

        if (!result.success) {
          throw new Error(result.error ?? 'Failed to fetch graph data')
        }

        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        throw new Error(`Failed to fetch graph data: ${message}`)
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
