/**
 * Cluster Card Component
 *
 * Displays detailed information about a single cluster
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Zap } from 'lucide-react'

import type { Cluster } from '@memory-prosthetic/shared'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'

interface ClusterCardProps {
  cluster: Cluster
  color: string
  isSelected?: boolean
  onSelect?: (clusterId: number) => void
}

export function ClusterCard({ cluster, color, isSelected = false, onSelect }: ClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const densityPercent = (cluster.density * 100).toFixed(1)
  const nodeCount = cluster.nodeIds.length
  const avgWeight = nodeCount > 0 ? (cluster.totalWeight / nodeCount).toFixed(2) : '0.00'

  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
      onClick={() => onSelect?.(cluster.id)}
      style={isSelected ? ({ '--tw-ring-color': color } as React.CSSProperties) : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 items-start gap-3">
            {/* 聚类颜色指示器 */}
            <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />

            {/* 聚类信息 */}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm">聚类 #{cluster.id}</CardTitle>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge className="text-xs" variant="secondary">
                  {nodeCount} 个节点
                </Badge>
                <Badge className="text-xs" variant="secondary">
                  {cluster.internalEdges} 条边
                </Badge>
              </div>
            </div>
          </div>

          {/* 展开按钮 */}
          <Button
            className="shrink-0 p-1"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            title={isExpanded ? '收起详情' : '展开详情'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {/* 统计信息 */}
      <CardContent className="space-y-3 text-sm">
        {/* 密度 */}
        <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5">
          <span className="text-muted-foreground">密度</span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${cluster.density * 100}%` }} />
            </div>
            <span className="w-8 text-right font-medium text-xs">{densityPercent}%</span>
          </div>
        </div>

        {/* 平均权重 */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            平均权重
          </span>
          <span className="font-medium text-xs">{avgWeight}</span>
        </div>

        {/* 外部边 */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">外部连接</span>
          <span className="font-medium text-xs">{cluster.externalEdges} 条</span>
        </div>

        {/* 展开详情 */}
        {isExpanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="text-xs">
              <p className="mb-2 font-medium text-muted-foreground">包含节点 (ID):</p>
              <div className="flex flex-wrap gap-1">
                {cluster.nodeIds.slice(0, 10).map((nodeId) => (
                  <Badge className="text-xs" key={nodeId} variant="outline">
                    #{nodeId}
                  </Badge>
                ))}
                {cluster.nodeIds.length > 10 && (
                  <Badge className="text-xs" variant="outline">
                    +{cluster.nodeIds.length - 10}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
