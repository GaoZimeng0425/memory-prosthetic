/**
 * useGraphFilters Hook
 *
 * Provides utilities for managing graph filters
 * Integrates with graph-store for state management
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setMinWeight,
 *   setTypes,
 *   setFocusMode,
 *   exitFocusMode,
 *   isFocusModeActive,
 * } = useGraphFilters()
 * ```
 */

import { useGraphStore } from '@/store/graph-store'

import type { AssociationType, GraphFilters, GraphLayout } from '@memory-prosthetic/shared'

export type AssociationTypeOption = {
  value: AssociationType
  label: string
}

export type UseGraphFiltersReturn = {
  // State
  filters: GraphFilters
  associationTypes: AssociationTypeOption[]

  // Filter state checks
  isFilterActive: () => boolean
  isTypeFilterActive: () => boolean
  isWeightFilterActive: () => boolean
  isFocusModeActive: () => boolean

  // Filter operations
  setMinWeight: (weight: number) => void
  setTypes: (types: AssociationType[] | undefined) => void
  clearTypes: () => void
  setMaxNodes: (maxNodes: number | undefined) => void
  setLayout: (layout: GraphLayout) => void

  // Focus mode operations
  setFocusMode: (nodeId: number, maxDepth?: number) => void
  exitFocusMode: () => void
  toggleFocusMode: (nodeId: number) => void

  // Reset
  resetFilters: () => void

  // Utilities
  getAssociationTypeLabel: (type: AssociationType) => string
}

const DEFAULT_FILTERS: GraphFilters = {
  minWeight: 0.2,
  maxNodes: 100,
  types: undefined,
  layout: 'force',
  focusedNodeId: undefined,
  maxDepth: undefined,
}

const ASSOCIATION_TYPE_LABELS: Record<AssociationType, string> = {
  semantic: '语义关联',
  tag: '标签关联',
  folder: '收藏夹关联',
  time: '时间关联',
  domain: '领域关联',
  keyword: '关键词关联',
  topic: '主题关联',
  reference: '引用关联',
  author: '作者关联',
}

const ASSOCIATION_TYPE_OPTIONS: AssociationTypeOption[] = [
  { value: 'semantic', label: '语义关联' },
  { value: 'tag', label: '标签关联' },
  { value: 'folder', label: '收藏夹关联' },
  { value: 'time', label: '时间关联' },
  { value: 'domain', label: '领域关联' },
  { value: 'keyword', label: '关键词关联' },
  { value: 'topic', label: '主题关联' },
]

/**
 * Hook for managing graph filters with helper functions
 */
export function useGraphFilters(): UseGraphFiltersReturn {
  const filters = useGraphStore((state) => state.filters)
  const updateFilters = useGraphStore((state) => state.updateFilters)
  const setFilters = useGraphStore((state) => state.setFilters)

  // Filter state checks
  const isFilterActive = (): boolean => {
    return (
      filters.minWeight !== DEFAULT_FILTERS.minWeight ||
      filters.maxNodes !== DEFAULT_FILTERS.maxNodes ||
      filters.types !== DEFAULT_FILTERS.types ||
      filters.layout !== DEFAULT_FILTERS.layout ||
      filters.focusedNodeId !== DEFAULT_FILTERS.focusedNodeId ||
      filters.maxDepth !== DEFAULT_FILTERS.maxDepth
    )
  }

  const isTypeFilterActive = (): boolean => {
    return filters.types !== undefined && filters.types.length > 0
  }

  const isWeightFilterActive = (): boolean => {
    return filters.minWeight !== undefined && filters.minWeight !== DEFAULT_FILTERS.minWeight
  }

  const isFocusModeActive = (): boolean => {
    return filters.focusedNodeId !== undefined
  }

  // Filter operations
  const setMinWeight = (weight: number): void => {
    // Clamp weight between 0 and 1
    const clampedWeight = Math.max(0, Math.min(1, weight))
    updateFilters({ minWeight: clampedWeight })
  }

  const setTypes = (types: AssociationType[] | undefined): void => {
    updateFilters({ types: types && types.length > 0 ? types : undefined })
  }

  const clearTypes = (): void => {
    updateFilters({ types: undefined })
  }

  const setMaxNodes = (maxNodes: number | undefined): void => {
    updateFilters({ maxNodes })
  }

  const setLayout = (layout: GraphLayout): void => {
    updateFilters({ layout })
  }

  // Focus mode operations
  const setFocusMode = (nodeId: number, maxDepth = 1): void => {
    updateFilters({
      focusedNodeId: nodeId,
      maxDepth,
    })
  }

  const exitFocusMode = (): void => {
    updateFilters({
      focusedNodeId: undefined,
      maxDepth: undefined,
    })
  }

  const toggleFocusMode = (nodeId: number): void => {
    if (filters.focusedNodeId === nodeId) {
      // Already focused on this node, exit focus mode
      exitFocusMode()
    } else {
      // Focus on new node
      setFocusMode(nodeId)
    }
  }

  // Reset
  const resetFilters = (): void => {
    setFilters({ ...DEFAULT_FILTERS })
  }

  // Utilities
  const getAssociationTypeLabel = (type: AssociationType): string => {
    return ASSOCIATION_TYPE_LABELS[type] ?? '未知类型'
  }

  return {
    filters,
    associationTypes: ASSOCIATION_TYPE_OPTIONS,

    isFilterActive,
    isTypeFilterActive,
    isWeightFilterActive,
    isFocusModeActive,

    setMinWeight,
    setTypes,
    clearTypes,
    setMaxNodes,
    setLayout,

    setFocusMode,
    exitFocusMode,
    toggleFocusMode,

    resetFilters,

    getAssociationTypeLabel,
  }
}
