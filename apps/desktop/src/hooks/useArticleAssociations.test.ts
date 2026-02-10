/**
 * useArticleAssociations Hook Tests
 *
 * TDD: Writing tests first for useArticleAssociations implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'

import type { Association, AssociationType } from '@memory-prosthetic/shared'

// Import the mocked invoke from the global setup
import { invoke } from '@tauri-apps/api/core'
import { useArticleAssociations } from '@/hooks/useArticleAssociations'

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

describe('useArticleAssociations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return initial loading state when articleId is provided', () => {
      const wrapper = createWrapper()
      invoke.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useArticleAssociations(123), { wrapper })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.associations).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should not fetch when articleId is null', () => {
      const wrapper = createWrapper()

      const { result } = renderHook(() => useArticleAssociations(null), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.associations).toEqual([])
      expect(invoke).not.toHaveBeenCalled()
    })

    it('should not fetch when articleId is undefined', () => {
      const wrapper = createWrapper()

      const { result } = renderHook(() => useArticleAssociations(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.associations).toEqual([])
      expect(invoke).not.toHaveBeenCalled()
    })
  })

  describe('data fetching', () => {
    it('should fetch associations for a given article', async () => {
      const wrapper = createWrapper()

      const mockAssociations: Association[] = [
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
        {
          id: '1-3',
          sourceId: 1,
          targetId: 3,
          type: 'tag',
          types: ['tag'],
          weight: 0.6,
          confidence: 0.7,
          qualityScore: 0.65,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sharedTags: ['react', 'typescript'],
        },
      ]

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockAssociations,
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.associations).toEqual(mockAssociations)
      expect(result.current.error).toBeNull()
      expect(invoke).toHaveBeenCalledWith('get_collection_associations', {
        collectionId: 1,
        limit: 50,
      })
    })

    it('should use default limit of 50', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const { result } = renderHook(() => useArticleAssociations(5), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledWith('get_collection_associations', {
        collectionId: 5,
        limit: 50,
      })
    })

    it('should use custom limit when provided', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const { result } = renderHook(() => useArticleAssociations(5, { limit: 20 }), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('should filter by association type when provided', async () => {
      const wrapper = createWrapper()

      const mockAssociations: Association[] = [
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
        {
          id: '1-3',
          sourceId: 1,
          targetId: 3,
          type: 'tag',
          types: ['tag'],
          weight: 0.6,
          confidence: 0.7,
          qualityScore: 0.65,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sharedTags: ['react', 'typescript'],
        },
      ]

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockAssociations,
      })

      const { result } = renderHook(
        () => useArticleAssociations(1, { types: ['semantic'] }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should filter out non-semantic associations
      expect(result.current.associations).toHaveLength(1)
      expect(result.current.associations[0].type).toBe('semantic')
    })

    it('should filter by minimum weight when provided', async () => {
      const wrapper = createWrapper()

      const mockAssociations: Association[] = [
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
        },
        {
          id: '1-3',
          sourceId: 1,
          targetId: 3,
          type: 'tag',
          types: ['tag'],
          weight: 0.3,
          confidence: 0.5,
          qualityScore: 0.4,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockAssociations,
      })

      const { result } = renderHook(() => useArticleAssociations(1, { minWeight: 0.5 }), {
        wrapper,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should filter out low weight associations
      expect(result.current.associations).toHaveLength(1)
      expect(result.current.associations[0].weight).toBeGreaterThanOrEqual(0.5)
    })

    it('should apply both type and weight filters together', async () => {
      const wrapper = createWrapper()

      const mockAssociations: Association[] = [
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
        },
        {
          id: '1-3',
          sourceId: 1,
          targetId: 3,
          type: 'tag',
          types: ['tag'],
          weight: 0.7,
          confidence: 0.8,
          qualityScore: 0.75,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockAssociations,
      })

      const { result } = renderHook(
        () => useArticleAssociations(1, { types: ['semantic'], minWeight: 0.5 }),
        { wrapper }
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.associations).toHaveLength(1)
      expect(result.current.associations[0].type).toBe('semantic')
    })
  })

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const wrapper = createWrapper()

      invoke.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.associations).toEqual([])
    })

    it('should handle unsuccessful response', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: false,
        error: 'Failed to fetch associations',
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValue({
        success: true,
        data: [],
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(invoke).toHaveBeenCalledTimes(1)

      await result.current.refetch()

      expect(invoke).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('should handle empty associations list', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.associations).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should handle null response data', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: null,
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.associations).toEqual([])
    })

    it('should handle articleId of 0', async () => {
      const wrapper = createWrapper()

      invoke.mockResolvedValueOnce({
        success: true,
        data: [],
      })

      const { result } = renderHook(() => useArticleAssociations(0), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // 0 is a valid ID, should fetch
      expect(invoke).toHaveBeenCalledWith('get_collection_associations', {
        collectionId: 0,
        limit: 50,
      })
    })

    it('should return associations sorted by weight (descending)', async () => {
      const wrapper = createWrapper()

      const mockAssociations: Association[] = [
        {
          id: '1-3',
          sourceId: 1,
          targetId: 3,
          type: 'tag',
          types: ['tag'],
          weight: 0.3,
          confidence: 0.5,
          qualityScore: 0.4,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '1-2',
          sourceId: 1,
          targetId: 2,
          type: 'semantic',
          types: ['semantic'],
          weight: 0.9,
          confidence: 0.95,
          qualityScore: 0.85,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: '1-4',
          sourceId: 1,
          targetId: 4,
          type: 'time',
          types: ['time'],
          weight: 0.6,
          confidence: 0.7,
          qualityScore: 0.65,
          reason: 'auto_discovered',
          userFeedback: null,
          accessCount: 0,
          lastAccessedAt: null,
          isExpired: false,
          isDirectional: false,
          direction: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]

      invoke.mockResolvedValueOnce({
        success: true,
        data: mockAssociations,
      })

      const { result } = renderHook(() => useArticleAssociations(1), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should be sorted by weight descending
      expect(result.current.associations[0].weight).toBe(0.9)
      expect(result.current.associations[1].weight).toBe(0.6)
      expect(result.current.associations[2].weight).toBe(0.3)
    })
  })
})
