# 知识图谱聚类与社区检测使用指南

## 概述

本项目实现了两种图聚类算法，用于识别知识图谱中的社区和聚类结构：

1. **连通分量检测** (Connected Components)
2. **权重聚类** (Weighted Clustering)

## 算法说明

### 连通分量检测

识别图中完全断开的子图。两个节点属于同一个连通分量当且仅当存在从一个节点到另一个节点的路径。

**特点：**
- 时间复杂度：O(V + E)，其中 V 是节点数，E 是边数
- 适用于识别完全独立的话题领域
- 结果稳定，不受权重变化影响（只要边存在）

**使用场景：**
- 识别完全不相关的知识主题
- 检测孤立的文章集群
- 初步的知识划分

### 权重聚类

基于贪心合并策略的聚类算法。按边权重从高到低依次考虑，权重高的边优先合并节点。

**特点：**
- 时间复杂度：O(E log E)
- 更细致的聚类，考虑边权重
- 高权重的关联优先聚合
- 支持权重阈值过滤

**使用场景：**
- 识别相关性强的知识聚类
- 基于语义相似度的文章分组
- 发现知识主题的精细结构

## 使用方式

### 后端 API

```rust
use crate::graph::ClusterAnalyzer;

// 创建分析器
let analyzer = ClusterAnalyzer::new(db.clone());

// 可选：设置权重阈值
let analyzer = analyzer.with_threshold(0.5);

// 连通分量检测
let clusters = analyzer.detect_connected_components()?;

// 权重聚类
let clusters = analyzer.weighted_clustering()?;

// 计算模块化度
let modularity = analyzer.calculate_modularity(&clusters)?;
```

### 前端 Tauri 命令

```typescript
import { invoke } from '@tauri-apps/api'

interface ClusteringRequest {
  algorithm: 'connected_components' | 'weighted_clustering'
  minWeight?: number // 权重阈值，默认 0.3
}

interface ClusteringResult {
  clusters: Cluster[]
  statistics: ClusterStatistics
  algorithm: string
  threshold: number
}

// 获取聚类结果
const result = await invoke<ClusteringResult>('get_graph_clusters', {
  algorithm: 'weighted_clustering',
  minWeight: 0.5
})

console.log(`Found ${result.statistics.totalClusters} clusters`)
console.log(`Modularity score: ${result.statistics.modularity}`)
```

## 数据结构

### Cluster

```typescript
type Cluster = {
  id: number                      // 聚类 ID
  nodeIds: number[]              // 节点 ID 列表
  internalEdges: number          // 内部边数
  externalEdges: number          // 外部边数
  totalWeight: number            // 总权重
  density: number                // 密度 (0-1)
  modularityContribution: number // 模块化贡献
}
```

### ClusterStatistics

```typescript
type ClusterStatistics = {
  totalClusters: number        // 总聚类数
  clusterSizes: number[]       // 各聚类大小
  modularity: number           // 全局模块化度 (0-1)
  largestClusterSize: number   // 最大聚类大小
  averageClusterSize: number   // 平均聚类大小
  densestCluster: number       // 最密集聚类 ID
}
```

## 评估指标

### 密度 (Density)

聚类内实际边数与可能最大边数的比值。范围 [0, 1]，越高表示聚类内节点连接越紧密。

```
Density = internal_edges / max_possible_edges
where max_possible_edges = n * (n - 1) / 2
```

### 模块化度 (Modularity)

衡量聚类划分质量的指标。范围 [0, 1]，越高表示聚类划分越优。

- 值接近 1：优秀的聚类划分
- 值接近 0.3-0.7：中等质量的聚类
- 值接近 0：聚类划分效果差

```
Modularity = Σ(edges_within_cluster / total_edges)
```

## 实现细节

### 权重阈值

两个算法都支持权重阈值参数：

- **默认值**：0.3
- **影响**：只考虑权重 ≥ 阈值的边
- **调整建议**：
  - 增大阈值：获得更少、更高质量的聚类
  - 减小阈值：获得更多、更细粒度的聚类

### 性能

- **连通分量**：线性时间，适合大规模图
- **权重聚类**：O(E log E)，对于中等规模图 (<10000 节点) 性能良好

### 边界情况

- **空图**：返回空聚类列表
- **单个节点**：每个节点被视为独立聚类
- **断开的图**：每个连通分量是独立的聚类

## 应用示例

### 场景 1：发现知识主题

使用权重聚类识别知识图谱中的主题：

```javascript
const result = await invoke<ClusteringResult>('get_graph_clusters', {
  algorithm: 'weighted_clustering',
  minWeight: 0.7 // 高度相关的文章
})

// 为每个聚类生成主题标签
result.clusters.forEach(cluster => {
  console.log(`Theme ${cluster.id}: ${cluster.nodeIds.length} articles`)
  console.log(`  Density: ${(cluster.density * 100).toFixed(1)}%`)
})
```

### 场景 2：检测知识孤岛

使用连通分量识别完全孤立的文章：

```javascript
const result = await invoke<ClusteringResult>('get_graph_clusters', {
  algorithm: 'connected_components'
})

// 找到只有单个节点的聚类
const isolated = result.clusters.filter(c => c.nodeIds.length === 1)
console.log(`Found ${isolated.length} isolated articles`)
```

### 场景 3：聚类质量评估

```javascript
const result = await invoke<ClusteringResult>('get_graph_clusters', {
  algorithm: 'weighted_clustering'
})

const stats = result.statistics
console.log(`Modularity: ${(stats.modularity * 100).toFixed(1)}%`)
console.log(`Average cluster size: ${stats.averageClusterSize.toFixed(1)}`)
console.log(`Densest cluster: ${stats.densestCluster}`)
```

## 常见问题

### Q: 应该选择哪个算法？

**A:** 根据使用场景：
- 需要找到完全不相关的知识领域 → 连通分量
- 需要细粒度的话题聚类 → 权重聚类
- 需要获得最高质量的聚类 → 权重聚类（可调整权重阈值）

### Q: 如何调整聚类粒度？

**A:** 调整 `minWeight` 参数：
- `minWeight = 0.9`：只保留最强关联，得到少数大聚类
- `minWeight = 0.5`：平衡方案
- `minWeight = 0.1`：包含弱关联，得到多数小聚类

### Q: 聚类结果什么时候需要更新？

**A:** 当添加新关联或修改现有关联时，聚类结果可能变化。可定期调用算法刷新结果。

### Q: 如何利用聚类结果改进用户体验？

**A:** 可以：
- 显示聚类相关的推荐文章
- 按聚类进行知识组织
- 为用户推荐聚类内的其他文章
- 识别知识缺口（孤立聚类）

## 参考资源

- [图聚类算法](https://en.wikipedia.org/wiki/Graph_clustering)
- [社区检测](https://en.wikipedia.org/wiki/Community_structure)
- [模块化度](https://en.wikipedia.org/wiki/Modularity_(networks))
