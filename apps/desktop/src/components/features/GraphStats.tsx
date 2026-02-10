/**
 * Graph Stats Component
 *
 * Displays knowledge graph statistics including node count, edge count,
 * connected components, and association type distribution
 *
 * Includes legend functionality for association types
 */

import type { GraphData, AssociationType } from '@memory-prosthetic/shared'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'

// 类型颜色映射
const TYPE_COLORS: Record<AssociationType, string> = {
  semantic: '#f43f5e', // 玫瑰红
  tag: '#10b981', // 翡翠绿
  folder: '#8b5cf6', // 紫色
  time: '#f59e0b', // 琥珀色
  domain: '#6366f1', // 靛蓝
  keyword: '#06b6d4', // 青色
  topic: '#ec4899', // 粉色
  reference: '#94a3b8', // 灰色
  author: '#94a3b8', // 灰色
}

const TYPE_LABELS: Record<AssociationType, string> = {
  semantic: '语义',
  tag: '标签',
  folder: '收藏夹',
  time: '时间',
  domain: '领域',
  keyword: '关键词',
  topic: '主题',
  reference: '引用',
  author: '作者',
}

interface GraphStatsProps {
  data: GraphData
  className?: string
}

/**
 * Calculate graph statistics from graph data
 */
function calculateStats(data: GraphData) {
  const { nodes, edges } = data

  // Basic counts
  const totalNodes = nodes.length
  const totalEdges = edges.length

  // Calculate average degree
  const totalDegree = nodes.reduce((sum, node) => sum + node.degree, 0)
  const avgDegree = totalNodes > 0 ? totalDegree / totalNodes : 0

  // Count associations by type
  const edgesByType = edges.reduce((acc, edge) => {
    acc[edge.type] = (acc[edge.type] || 0) + 1
    return acc
  }, {} as Record<AssociationType, number>)

  // Calculate average weight
  const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0)
  const avgWeight = totalEdges > 0 ? totalWeight / totalEdges : 0

  return {
    totalNodes,
    totalEdges,
    avgDegree,
    edgesByType,
    avgWeight,
  }
}

export function GraphStats({ data, className }: GraphStatsProps) {
  const stats = calculateStats(data)

  return (
    <div className={className}>
      {/* 主要统计信息 */}
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{stats.totalNodes}</span> 节点
        </span>
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{stats.totalEdges}</span> 关联
        </span>
        {stats.avgDegree > 0 && (
          <span className="text-muted-foreground">
            平均度: <span className="font-medium text-foreground">{stats.avgDegree.toFixed(1)}</span>
          </span>
        )}
        {stats.avgWeight > 0 && (
          <span className="text-muted-foreground">
            平均权重: <span className="font-medium text-foreground">{stats.avgWeight.toFixed(2)}</span>
          </span>
        )}
      </div>

      {/* 图例 - 关联类型 */}
      {Object.keys(stats.edgesByType).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(stats.edgesByType).map(([type, count]) => (
            <Badge
              key={type}
              className="text-xs"
              style={{
                backgroundColor: TYPE_COLORS[type as AssociationType] + '20',
                color: TYPE_COLORS[type as AssociationType],
                border: `1px solid ${TYPE_COLORS[type as AssociationType] + '40'}`,
              }}
              variant="secondary"
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" />
              {TYPE_LABELS[type as AssociationType] || type} {count}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
