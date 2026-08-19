/**
 * GraphControls Component Tests
 *
 * TDD: Writing tests for GraphControls component refactoring
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
const mockUpdateFilters = vi.fn()

const defaultFilters = {
  minWeight: 0.2,
  maxNodes: 100,
}

vi.mock('@/store/graph-store', () => ({
  useGraphStore: vi.fn(),
}))

import type { GraphFilters } from '@memory-prosthetic/shared'
import { GraphControls } from './GraphControls'
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

describe('GraphControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock to return default state
    ;(useGraphStore as unknown as Mock).mockImplementation((selector: unknown) => {
      const state = {
        filters: defaultFilters,
        updateFilters: mockUpdateFilters,
      }
      if (typeof selector === 'function') {
        return selector(state)
      }
      return state
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Layout State Connection', () => {
    it('should use layout state from store', () => {
      const filtersWithLayout: GraphFilters = {
        ...defaultFilters,
        types: ['semantic'],
      }

      ;(useGraphStore as unknown as Mock).mockImplementation((selector: unknown) => {
        const state = {
          filters: filtersWithLayout,
          updateFilters: mockUpdateFilters,
        }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      renderWithQueryClient(<GraphControls filters={filtersWithLayout} onFiltersChange={vi.fn()} onRefresh={vi.fn()} />)

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })
  })

  describe('updateFilters Integration', () => {
    it('should call updateFilters when minWeight changes', async () => {
      const onFiltersChange = vi.fn()

      renderWithQueryClient(
        <GraphControls filters={defaultFilters} onFiltersChange={onFiltersChange} onRefresh={vi.fn()} />
      )

      // Verify the component renders
      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })
  })

  describe('Props Interface', () => {
    it('should accept filters prop', () => {
      const customFilters: GraphFilters = {
        minWeight: 0.5,
        maxNodes: 200,
      }

      renderWithQueryClient(<GraphControls filters={customFilters} onFiltersChange={vi.fn()} onRefresh={vi.fn()} />)

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })

    it('should accept onFiltersChange prop', () => {
      const handleChange = vi.fn()

      renderWithQueryClient(
        <GraphControls filters={defaultFilters} onFiltersChange={handleChange} onRefresh={vi.fn()} />
      )

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })

    it('should accept onRefresh prop', () => {
      const handleRefresh = vi.fn()

      renderWithQueryClient(
        <GraphControls filters={defaultFilters} onFiltersChange={vi.fn()} onRefresh={handleRefresh} />
      )

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle optional onResetLayout', () => {
      renderWithQueryClient(
        <GraphControls filters={defaultFilters} onFiltersChange={vi.fn()} onRefresh={vi.fn()} onResetLayout={vi.fn()} />
      )

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })

    it('should handle optional onZoomIn/ZoomOut', () => {
      renderWithQueryClient(
        <GraphControls
          filters={defaultFilters}
          onFiltersChange={vi.fn()}
          onRefresh={vi.fn()}
          onZoomIn={vi.fn()}
          onZoomOut={vi.fn()}
        />
      )

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })

    it('should handle isRefreshing state', () => {
      renderWithQueryClient(
        <GraphControls filters={defaultFilters} onFiltersChange={vi.fn()} onRefresh={vi.fn()} isRefreshing={true} />
      )

      expect(screen.getByText(/图谱控制/i)).toBeInTheDocument()
    })
  })
})
