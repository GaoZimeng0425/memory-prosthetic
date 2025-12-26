/**
 * Knowledge Graph Types
 *
 * Types for knowledge graph nodes, edges, and associations
 */

export type AssociationType =
  | 'semantic'
  | 'tag'
  | 'folder'
  | 'time'
  | 'domain'
  | 'keyword'
  | 'topic'
  | 'reference'
  | 'author'

export type AssociationReason = 'auto_discovered' | 'user_created' | 'system_recommended'

export type UserFeedback = 'confirmed' | 'deleted' | 'ignored' | null

export type Association = {
  id: string
  sourceId: number
  targetId: number
  type: AssociationType
  types: AssociationType[] // 多类型组合
  weight: number // 0-1
  confidence: number // 0-1
  qualityScore: number // 0-1
  reason: AssociationReason
  userFeedback: UserFeedback
  accessCount: number
  lastAccessedAt: number | null
  isExpired: boolean
  isDirectional: boolean
  direction: 'forward' | 'backward' | 'bidirectional' | null
  createdAt: number
  updatedAt: number
  // 类型特定字段
  semanticSimilarity?: number
  sharedTags?: string[]
  sharedFolders?: string[]
  timeInterval?: number
  domain?: string
  keywordOverlap?: number
  topicMatch?: number
}

export type GraphNode = {
  id: number
  title: string
  url: string
  summary: string | null
  tags: string[]
  folder: string | null
  collectedAt: number
  degree: number // 关联度（度中心性）
}

export type GraphEdge = Association

export type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphFilters = {
  minWeight?: number
  types?: AssociationType[]
  maxNodes?: number
}

export type GraphStatistics = {
  totalNodes: number
  totalEdges: number
  nodesByType: Record<AssociationType, number>
  averageWeight: number
  averageDegree: number
}
