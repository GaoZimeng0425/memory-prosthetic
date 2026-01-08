# 前端图聚类集成指南

## 已实现的前端组件

### 1. ClusterCard 组件
位置：`apps/desktop/src/components/features/ClusterCard.tsx`

**功能：**
- 显示单个聚类的详细信息
- 展示聚类统计（节点数、边数、密度）
- 可展开查看聚类内的节点 ID
- 支持选中状态和自定义颜色

**属性：**
```typescript
interface ClusterCardProps {
  cluster: Cluster
  color: string
  isSelected?: boolean
  onSelect?: (clusterId: number) => void
}
```

**使用示例：**
```tsx
<ClusterCard
  cluster={cluster}
  color="#f43f5e"
  isSelected={selectedId === cluster.id}
  onSelect={(id) => setSelectedId(id)}
/>
```

### 2. ClusterPanel 组件
位置：`apps/desktop/src/components/features/ClusterPanel.tsx`

**功能：**
- 显示聚类分析结果
- 提供聚类算法选择（连通分量 / 权重聚类）
- 权重阈值调整滑块
- 显示聚类统计信息
- 聚类列表和选择功能

**属性：**
```typescript
interface ClusterPanelProps {
  result?: ClusteringResult
  selectedClusterId?: number
  onAlgorithmChange?: (algorithm: 'connected_components' | 'weighted_clustering') => void
  onThresholdChange?: (threshold: number) => void
  onRefresh?: () => Promise<void>
  onSelectCluster?: (clusterId: number) => void
  isLoading?: boolean
}
```

**使用示例：**
```tsx
const [clusterResult, setClusterResult] = useState<ClusteringResult>()
const [selectedClusterId, setSelectedClusterId] = useState<number>()

<ClusterPanel
  result={clusterResult}
  selectedClusterId={selectedClusterId}
  onAlgorithmChange={(algo) => handleClusteringAlgorithm(algo)}
  onThresholdChange={(threshold) => handleThreshold(threshold)}
  onRefresh={async () => await fetchClusters()}
  onSelectCluster={setSelectedClusterId}
/>
```

## 集成到 GraphPage 的步骤

### 第一步：导入组件和类型
```tsx
import { ClusterPanel } from '@/components/features/ClusterPanel'
import type { ClusteringResult } from '@memory-prosthetic/shared'
import { invoke } from '@tauri-apps/api/core'
```

### 第二步：添加状态管理
```tsx
const [clusterResult, setClusterResult] = useState<ClusteringResult>()
const [selectedClusterId, setSelectedClusterId] = useState<number>()
const [clusterAlgorithm, setClusterAlgorithm] = useState<'connected_components' | 'weighted_clustering'>('weighted_clustering')
const [clusterThreshold, setClusterThreshold] = useState(0.3)
const [isClusterLoading, setIsClusterLoading] = useState(false)
```

### 第三步：实现聚类查询函数
```tsx
const fetchClusters = async () => {
  setIsClusterLoading(true)
  try {
    const result = await invoke<CommandResult<ClusteringResult>>('get_graph_clusters', {
      algorithm: clusterAlgorithm,
      minWeight: clusterThreshold,
    })
    setClusterResult(result.data)
    setSelectedClusterId(undefined) // 重置选择
  } catch (error) {
    console.error('Failed to fetch clusters:', error)
  } finally {
    setIsClusterLoading(false)
  }
}
```

### 第四步：在 GraphPage 中集成 ClusterPanel
```tsx
<div className="flex h-full gap-4">
  {/* Cluster Panel - 左侧边栏 */}
  <div className="w-80 overflow-hidden border-r bg-slate-50">
    <ClusterPanel
      result={clusterResult}
      selectedClusterId={selectedClusterId}
      onAlgorithmChange={(algo) => {
        setClusterAlgorithm(algo)
        // 自动重新计算
        setTimeout(() => fetchClusters(), 100)
      }}
      onThresholdChange={(threshold) => {
        setClusterThreshold(threshold)
        // 防抖：延迟重新计算
        setTimeout(() => fetchClusters(), 500)
      }}
      onRefresh={fetchClusters}
      onSelectCluster={setSelectedClusterId}
      isLoading={isClusterLoading}
    />
  </div>

  {/* Graph View - 右侧主体 */}
  <div className="flex-1 overflow-hidden">
    <GraphView
      filters={filters}
      onNodeClick={onNodeSelect}
      onEdgeClick={handleEdgeClick}
      ref={graphViewRef}
      highlightedClusterId={selectedClusterId}
      clusterColors={getClusterColorsMap(clusterResult)}
    />
  </div>
</div>
```

## 与 GraphView 集成

### 传递聚类信息给 GraphView
```tsx
// 创建聚类颜色映射
const getClusterColorsMap = (result?: ClusteringResult) => {
  if (!result) return {}
  const colors: Record<number, string> = {}
  const clusterColors = [
    '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
  ]
  result.clusters.forEach((cluster, index) => {
    cluster.nodeIds.forEach((nodeId) => {
      colors[nodeId] = clusterColors[index % clusterColors.length]
    })
  })
  return colors
}

// 传递给 GraphView
<GraphView
  clusterNodeColors={getClusterColorsMap(clusterResult)}
  highlightedClusterId={selectedClusterId}
/>
```

### GraphView 中的聚类着色实现
在 GraphView 的节点样式部分：

```tsx
// 在 node 配置中添加
fill: (d: Record<string, unknown>) => {
  const data = d.data as GraphNodeData['data'] | undefined
  const nodeId = data?.originalId
  
  // 如果有聚类颜色，使用聚类颜色
  if (clusterNodeColors && nodeId && nodeId in clusterNodeColors) {
    return clusterNodeColors[nodeId]
  }
  
  // 焦点节点特殊高亮
  if (data?.isFocused) {
    return '#f59e0b'
  }
  
  // 默认根据度中心性着色
  return getNodeFill(data?.degree ?? 0)
}
```

## 完整集成示例

```tsx
// GraphPage.tsx
import { useState } from 'react'
import type { ClusteringResult, CommandResult, GraphFilters } from '@memory-prosthetic/shared'
import { invoke } from '@tauri-apps/api/core'
import { ClusterPanel } from '@/components/features/ClusterPanel'
import { GraphView, type GraphViewRef } from '@/components/features/GraphView'

export function GraphPage({ onNodeSelect }: GraphPageProps) {
  const [filters, setFilters] = useState<GraphFilters>({ minWeight: 0.3 })
  const [clusterResult, setClusterResult] = useState<ClusteringResult>()
  const [selectedClusterId, setSelectedClusterId] = useState<number>()
  const [clusterAlgorithm, setClusterAlgorithm] = useState<'connected_components' | 'weighted_clustering'>('weighted_clustering')
  const [clusterThreshold, setClusterThreshold] = useState(0.3)
  const [isClusterLoading, setIsClusterLoading] = useState(false)
  const graphViewRef = useRef<GraphViewRef>(null)

  const fetchClusters = async () => {
    setIsClusterLoading(true)
    try {
      const result = await invoke<CommandResult<ClusteringResult>>('get_graph_clusters', {
        algorithm: clusterAlgorithm,
        minWeight: clusterThreshold,
      })
      setClusterResult(result.data)
      setSelectedClusterId(undefined)
    } catch (error) {
      console.error('Failed to fetch clusters:', error)
    } finally {
      setIsClusterLoading(false)
    }
  }

  const getClusterColorsMap = (result?: ClusteringResult) => {
    if (!result) return {}
    const colors: Record<number, string> = {}
    const clusterColors = [
      '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6',
    ]
    result.clusters.forEach((cluster, index) => {
      cluster.nodeIds.forEach((nodeId) => {
        colors[nodeId] = clusterColors[index % clusterColors.length]
      })
    })
    return colors
  }

  return (
    <div className="flex h-full gap-4">
      <div className="w-80 overflow-hidden border-r bg-slate-50">
        <ClusterPanel
          result={clusterResult}
          selectedClusterId={selectedClusterId}
          onAlgorithmChange={(algo) => {
            setClusterAlgorithm(algo)
            setTimeout(() => fetchClusters(), 100)
          }}
          onThresholdChange={(threshold) => {
            setClusterThreshold(threshold)
          }}
          onRefresh={fetchClusters}
          onSelectCluster={setSelectedClusterId}
          isLoading={isClusterLoading}
        />
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border">
        <GraphView
          filters={filters}
          onNodeClick={onNodeSelect}
          ref={graphViewRef}
          clusterNodeColors={getClusterColorsMap(clusterResult)}
          highlightedClusterId={selectedClusterId}
        />
      </div>
    </div>
  )
}
```

## 样式和主题

### 聚类颜色方案
默认使用 12 种颜色循环分配给聚类：
- Rose: `#f43f5e`
- Orange: `#f97316`
- Yellow: `#eab308`
- Green: `#22c55e`
- Cyan: `#06b6d4`
- Blue: `#3b82f6`
- Purple: `#8b5cf6`
- Pink: `#ec4899`
- Indigo: `#6366f1`
- Teal: `#14b8a6`
- Lime: `#84cc16`
- Amber: `#f59e0b`

### 响应式设计
- 聚类面板在桌面上为固定宽度 (320px)
- 在移动设备上可滑动或收起
- 聚类卡片支持展开/收起详情

## 性能优化

### 缓存聚类结果
```tsx
const {
  data: clusterResult,
  refetch: refetchClusters,
  isLoading: isClusterLoading,
} = useQuery({
  queryKey: ['clusters', clusterAlgorithm, clusterThreshold],
  queryFn: async () => {
    const result = await invoke<CommandResult<ClusteringResult>>('get_graph_clusters', {
      algorithm: clusterAlgorithm,
      minWeight: clusterThreshold,
    })
    return result.data
  },
})
```

### 防抖阈值变化
```tsx
const debouncedThresholdChange = useCallback(
  debounce((threshold: number) => {
    setClusterThreshold(threshold)
  }, 500),
  []
)
```

## 常见问题

### Q: 如何在聚类面板中显示关联统计？
A: ClusterPanel 已在统计信息部分显示：
- 聚类数量
- 平均大小
- 最大聚类大小
- 模块化度

### Q: 如何让选中的聚类节点在图上高亮？
A: 通过 `highlightedClusterId` 和 `clusterNodeColors` 属性实现。GraphView 需要在节点样式中检查这些属性并应用样式。

### Q: 如何导出聚类结果？
A: 在 ClusterPanel 中添加导出按钮：
```tsx
<Button onClick={() => {
  const json = JSON.stringify(result, null, 2)
  // 下载文件或复制到剪贴板
}}>
  导出聚类结果
</Button>
```

## 下一步

1. 在 GraphView 中实现聚类着色逻辑
2. 添加聚类高亮的过渡效果
3. 实现聚类内节点的跳转导航
4. 添加聚类统计图表
5. 支持聚类结果导出功能
