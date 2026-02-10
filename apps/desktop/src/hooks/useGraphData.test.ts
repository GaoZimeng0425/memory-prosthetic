/**
 * useGraphData Hook Tests
 *
 * TDD: Writing tests first for useGraphData implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { CommandResult, GraphData, GraphFilters } from '@memory-prosthetic/shared'

// Import the mocked invoke from the global setup
import { invoke } from '@tauri-apps/api/core'
import { useGraphData } from '@/hooks/useGraphData'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useGraphData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return initial loading state', () => {
      const wrapper = createWrapper()
      invoke.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useGraphData(), { wrapper })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('data fetching', () => {
    it('should fetch graph data successfully', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [
          {
            id: 1,
            title: 'Test Article 1',
            url: 'https://example.com/1',
            summary: 'Test summary',
            tags: ['test', 'article'],
            folder: 'test-folder',
            collectedAt: Date.now(),
            degree: 5,
          },
          {
            id: 2,
            title: 'Test Article 2',
            url: 'https://example.com/2',
            summary: null,
            tags: ['test'],
            folder: null,
            collectedAt: Date.now(),
            degree: 3,
          },
        ],
        edges: [
          {
            id: '1-2',
            sourceId: 1,
            targetId: 2,
            type: 'semantic',
            types: ['semantic'],
            weight: 0.85,
            confidence: 0.9,
            qualityScore: 0.8,
            reason: 'auto_discovered',
            userFeedback: null,
            accessCount: 0,
            lastAccessedAt: null,
            isExpired: false,
            isDirectional: false,
            direction: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            semanticSimilarity: 0.85,
          },
        ],
      }

      const mockResponse: CommandResult<GraphData> = {
        success: true,
        data: mockGraphData,
      }

      invoke.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toEqual(mockGraphData)
      expect(result.current.error).toBeNull()
      expect(invoke).toHaveBeenCalledWith('get_graph_data', {
        filters: {
          minWeight: undefined,
          types: undefined,
          maxNodes: undefined,
          focusedNodeId: undefined,
          maxDepth: undefined,
        },
      })
    })

    it('should pass filters to API request', async () => {
      const wrapper = createWrapper()

      const filters: GraphFilters = {
        minWeight: 0.3,
        types: ['semantic', 'tag'],
        maxNodes: 100,
        focusedNodeId: 5,
        maxDepth: 2,
      }

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockGraphData,
      })

      const { result } = renderHook(() => useGraphData(filters), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledWith('get_graph_data', {
        filters: {
          minWeight: 0.3,
          types: ['semantic', 'tag'],
          maxNodes: 100,
          focusedNodeId: 5,
          maxDepth: 2,
        },
      })
    })

    it('should handle undefined filters gracefully', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockGraphData,
      })

      const { result } = renderHook(() => useGraphData(undefined), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledWith('get_graph_data', {
        filters: {
          minWeight: undefined,
          types: undefined,
          maxNodes: undefined,
          focusedNodeId: undefined,
          maxDepth: undefined,
        },
      })
    })
  })

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const wrapper = createWrapper()

      invoke.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })

    it('should handle unsuccessful response', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch graph data',
      })

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Error should be set when success is false
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValue({
        success: true,
        data: mockGraphData,
      })

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledTimes(1)

      // Refetch
      await result.current.refetch()

      expect(invoke).toHaveBeenCalledTimes(2)
    })

    it('should refetch with updated filters', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValue({
        success: true,
        data: mockGraphData,
      })

      const { result, rerender } = renderHook(
        ({ filters }) => useGraphData(filters),
        {
          wrapper,
          initialProps: { filters: undefined as GraphFilters | undefined },
        }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledTimes(1)

      // Update filters
      const updatedFilters: GraphFilters = {
        minWeight: 0.5,
        maxNodes: 200,
      }

      rerender({ filters: updatedFilters })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledWith('get_graph_data', {
        filters: {
          minWeight: 0.5,
          types: undefined,
          maxNodes: 200,
          focusedNodeId: undefined,
          maxDepth: undefined,
        },
      })
    })
  })

  describe('query key', () => {
    it('should use correct query key', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValue({
        success: true,
        data: mockGraphData,
      })

      renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(invoke).toHaveBeenCalled()
      })

      // Verify the query was made with the correct key
      expect(invoke).toHaveBeenCalledWith('get_graph_data', expect.anything())
    })
  })

  describe('edge cases', () => {
    it('should handle empty graph data', async () => {
      const wrapper = createWrapper()

      const mockGraphData: GraphData = {
        nodes: [],
        edges: [],
      }

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockGraphData,
      })

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data?.nodes).toHaveLength(0)
      expect(result.current.data?.edges).toHaveLength(0)
      expect(result.current.error).toBeNull()
    })

    it('should handle null response data', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: null,
      })

      const { result } = renderHook(() => useGraphData(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('should handle filters with only focusedNodeId', async () => {
      const wrapper = createWrapper()

      const filters: GraphFilters = {
        focusedNodeId: 10,
        maxDepth: 1,
      }

      const mockGraphData: GraphData = {
        nodes: [
          {
            id: 10,
            title: 'Focused Node',
            url: 'https://example.com/10',
            summary: null,
            tags: [],
            folder: null,
            collectedAt: Date.now(),
            degree: 5,
          },
        ],
        edges: [],
      }

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockGraphData,
      })

      const { result } = renderHook(() => useGraphData(filters), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledWith('get_graph_data', {
        filters: {
          minWeight: undefined,
          types: undefined,
          maxNodes: undefined,
          focusedNodeId: 10,
          maxDepth: 1,
        },
      })
    })
  })
})
