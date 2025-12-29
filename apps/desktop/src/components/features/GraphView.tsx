/**
 * Graph View Component
 *
 * Visualizes knowledge graph using AntV G6 v5
 * Features:
 * - Force-directed layout with proper node distribution
 * - Node labels with titles
 * - Edge visualization with type-based colors
 * - Interactive hover and click effects
 */

import { useEffect, useRef, useState } from 'react'
import type { IElementEvent } from '@antv/g6'
import { CanvasEvent, Graph as G6Graph, NodeEvent } from '@antv/g6'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { GraphData, GraphEdge, GraphFilters, GraphNode as SharedGraphNode } from '@memory-prosthetic/shared'
import type { CommandResult } from '@/types/api'

// 单个关联节点的 Tooltip 信息
type NodeAssociationTooltip = {
  nodeId: string
  x: number
  y: number
  edge: GraphEdge
}

// 悬停节点时显示的所有关联 Tooltips
type TooltipInfo = {
  hoveredNodeId: string
  hoveredNodeTitle: string
  associations: NodeAssociationTooltip[]
} | null

// 自定义节点数据类型
type GraphNodeData = {
  id: string
  data: {
    originalId: number
    title: string
    url: string
    summary: string | null
    tags: string[]
    folder: string | null
    degree: number
    isFocused?: boolean // 是否为焦点节点
  }
}

// 自定义边数据类型
type GraphEdgeData = {
  id: string
  source: string
  target: string
  data: {
    type: string
    weight: number
    confidence: number
    distance?: number // 用于布局的距离（权重越高，距离越短）
    strength?: number // 用于布局的强度（权重越高，强度越大）
    // 关联详情
    semanticSimilarity?: number
    sharedTags?: string[]
    sharedFolders?: string[]
    timeInterval?: number
    domain?: string
    keywordOverlap?: number
    topicMatch?: number
    // 原始边数据引用
    originalEdge?: GraphEdge
  }
}

// 颜色方案 - 更现代的配色
const COLORS = {
  // 节点颜色（基于关联度）
  nodeHighDegree: '#f43f5e', // 高关联度 - 玫瑰红
  nodeMediumDegree: '#8b5cf6', // 中关联度 - 紫色
  nodeLowDegree: '#06b6d4', // 低关联度 - 青色
  nodeDefault: '#64748b', // 默认 - 灰色
  nodeStroke: 'rgba(255, 255, 255, 0.8)',
  nodeHover: '#fbbf24', // 悬停 - 琥珀色

  // 边颜色（基于类型）
  edgeSemantic: '#f43f5e', // 语义关联 - 玫瑰红
  edgeTag: '#10b981', // 标签关联 - 翡翠绿
  edgeFolder: '#8b5cf6', // 收藏夹关联 - 紫色
  edgeTime: '#f59e0b', // 时间关联 - 琥珀色
  edgeDomain: '#6366f1', // 领域关联 - 靛蓝
  edgeKeyword: '#06b6d4', // 关键词 - 青色
  edgeTopic: '#ec4899', // 主题 - 粉色
  edgeDefault: '#94a3b8', // 默认 - 灰色

  // 标签颜色
  labelFill: '#1e293b',
  labelBg: 'rgba(255, 255, 255, 0.9)',
}

// 获取节点颜色
const getNodeFill = (degree: number): string => {
  if (degree >= 8) return COLORS.nodeHighDegree
  if (degree >= 4) return COLORS.nodeMediumDegree
  if (degree >= 1) return COLORS.nodeLowDegree
  return COLORS.nodeDefault
}

// 获取节点大小
const getNodeSize = (degree: number): number => {
  const baseSize = 32
  const maxSize = 64
  const minSize = 24
  // 根据关联度计算大小，使用对数增长避免过大差异
  const size = baseSize + Math.log2(degree + 1) * 8
  return Math.max(minSize, Math.min(maxSize, size))
}

// 获取边颜色
const getEdgeStroke = (type: string): string => {
  const colorMap: Record<string, string> = {
    semantic: COLORS.edgeSemantic,
    tag: COLORS.edgeTag,
    folder: COLORS.edgeFolder,
    time: COLORS.edgeTime,
    domain: COLORS.edgeDomain,
    keyword: COLORS.edgeKeyword,
    topic: COLORS.edgeTopic,
  }
  return colorMap[type] || COLORS.edgeDefault
}

// 截断标题
const truncateTitle = (title: string, maxLen = 16): string => {
  if (title.length <= maxLen) return title
  return `${title.substring(0, maxLen)}...`
}

type GraphViewProps = {
  filters?: GraphFilters
  onNodeClick?: (nodeId: number) => void
  onEdgeClick?: (edgeId: string) => void
}

export const GraphView = ({ filters, onNodeClick, onEdgeClick }: GraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<G6Graph | null>(null)
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>(null)

  const {
    data: graphData,
    refetch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['graph', 'data', filters],
    queryFn: async () => {
      console.log('📊 GraphView: 正在获取图谱数据，filters:', filters)
      try {
        const result = await invoke<CommandResult<GraphData>>('get_graph_data', {
          filters: {
            minWeight: filters?.minWeight,
            types: filters?.types,
            maxNodes: filters?.maxNodes,
            focusedNodeId: filters?.focusedNodeId,
            maxDepth: filters?.maxDepth,
          },
        })
        console.log('📊 GraphView: 获取成功，节点数:', result.data?.nodes?.length, '边数:', result.data?.edges?.length)
        return result.data
      } catch (err) {
        console.error('📊 GraphView: 获取图谱数据失败:', err)
        throw err
      }
    },
  })

  // 调试日志
  console.log('📊 GraphView: graphData:', graphData, 'isLoading:', isLoading, 'error:', error)

  useEffect(() => {
    if (!graphData || !containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = containerRef.current.offsetHeight

    // 构建节点数据 - 使用 G6 v5 格式
    const nodes: GraphNodeData[] = graphData.nodes.map((node: SharedGraphNode) => {
      const isFocused = filters?.focusedNodeId === node.id
      return {
        id: String(node.id),
        data: {
          originalId: node.id,
          title: node.title,
          url: node.url,
          summary: node.summary,
          tags: node.tags,
          folder: node.folder,
          degree: node.degree,
          isFocused, // 标记焦点节点
        },
      }
    })

    // 构建边数据，添加动态距离和强度属性（用于力导向布局）
    const edges: GraphEdgeData[] = graphData.edges.map((edge) => {
      const weight = edge.weight
      // 权重范围 0-1，映射到距离范围 30-150（权重越高，距离越短，关联节点更近）
      const distance = 400 - weight * 50
      // 权重范围 0-1，映射到强度范围 0.3-0.9（权重越高，强度越大，拉得更紧）
      const strength = 0.3 + weight * 0.6

      return {
        id: edge.id,
        source: String(edge.sourceId),
        target: String(edge.targetId),
        data: {
          type: edge.type,
          weight: edge.weight,
          confidence: edge.confidence,
          distance, // 用于布局的距离
          strength, // 用于布局的强度
          // 关联详情
          semanticSimilarity: edge.semanticSimilarity,
          sharedTags: edge.sharedTags,
          sharedFolders: edge.sharedFolders,
          timeInterval: edge.timeInterval,
          domain: edge.domain,
          keywordOverlap: edge.keywordOverlap,
          topicMatch: edge.topicMatch,
          originalEdge: edge, // 保存原始边数据引用
        },
      }
    })

    // 创建节点 ID 到标题的映射，用于 tooltip 显示
    const nodeIdToTitle = new Map<string, string>()
    for (const node of nodes) {
      nodeIdToTitle.set(node.id, node.data.title)
    }

    // 清理旧图实例
    if (graphRef.current) {
      graphRef.current.destroy()
      graphRef.current = null
    }

    // 判断是否有边
    const hasEdges = edges.length > 0

    // 创建 G6 图实例 - G6 v5 配置
    const graph = new G6Graph({
      container: containerRef.current,
      width: containerWidth,
      height: containerHeight,
      autoFit: 'view',
      padding: [60, 60, 60, 60],
      data: { nodes, edges },

      // 布局配置
      layout: hasEdges
        ? {
            // 有边时使用力导向布局
            type: 'd3-force',
            preventOverlap: true,
            nodeSize: 50,
            link: {
              // 动态边距离：权重越高，距离越短（关联性越强，距离越近）
              // G6 v5 的 d3-force 布局会从边的 data.distance 读取距离值
              distance: (edge: { data?: { distance?: number } }) => {
                return edge.data?.distance ?? 150
              },
              // 动态边强度：权重越高，强度越大（拉得更近）
              // G6 v5 的 d3-force 布局会从边的 data.strength 读取强度值
              strength: (edge: { data?: { strength?: number } }) => {
                return edge.data?.strength ?? 0.3
              },
            },
            manyBody: {
              // 节点间斥力：负值越大，无关联节点距离越远
              strength: -200,
            },
            collide: {
              // 碰撞检测：避免节点重叠
              radius: 50,
              strength: 1,
            },
            center: {
              strength: 0.05,
            },
            // 焦点模式：如果有焦点节点，将其固定在中心附近
            ...(filters?.focusedNodeId
              ? {
                  fixed: (node: GraphNodeData) => {
                    return node.data.originalId === filters.focusedNodeId
                  },
                }
              : {}),
          }
        : {
            // 无边时使用圆形布局让节点分散
            type: 'circular',
            radius: Math.min(containerWidth, containerHeight) * 0.35,
            startAngle: 0,
            endAngle: 2 * Math.PI,
            divisions: 1,
            ordering: null,
          },

      // 节点配置
      node: {
        type: 'circle',
        style: {
          // 大小基于关联度
          size: (d: Record<string, unknown>) => {
            const data = d.data as GraphNodeData['data'] | undefined
            return getNodeSize(data?.degree ?? 0)
          },
          // 填充颜色基于关联度，焦点节点特殊高亮
          fill: (d: Record<string, unknown>) => {
            const data = d.data as GraphNodeData['data'] | undefined
            // 焦点节点使用特殊颜色
            if (data?.isFocused) {
              return '#f59e0b' // 橙色高亮
            }
            return getNodeFill(data?.degree ?? 0)
          },
          stroke: COLORS.nodeStroke,
          lineWidth: 2,
          shadowColor: 'rgba(0, 0, 0, 0.15)',
          shadowBlur: 8,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          cursor: 'pointer',

          // 标签配置
          labelText: (d: Record<string, unknown>) => {
            const data = d.data as GraphNodeData['data'] | undefined
            return truncateTitle(data?.title ?? '')
          },
          labelFill: COLORS.labelFill,
          labelFontSize: 11,
          labelFontWeight: 500,
          labelPlacement: 'bottom',
          labelOffsetY: 8,
          labelBackground: true,
          labelBackgroundFill: COLORS.labelBg,
          labelBackgroundRadius: 4,
          labelBackgroundPadding: [2, 6, 2, 6],
        },
        // 状态样式
        state: {
          hover: {
            fill: COLORS.nodeHover,
            stroke: '#fff',
            lineWidth: 3,
            shadowBlur: 16,
            shadowColor: 'rgba(251, 191, 36, 0.4)',
            labelFontWeight: 700,
            labelFontSize: 12,
          },
          selected: {
            stroke: '#fff',
            lineWidth: 4,
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },

      // 边配置
      edge: {
        type: 'quadratic', // 使用曲线边
        style: {
          stroke: (d: Record<string, unknown>) => {
            const data = d.data as GraphEdgeData['data'] | undefined
            return getEdgeStroke(data?.type ?? '')
          },
          lineWidth: (d: Record<string, unknown>) => {
            const data = d.data as GraphEdgeData['data'] | undefined
            const weight = data?.weight ?? 0.5
            return Math.max(1, Math.min(4, weight * 4))
          },
          opacity: (d: Record<string, unknown>) => {
            const data = d.data as GraphEdgeData['data'] | undefined
            const weight = data?.weight ?? 0.5
            return Math.max(0.3, Math.min(0.8, weight))
          },
          endArrow: true,
          endArrowSize: 6,
          cursor: 'pointer',
        },
        state: {
          hover: {
            lineWidth: 3,
            opacity: 1,
            endArrowSize: 8,
          },
          selected: {
            lineWidth: 4,
            opacity: 1,
          },
        },
      },

      // 交互行为
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        'click-select',
        {
          type: 'hover-activate',
          degree: 1, // 高亮一度邻居
          state: 'hover',
        },
      ],
    })

    // 渲染
    void graph.render()

    // 节点点击事件
    graph.on('node:click', (e: IElementEvent) => {
      const nodeId = e.target?.id
      if (nodeId && onNodeClick) {
        const nodeData = graph.getNodeData(nodeId)
        const originalId = nodeData?.data?.originalId
        if (typeof originalId === 'number') {
          onNodeClick(originalId)
        }
      }
    })

    // 边点击事件
    graph.on('edge:click', (e: IElementEvent) => {
      const edgeId = e.target?.id
      if (edgeId && onEdgeClick) {
        onEdgeClick(String(edgeId))
      }
    })

    // 节点悬停事件 - 在关联节点旁边显示关联详情 Tooltip
    graph.on(NodeEvent.POINTER_OVER, (e: IElementEvent) => {
      const nodeId = e.target?.id
      if (!nodeId) return

      const nodeData = graph.getNodeData(nodeId)
      const hoveredNodeTitle = nodeData?.data?.title as string | undefined
      if (!hoveredNodeTitle) {
        return
      }

      // 获取所有连接到这个节点的边
      const relatedEdges = graph.getRelatedEdgesData(nodeId)
      if (!relatedEdges || relatedEdges.length === 0) {
        setTooltipInfo(null)
        return
      }

      // 为每个关联节点创建 tooltip 信息
      const associations: NodeAssociationTooltip[] = []

      for (const edgeData of relatedEdges) {
        const originalEdge = edgeData?.data?.originalEdge as GraphEdge | undefined
        if (!originalEdge) {
          continue
        }

        // 找到"另一个"节点（不是当前悬停的节点）
        // 节点 ID 格式是 String(node.id)，不是 "node-{id}"
        const sourceNodeId = String(originalEdge.sourceId)
        const targetNodeId = String(originalEdge.targetId)
        const otherNodeId = sourceNodeId === nodeId ? targetNodeId : sourceNodeId

        // 检查节点是否存在于当前图谱中
        try {
          const otherNodeData = graph.getNodeData(otherNodeId)
          if (!otherNodeData) {
            continue
          }

          // 获取节点在视口中的位置
          const nodePosition = graph.getElementPosition(otherNodeId)
          if (!nodePosition) continue

          // 转换为视口坐标
          const viewportPos = graph.getViewportByCanvas(nodePosition as [number, number])

          associations.push({
            nodeId: otherNodeId,
            x: viewportPos[0],
            y: viewportPos[1],
            edge: originalEdge,
          })
        } catch (err) {
          console.log('🚀 处理节点时出错:', err)
        }
      }

      if (associations.length > 0) {
        setTooltipInfo({
          hoveredNodeId: nodeId,
          hoveredNodeTitle,
          associations,
        })
      } else {
        console.log('🚀 associations 为空，不显示 tooltip')
      }
    })

    // 节点离开事件 - 隐藏 Tooltip
    graph.on(NodeEvent.POINTER_LEAVE, () => {
      setTooltipInfo(null)
    })

    // 画布拖拽时隐藏 Tooltip
    graph.on(CanvasEvent.DRAG, () => {
      setTooltipInfo(null)
    })

    graphRef.current = graph

    // 清理函数
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy()
        graphRef.current = null
      }
    }
  }, [graphData, onNodeClick, onEdgeClick, filters?.focusedNodeId])

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.resize(containerRef.current.offsetWidth, containerRef.current.offsetHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 响应 filters 变化
  useEffect(() => {
    void refetch()
  }, [refetch])

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <span className="text-muted-foreground text-sm">加载图谱中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    // 错误状态
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="mb-4 text-6xl opacity-30">❌</div>
        <h3 className="mb-2 font-medium text-foreground text-lg">加载图谱失败</h3>
        <p className="max-w-md text-center text-muted-foreground text-sm">
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </p>
      </div>
    )
  }

  if (!graphData || graphData.nodes.length === 0) {
    // 空状态
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <div className="mb-4 text-6xl opacity-30">🕸️</div>
        <h3 className="mb-2 font-medium text-foreground text-lg">暂无图谱数据</h3>
        <p className="text-muted-foreground text-sm">收集更多内容后，知识图谱将在此展示</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-linear-to-br from-slate-50 to-slate-100">
      {/* 图谱容器 */}
      <div className="h-full w-full" ref={containerRef} />

      {/* 图谱统计信息 */}
      <div className="absolute right-4 bottom-4 rounded-lg bg-white/80 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{graphData.nodes.length}</span> 节点
          </span>
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{graphData.edges.length}</span> 关联
          </span>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-white/80 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
        <div className="mb-1 font-medium text-slate-600">关联类型</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <LegendItem color={COLORS.edgeSemantic} label="语义" />
          <LegendItem color={COLORS.edgeTag} label="标签" />
          <LegendItem color={COLORS.edgeFolder} label="收藏夹" />
          <LegendItem color={COLORS.edgeTime} label="时间" />
          <LegendItem color={COLORS.edgeKeyword} label="关键词" />
          <LegendItem color={COLORS.edgeTopic} label="主题" />
        </div>
      </div>

      {/* 关联详情 Tooltips - 在每个关联节点旁边显示 */}
      {tooltipInfo?.associations.map((assoc, index) => (
        <NodeAssociationTooltipComponent
          edge={assoc.edge}
          key={`${assoc.nodeId}-${assoc.edge.id}-${index}`}
          x={assoc.x}
          y={assoc.y}
        />
      ))}
    </div>
  )
}

// 图例项组件
const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-1">
    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-slate-500">{label}</span>
  </div>
)

// 关联详情类型名称映射
const TYPE_NAMES: Record<string, string> = {
  semantic: '语义相似',
  tag: '标签共享',
  folder: '收藏夹共享',
  time: '时间邻近',
  domain: '同一网站',
  keyword: '关键词重叠',
  topic: '主题相关',
}

// 节点关联 Tooltip 组件 - 在关联节点旁边显示
type NodeAssociationTooltipProps = {
  edge: GraphEdge
  x: number
  y: number
}

const NodeAssociationTooltipComponent = ({ edge, x, y }: NodeAssociationTooltipProps) => {
  const typeName = TYPE_NAMES[edge.type] || edge.type

  // 根据关联类型生成详情描述
  const getDetailDescription = (): string => {
    switch (edge.type) {
      case 'semantic':
        if (edge.semanticSimilarity !== undefined) {
          return `相似度 ${(edge.semanticSimilarity * 100).toFixed(0)}%`
        }
        break
      case 'tag':
        if (edge.sharedTags && edge.sharedTags.length > 0) {
          return edge.sharedTags.slice(0, 3).join(', ') + (edge.sharedTags.length > 3 ? '...' : '')
        }
        break
      case 'folder':
        if (edge.sharedFolders && edge.sharedFolders.length > 0) {
          return edge.sharedFolders.slice(0, 2).join(', ')
        }
        break
      case 'time':
        if (edge.timeInterval !== undefined) {
          return `${edge.timeInterval}天内`
        }
        break
      case 'domain':
        if (edge.domain) {
          return edge.domain
        }
        break
      case 'keyword':
        if (edge.keywordOverlap !== undefined) {
          return `重叠 ${(edge.keywordOverlap * 100).toFixed(0)}%`
        }
        break
      case 'topic':
        if (edge.topicMatch !== undefined) {
          return `匹配 ${(edge.topicMatch * 100).toFixed(0)}%`
        }
        break
    }
    return ''
  }

  const detail = getDetailDescription()

  return (
    <div
      className="pointer-events-none absolute z-50 max-w-[200px] rounded-md border border-slate-200/80 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur-sm"
      style={{
        left: x + 20,
        top: y - 10,
      }}
    >
      {/* 关联类型和颜色指示 */}
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getEdgeStroke(edge.type) }} />
        <span className="truncate font-medium text-slate-700 text-xs">{typeName}</span>
        <span className="shrink-0 text-slate-400 text-xs">{(edge.weight * 100).toFixed(0)}%</span>
      </div>

      {/* 具体详情 */}
      {detail && <div className="mt-1 truncate rounded bg-slate-50 px-1.5 py-0.5 text-slate-600 text-xs">{detail}</div>}
    </div>
  )
}
