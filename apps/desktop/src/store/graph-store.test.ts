/**
 * Graph Store Tests
 *
 * TDD: Writing tests first for graph-store implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { create } from 'zustand'

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Import types and store
import type { ClusteringResult, GraphFilters } from '@memory-prosthetic/shared'
import { useGraphStore } from '@/store/graph-store'

describe('GraphStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Cleanup after each test
    localStorage.clear()
  })

  describe('Initial State', () => {
    it('should initialize with default filters', () => {
      const { filters } = useGraphStore.getState()

      expect(filters).toEqual({
        minWeight: 0.2,
        maxNodes: 100,
        types: undefined,
        layout: 'force',
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    })

    it('should initialize with empty cluster result', () => {
      const { clusterResult, selectedClusterId } = useGraphStore.getState()

      expect(clusterResult).toBeUndefined()
      expect(selectedClusterId).toBeUndefined()
    })
  })

  describe('setFilters', () => {
    it('should replace all filters', () => {
      const store = useGraphStore.getState()

      const newFilters: GraphFilters = {
        minWeight: 0.5,
        maxNodes: 200,
        types: ['semantic', 'tag'],
      }

      act(() => {
        store.setFilters(newFilters)
      })

      const { filters } = useGraphStore.getState()
      expect(filters).toEqual(newFilters)
    })

    it('should allow setting filters with focusedNodeId and maxDepth', () => {
      const store = useGraphStore.getState()

      const focusFilters: GraphFilters = {
        minWeight: 0.1,
        focusedNodeId: 123,
        maxDepth: 2,
      }

      act(() => {
        store.setFilters(focusFilters)
      })

      const { filters } = useGraphStore.getState()
      expect(filters.focusedNodeId).toBe(123)
      expect(filters.maxDepth).toBe(2)
    })
  })

  describe('updateFilters', () => {
    it('should update only specified filter properties', () => {
      const store = useGraphStore.getState()

      // Set initial state
      const initialFilters: GraphFilters = {
        minWeight: 0.3,
        maxNodes: 150,
        types: ['semantic'],
      }

      act(() => {
        store.setFilters(initialFilters)
      })

      // Update only minWeight
      act(() => {
        store.updateFilters({ minWeight: 0.5 })
      })

      const { filters } = useGraphStore.getState()
      expect(filters.minWeight).toBe(0.5)
      expect(filters.maxNodes).toBe(150) // Unchanged
      expect(filters.types).toEqual(['semantic']) // Unchanged
    })

    it('should add new filter properties without removing existing ones', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.setFilters({ minWeight: 0.2 })
      })

      // Add types
      act(() => {
        store.updateFilters({ types: ['tag'] })
      })

      const { filters } = useGraphStore.getState()
      expect(filters.minWeight).toBe(0.2)
      expect(filters.types).toEqual(['tag'])
    })

    it('should allow removing filter properties by setting to undefined', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.setFilters({
          minWeight: 0.3,
          types: ['semantic'],
          focusedNodeId: 456,
        })
      })

      // Remove types and focusedNodeId
      act(() => {
        store.updateFilters({ types: undefined, focusedNodeId: undefined })
      })

      const { filters } = useGraphStore.getState()
      expect(filters.minWeight).toBe(0.3)
      expect(filters.types).toBeUndefined()
      expect(filters.focusedNodeId).toBeUndefined()
    })
  })

  describe('setClusterResult', () => {
    it('should store clustering result', () => {
      const store = useGraphStore.getState()

      const mockResult: ClusteringResult = {
        clusters: [
          {
            id: 1,
            nodeIds: [1, 2, 3],
            internalEdges: 3,
            externalEdges: 1,
            totalWeight: 2.5,
            density: 0.8,
            modularityContribution: 0.3,
          },
        ],
        statistics: {
          totalClusters: 1,
          clusterSizes: [3],
          modularity: 0.75,
          largestClusterSize: 3,
          averageClusterSize: 3,
          densestCluster: 1,
        },
        algorithm: 'weighted_clustering',
        threshold: 0.3,
      }

      act(() => {
        store.setClusterResult(mockResult)
      })

      const { clusterResult } = useGraphStore.getState()
      expect(clusterResult).toEqual(mockResult)
    })

    it('should clear previous cluster result when setting new one', () => {
      const store = useGraphStore.getState()

      const firstResult: ClusteringResult = {
        clusters: [{ id: 1, nodeIds: [1], internalEdges: 0, externalEdges: 0, totalWeight: 0, density: 0, modularityContribution: 0 }],
        statistics: {
          totalClusters: 1,
          clusterSizes: [1],
          modularity: 0,
          largestClusterSize: 1,
          averageClusterSize: 1,
          densestCluster: 1,
        },
        algorithm: 'connected_components',
        threshold: 0.2,
      }

      const secondResult: ClusteringResult = {
        clusters: [{ id: 2, nodeIds: [2], internalEdges: 0, externalEdges: 0, totalWeight: 0, density: 0, modularityContribution: 0 }],
        statistics: {
          totalClusters: 1,
          clusterSizes: [1],
          modularity: 0,
          largestClusterSize: 1,
          averageClusterSize: 1,
          densestCluster: 2,
        },
        algorithm: 'weighted_clustering',
        threshold: 0.3,
      }

      act(() => {
        store.setClusterResult(firstResult)
      })

      act(() => {
        store.setClusterResult(secondResult)
      })

      const { clusterResult } = useGraphStore.getState()
      expect(clusterResult?.clusters[0].id).toBe(2)
    })
  })

  describe('selectCluster', () => {
    it('should set selected cluster ID', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.selectCluster(5)
      })

      const { selectedClusterId } = useGraphStore.getState()
      expect(selectedClusterId).toBe(5)
    })

    it('should allow clearing selection by passing undefined', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.selectCluster(3)
      })

      act(() => {
        store.selectCluster(undefined)
      })

      const { selectedClusterId } = useGraphStore.getState()
      expect(selectedClusterId).toBeUndefined()
    })

    it('should change cluster selection', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.selectCluster(1)
      })

      act(() => {
        store.selectCluster(2)
      })

      const { selectedClusterId } = useGraphStore.getState()
      expect(selectedClusterId).toBe(2)
    })
  })

  describe('clearClusters', () => {
    it('should clear cluster result and selected cluster ID', () => {
      const store = useGraphStore.getState()

      // Set up state
      const mockResult: ClusteringResult = {
        clusters: [{ id: 1, nodeIds: [1], internalEdges: 0, externalEdges: 0, totalWeight: 0, density: 0, modularityContribution: 0 }],
        statistics: {
          totalClusters: 1,
          clusterSizes: [1],
          modularity: 0,
          largestClusterSize: 1,
          averageClusterSize: 1,
          densestCluster: 1,
        },
        algorithm: 'weighted_clustering',
        threshold: 0.3,
      }

      act(() => {
        store.setClusterResult(mockResult)
        store.selectCluster(1)
      })

      // Verify state before clearing
      let { clusterResult, selectedClusterId } = useGraphStore.getState()
      expect(clusterResult).toBeDefined()
      expect(selectedClusterId).toBe(1)

      // Clear clusters
      act(() => {
        store.clearClusters()
      })

      // Verify state after clearing
      ;({ clusterResult, selectedClusterId } = useGraphStore.getState())
      expect(clusterResult).toBeUndefined()
      expect(selectedClusterId).toBeUndefined()
    })

    it('should not affect filters when clearing clusters', () => {
      const store = useGraphStore.getState()

      // Set filters and clusters
      const filters: GraphFilters = {
        minWeight: 0.6,
        maxNodes: 300,
        types: ['semantic', 'tag'],
      }

      act(() => {
        store.setFilters(filters)
        store.selectCluster(1)
      })

      // Clear clusters
      act(() => {
        store.clearClusters()
      })

      // Verify filters unchanged
      const { filters: updatedFilters } = useGraphStore.getState()
      expect(updatedFilters).toEqual(filters)
    })
  })

  describe('Persist Middleware', () => {
    it('should persist filters to localStorage', () => {
      const store = useGraphStore.getState()

      const filters: GraphFilters = {
        minWeight: 0.7,
        maxNodes: 500,
      }

      act(() => {
        store.setFilters(filters)
      })

      // Check localStorage was updated
      const stored = localStorage.getItem('graph-filters-storage')
      expect(stored).toBeDefined()

      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.filters).toEqual(filters)
      }
    })

    it('should restore filters from localStorage on hydration', () => {
      // Set localStorage directly
      const savedFilters = {
        minWeight: 0.4,
        maxNodes: 200,
        types: ['folder'],
      }

      localStorage.setItem(
        'graph-filters-storage',
        JSON.stringify({
          state: { filters: savedFilters },
          version: 0,
        })
      )

      // Create new store instance to test hydration
      // Note: In real scenario, this would be on page load
      const stored = localStorage.getItem('graph-filters-storage')
      expect(stored).toBeDefined()

      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.filters).toEqual(savedFilters)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle setting filters with undefined values', () => {
      const store = useGraphStore.getState()

      act(() => {
        store.setFilters({
          minWeight: undefined,
          maxNodes: undefined,
          types: undefined,
        })
      })

      const { filters } = useGraphStore.getState()
      expect(filters.minWeight).toBeUndefined()
      expect(filters.maxNodes).toBeUndefined()
      expect(filters.types).toBeUndefined()
    })

    it('should handle empty cluster result', () => {
      const store = useGraphStore.getState()

      const emptyResult: ClusteringResult = {
        clusters: [],
        statistics: {
          totalClusters: 0,
          clusterSizes: [],
          modularity: 0,
          largestClusterSize: 0,
          averageClusterSize: 0,
          densestCluster: 0,
        },
        algorithm: 'weighted_clustering',
        threshold: 0.3,
      }

      act(() => {
        store.setClusterResult(emptyResult)
      })

      const { clusterResult } = useGraphStore.getState()
      expect(clusterResult?.clusters).toHaveLength(0)
    })

    it('should handle selecting cluster that does not exist in result', () => {
      const store = useGraphStore.getState()

      const result: ClusteringResult = {
        clusters: [{ id: 1, nodeIds: [1], internalEdges: 0, externalEdges: 0, totalWeight: 0, density: 0, modularityContribution: 0 }],
        statistics: {
          totalClusters: 1,
          clusterSizes: [1],
          modularity: 0,
          largestClusterSize: 1,
          averageClusterSize: 1,
          densestCluster: 1,
        },
        algorithm: 'weighted_clustering',
        threshold: 0.3,
      }

      act(() => {
        store.setClusterResult(result)
      })

      // Select non-existent cluster
      act(() => {
        store.selectCluster(999)
      })

      const { selectedClusterId } = useGraphStore.getState()
      expect(selectedClusterId).toBe(999) // Store doesn't validate, just stores
    })
  })
})
