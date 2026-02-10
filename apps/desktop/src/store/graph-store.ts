/**
 * Graph Store
 *
 * Manages knowledge graph state using Zustand with persist middleware
 * Handles filters, clustering results, and cluster selection
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ClusteringResult, GraphFilters } from '@memory-prosthetic/shared'

export type GraphStoreState = {
  // State
  filters: GraphFilters
  clusterResult?: ClusteringResult
  selectedClusterId?: number

  // Actions
  setFilters: (filters: GraphFilters) => void
  updateFilters: (updates: Partial<GraphFilters>) => void
  setClusterResult: (result: ClusteringResult) => void
  selectCluster: (id: number | undefined) => void
  clearClusters: () => void
}

const DEFAULT_FILTERS: GraphFilters = {
  minWeight: 0.2,
  maxNodes: 100,
  types: undefined,
  layout: 'force',
  focusedNodeId: undefined,
  maxDepth: undefined,
}

const initialState: Omit<
  GraphStoreState,
  'setFilters' | 'updateFilters' | 'setClusterResult' | 'selectCluster' | 'clearClusters'
> = {
  filters: DEFAULT_FILTERS,
  clusterResult: undefined,
  selectedClusterId: undefined,
}

export const useGraphStore = create<GraphStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setFilters: (filters: GraphFilters) => {
        set({ filters })
      },

      updateFilters: (updates: Partial<GraphFilters>) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...updates,
          },
        }))
      },

      setClusterResult: (result: ClusteringResult) => {
        set({ clusterResult: result })
      },

      selectCluster: (id: number | undefined) => {
        set({ selectedClusterId: id })
      },

      clearClusters: () => {
        set({
          clusterResult: undefined,
          selectedClusterId: undefined,
        })
      },
    }),
    {
      name: 'graph-filters-storage',
      partialize: (state: GraphStoreState) => ({
        filters: state.filters,
      }),
    }
  )
)
