/**
 * useGraphFilters Hook Tests
 *
 * TDD: Writing tests first for useGraphFilters implementation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import type { Association, AssociationType, GraphFilters } from '@memory-prosthetic/shared'
import { useGraphFilters } from '@/hooks/useGraphFilters'

// Mock graph store
const mockUpdateFilters = vi.fn()
const mockSetFilters = vi.fn()

vi.mock('@/store/graph-store', () => ({
  useGraphStore: vi.fn(),
}))

import { useGraphStore } from '@/store/graph-store'

describe('useGraphFilters', () => {
  const originalFilters = {
    minWeight: 0.2,
    maxNodes: 100,
    types: undefined,
    layout: 'force' as const,
    focusedNodeId: undefined,
    maxDepth: undefined,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the mock to return default state
    ;(useGraphStore as vi.Mock).mockImplementation((selector) => {
      const state = {
        filters: { ...originalFilters },
        updateFilters: mockUpdateFilters,
        setFilters: mockSetFilters,
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

  describe('initial state', () => {
    it('should return current filters from store', () => {
      const { result } = renderHook(() => useGraphFilters())

      expect(result.current.filters).toEqual({
        minWeight: 0.2,
        maxNodes: 100,
        types: undefined,
        layout: 'force',
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    })

    it('should return available association types', () => {
      const { result } = renderHook(() => useGraphFilters())

      expect(result.current.associationTypes).toEqual([
        { value: 'semantic', label: '语义关联' },
        { value: 'tag', label: '标签关联' },
        { value: 'folder', label: '收藏夹关联' },
        { value: 'time', label: '时间关联' },
        { value: 'domain', label: '领域关联' },
        { value: 'keyword', label: '关键词关联' },
        { value: 'topic', label: '主题关联' },
      ])
    })
  })

  describe('filtering helpers', () => {
    it('should return available association types', () => {
      const { result } = renderHook(() => useGraphFilters())

      expect(result.current.associationTypes).toEqual([
        { value: 'semantic', label: '语义关联' },
        { value: 'tag', label: '标签关联' },
        { value: 'folder', label: '收藏夹关联' },
        { value: 'time', label: '时间关联' },
        { value: 'domain', label: '领域关联' },
        { value: 'keyword', label: '关键词关联' },
        { value: 'topic', label: '主题关联' },
      ])
    })

    it('should check if filter is active', () => {
      const { result } = renderHook(() => useGraphFilters())

      // Default filters match DEFAULT_FILTERS, so not active
      expect(result.current.isFilterActive()).toBe(false)
    })

    it('should check if specific filter type is active', () => {
      const { result } = renderHook(() => useGraphFilters())

      // With default filters (same as DEFAULT_FILTERS)
      expect(result.current.isTypeFilterActive()).toBe(false) // No types set
      expect(result.current.isWeightFilterActive()).toBe(false) // minWeight matches default
      expect(result.current.isFocusModeActive()).toBe(false) // No focused node
    })

    it('should return true for focus mode when focusedNodeId is set', () => {
      ;(useGraphStore as vi.Mock).mockImplementation((selector) => {
        const state = {
          filters: {
            minWeight: 0.2,
            maxNodes: 100,
            types: undefined,
            layout: 'force' as const,
            focusedNodeId: 5,
            maxDepth: 1,
          },
          updateFilters: mockUpdateFilters,
        }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      const { result } = renderHook(() => useGraphFilters())

      expect(result.current.isFocusModeActive()).toBe(true)
    })
  })

  describe('filter operations', () => {
    it('should set min weight filter', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMinWeight(0.5)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        minWeight: 0.5,
      })
    })

    it('should set association type filter', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setTypes(['semantic', 'tag'])
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        types: ['semantic', 'tag'],
      })
    })

    it('should clear association type filter', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.clearTypes()
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        types: undefined,
      })
    })

    it('should set max nodes filter', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMaxNodes(200)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        maxNodes: 200,
      })
    })

    it('should set max nodes to undefined for unlimited', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMaxNodes(undefined)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        maxNodes: undefined,
      })
    })

    it('should set layout mode', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setLayout('circular')
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        layout: 'circular',
      })
    })
  })

  describe('focus mode', () => {
    it('should enable focus mode with node ID and max depth', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setFocusMode(10, 2)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        focusedNodeId: 10,
        maxDepth: 2,
      })
    })

    it('should enable focus mode with default max depth of 1', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setFocusMode(10)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        focusedNodeId: 10,
        maxDepth: 1,
      })
    })

    it('should exit focus mode', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.exitFocusMode()
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    })

    it('should toggle focus mode when same node is clicked', () => {
      ;(useGraphStore as vi.Mock).mockImplementation((selector) => {
        const state = {
          filters: {
            minWeight: 0.2,
            maxNodes: 100,
            types: undefined,
            layout: 'force' as const,
            focusedNodeId: 5,
            maxDepth: 1,
          },
          updateFilters: mockUpdateFilters,
          setFilters: mockSetFilters,
        }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      const { result } = renderHook(() => useGraphFilters())

      // Already focused on node 5, toggle should exit focus mode
      act(() => {
        result.current.toggleFocusMode(5)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    })

    it('should switch focus mode when different node is clicked', () => {
      ;(useGraphStore as vi.Mock).mockImplementation((selector) => {
        const state = {
          filters: {
            minWeight: 0.2,
            maxNodes: 100,
            types: undefined,
            layout: 'force' as const,
            focusedNodeId: 5,
            maxDepth: 1,
          },
          updateFilters: mockUpdateFilters,
          setFilters: mockSetFilters,
        }
        if (typeof selector === 'function') {
          return selector(state)
        }
        return state
      })

      const { result } = renderHook(() => useGraphFilters())

      // Focused on node 5, clicking node 10 should switch focus
      act(() => {
        result.current.toggleFocusMode(10)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        focusedNodeId: 10,
        maxDepth: 1,
      })
    })
  })

  describe('reset operations', () => {
    it('should reset all filters to defaults', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMinWeight(0.8)
        result.current.setTypes(['semantic'])
      })

      expect(mockUpdateFilters).toHaveBeenCalledTimes(2)

      act(() => {
        result.current.resetFilters()
      })

      expect(mockSetFilters).toHaveBeenCalledWith({
        minWeight: 0.2,
        maxNodes: 100,
        types: undefined,
        layout: 'force',
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    })
  })

  describe('association type label', () => {
    it('should return label for association type', () => {
      const { result } = renderHook(() => useGraphFilters())

      expect(result.current.getAssociationTypeLabel('semantic')).toBe('语义关联')
      expect(result.current.getAssociationTypeLabel('tag')).toBe('标签关联')
      expect(result.current.getAssociationTypeLabel('folder')).toBe('收藏夹关联')
      expect(result.current.getAssociationTypeLabel('time')).toBe('时间关联')
      expect(result.current.getAssociationTypeLabel('domain')).toBe('领域关联')
      expect(result.current.getAssociationTypeLabel('keyword')).toBe('关键词关联')
      expect(result.current.getAssociationTypeLabel('topic')).toBe('主题关联')
      expect(result.current.getAssociationTypeLabel('reference')).toBe('引用关联')
      expect(result.current.getAssociationTypeLabel('author')).toBe('作者关联')
    })

    it('should return label for unknown type', () => {
      const { result } = renderHook(() => useGraphFilters())

      // 'reference' is a valid AssociationType with label '引用关联'
      // Test with a truly invalid type
      expect(result.current.getAssociationTypeLabel('invalid' as AssociationType)).toBe('未知类型')
    })
  })

  describe('edge cases', () => {
    it('should handle setting empty types array', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setTypes([])
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        types: undefined,
      })
    })

    it('should handle setting zero max nodes', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMaxNodes(0)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        maxNodes: 0,
      })
    })

    it('should handle weight out of range (clamping)', () => {
      const { result } = renderHook(() => useGraphFilters())

      act(() => {
        result.current.setMinWeight(1.5)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        minWeight: 1, // Clamped to 1
      })

      act(() => {
        result.current.setMinWeight(-0.5)
      })

      expect(mockUpdateFilters).toHaveBeenCalledWith({
        minWeight: 0, // Clamped to 0
      })
    })
  })
})
