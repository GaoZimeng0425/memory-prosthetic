/**
 * Cluster Panel Component
 *
 * Displays clustering results and provides controls for clustering analysis
 */

import type { ClusteringResult } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'
import { Slider } from '@memory-prosthetic/ui/components/ui/slider'
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { ClusterCard } from './ClusterCard'

interface ClusterPanelProps {
  result?: ClusteringResult
  selectedClusterId?: number
  onAlgorithmChange?: (algorithm: 'connected_components' | 'weighted_clustering') => void
  onThresholdChange?: (threshold: number) => void
  onRefresh?: () => Promise<void>
  onSelectCluster?: (clusterId: number) => void
  isLoading?: boolean
}

// 预定义的聚类颜色
const CLUSTER_COLORS = [
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f59e0b', // Amber
]

export function ClusterPanel({
  result,
  selectedClusterId,
  onAlgorithmChange,
  onThresholdChange,
  onRefresh,
  onSelectCluster,
  isLoading = false,
}: ClusterPanelProps) {
  const [algorithm, setAlgorithm] = useState<'connected_components' | 'weighted_clustering'>('weighted_clustering')
  const [threshold, setThreshold] = useState(0.3)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleAlgorithmChange = (value: string) => {
    const algo = value as 'connected_components' | 'weighted_clustering'
    setAlgorithm(algo)
    onAlgorithmChange?.(algo)
  }

  const handleThresholdChange = (value: number[]) => {
    setThreshold(value[0])
    onThresholdChange?.(value[0])
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const getClusterColor = (clusterId: number): string => {
    return CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length]
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>聚类分析</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>聚类分析</CardTitle>
          <CardDescription>计算知识图谱的聚类结构</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 算法选择 */}
          <div className="space-y-2">
            <Label>聚类算法</Label>
            <Select onValueChange={handleAlgorithmChange} value={algorithm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="connected_components">连通分量检测</SelectItem>
                <SelectItem value="weighted_clustering">权重聚类</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {algorithm === 'connected_components' ? '识别完全断开的子图' : '基于边权重的社区检测'}
            </p>
          </div>

          {/* 权重阈值 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>权重阈值</Label>
              <span className="text-sm text-muted-foreground">{threshold.toFixed(2)}</span>
            </div>
            <Slider max={1} min={0} onValueChange={handleThresholdChange} step={0.05} value={[threshold]} />
          </div>

          {/* 刷新按钮 */}
          {onRefresh && (
            <Button className="w-full" disabled={isRefreshing} onClick={handleRefresh} variant="default">
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  计算中...
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  开始分析
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">点击"开始分析"计算图谱聚类</p>
        </CardContent>
      </Card>
    )
  }

  const stats = result.statistics

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          聚类分析
        </CardTitle>
        <CardDescription>
          {result.algorithm === 'connected_components' ? '连通分量检测' : '权重聚类'} · 阈值{' '}
          {result.threshold.toFixed(2)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 统计信息 */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">聚类数量</p>
            <p className="text-xl font-bold text-foreground">{stats.totalClusters}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">平均大小</p>
            <p className="text-xl font-bold text-foreground">{stats.averageClusterSize.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">最大聚类</p>
            <p className="text-xl font-bold text-foreground">{stats.largestClusterSize}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">模块化度</p>
            <p className="text-xl font-bold text-foreground">{(stats.modularity * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* 聚类列表 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">聚类列表</h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {result.clusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                color={getClusterColor(cluster.id)}
                isSelected={selectedClusterId === cluster.id}
                onSelect={onSelectCluster}
              />
            ))}
          </div>
        </div>

        {/* 刷新按钮 */}
        {onRefresh && (
          <Button className="w-full" disabled={isRefreshing} onClick={handleRefresh} variant="outline" size="sm">
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                重新计算中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新计算
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
