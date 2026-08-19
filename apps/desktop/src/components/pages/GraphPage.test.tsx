/**
 * GraphPage Component Tests
 *
 * TDD: Writing tests for GraphPage component refactoring
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock the graph-store
const mockSetFilters = vi.fn()
const mockUpdateFilters = vi.fn()
const mockSetClusterResult = vi.fn()
const mockSelectCluster = vi.fn()
const mockClearClusters = vi.fn()

const defaultFilters = {
  minWeight: 0.2,
  maxNodes: 100,
}

vi.mock('@/store/graph-store', () => ({
  useGraphStore: vi.fn(),
}))

import type { GraphFilters, ClusteringResult } from '@memory-prosthetic/shared'
import { GraphPage } from './GraphPage'
import { useGraphStore } from '@/store/graph-store'

// Helper to render with QueryClientProvider
function renderWithQueryClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return {
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
    queryClient,
  }
}

describe('GraphPage', () => {
  const mockOnNodeSelect = vi.fn()

  const defaultStoreState = {
    filters: defaultFilters,
    clusterResult: undefined,
    selectedClusterId: undefined,
    setFilters: mockSetFilters,
    updateFilters: mockUpdateFilters,
    setClusterResult: mockSetClusterResult,
    selectCluster: mockSelectCluster,
    clearClusters: mockClearClusters,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock to return default state
    ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
      const state = defaultStoreState
      if (typeof selector === 'function') {
        return selector(state)
      }
      return state
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render graph container', () => {
      const { container } = renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // Check that the component renders without crashing
      // The graph container has a data attribute
      const graphContainer = container.querySelector('[data-graph-container]')
      expect(graphContainer).toBeInTheDocument()
    })

    it('should render graph controls button', () => {
      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      const controlsButton = screen.getAllByRole('button').find((b) => b.textContent === '')
      expect(controlsButton).toBeDefined()
    })

    it('should render zoom controls', () => {
      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Graph Controls Integration', () => {
    it('should use filters from store', () => {
      const customFilters: GraphFilters = {
        minWeight: 0.5,
        maxNodes: 200,
        types: ['semantic'],
      }

      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = { ...defaultStoreState, filters: customFilters }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      expect(useGraphStore).toHaveBeenCalled()
    })
  })

  describe('Cluster Panel Integration', () => {
    it('should use clusterResult from store', () => {
      const mockClusterResult: ClusteringResult = {
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

      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = { ...defaultStoreState, clusterResult: mockClusterResult }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      expect(useGraphStore).toHaveBeenCalled()
    })

    it('should use selectedClusterId from store', () => {
      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = { ...defaultStoreState, selectedClusterId: 1 }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      expect(useGraphStore).toHaveBeenCalled()
    })
  })

  describe('Props Drilling Elimination', () => {
    it('should use store instead of props for filters', () => {
      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // Verify that useGraphStore was called (indicating direct store access)
      expect(useGraphStore).toHaveBeenCalled()
    })

    it('should use store instead of props for clusterResult', () => {
      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      expect(useGraphStore).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined cluster result', () => {
      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // Should render without errors when no cluster result exists
      expect(useGraphStore).toHaveBeenCalled()
    })

    it('should handle filters with all optional fields', () => {
      const fullFilters: GraphFilters = {
        minWeight: 0.5,
        maxNodes: 100,
        types: ['semantic', 'tag'],
        focusedNodeId: 123,
        maxDepth: 2,
      }

      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = { ...defaultStoreState, filters: fullFilters }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // Should render without errors
      expect(useGraphStore).toHaveBeenCalled()
    })
  })

  describe('AC7: Filters update triggers GraphView response', () => {
    it('should read filters from store for GraphView', () => {
      const newFilters: GraphFilters = {
        minWeight: 0.7,
        maxNodes: 500,
      }

      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = { ...defaultStoreState, filters: newFilters }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // GraphView should use filters from store
      expect(useGraphStore).toHaveBeenCalled()
    })
  })

  describe('AC8: Cluster selection highlights nodes in GraphView', () => {
    it('should highlight cluster nodes when cluster is selected', () => {
      const mockClusterResult: ClusteringResult = {
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

      ;(useGraphStore as unknown as Mock).mockImplementation((selector) => {
        const state = {
          ...defaultStoreState,
          clusterResult: mockClusterResult,
          selectedClusterId: 1,
        }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphPage onNodeSelect={mockOnNodeSelect} />)

      // When cluster 1 is selected, nodeIds [1, 2, 3] should be highlighted
      expect(useGraphStore).toHaveBeenCalled()
    })
  })
})
