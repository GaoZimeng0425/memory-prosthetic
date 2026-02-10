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

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { IElementEvent } from '@antv/g6'
import { CanvasEvent, Graph as G6Graph, NodeEvent } from '@antv/g6'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { GraphData, GraphEdge, GraphFilters, GraphNode as SharedGraphNode } from '@memory-prosthetic/shared'
import type { CommandResult } from '@/types/api'

// Type guard for G6Graph API methods
interface GraphZoomMethods {
  getZoom?: () => number
  zoom?: (ratio: number) => void
  zoomTo?: (ratio: number) => void
}

interface GraphFitMethods {
  fitView?: () => void
  fit?: () => void
}

function hasZoomMethods(graph: G6Graph | null): graph is G6Graph & GraphZoomMethods {
  if (!graph) return false
  return 'getZoom' in graph || 'zoom' in graph || 'zoomTo' in graph
}

function hasFitMethods(graph: G6Graph | null): graph is G6Graph & GraphFitMethods {
  if (!graph) return false
  return 'fitView' in graph || 'fit' in graph
}

// 单个关联节点的 Tooltip 信息
type NodeAssociationTooltip = {
  nodeId: string
  x: number
  y: number
  edges: GraphEdge[]
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
    sharedKeywords?: string[]
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
  onNodeDoubleClick?: (nodeId: number) => void
  nodeColorMap?: Record<number, string>
  highlightedNodeIds?: number[]
}

export type GraphViewRef = {
  zoomIn: () => void
  zoomOut: () => void
  fitView: () => void
  getGraph: () => G6Graph | null
}

export const GraphView = forwardRef<GraphViewRef, GraphViewProps>(
  ({ filters, onNodeClick, onEdgeClick, onNodeDoubleClick, nodeColorMap, highlightedNodeIds }, ref) => {
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
          return result.data
        } catch (err) {
          console.error('GraphView: Failed to fetch graph data:', err)
          throw err
        }
      },
    })

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

      // 创建节点 ID 集合，用于验证边引用的节点是否存在
      const nodeIdSet = new Set<string>(nodes.map((node) => node.id))

      // 构建边数据，添加动态距离和强度属性（用于力导向布局）
      // 过滤掉引用了不存在节点的边，避免 G6 报错
      const edges: GraphEdgeData[] = graphData.edges
        .filter((edge) => {
          const sourceId = String(edge.sourceId)
          const targetId = String(edge.targetId)
          const sourceExists = nodeIdSet.has(sourceId)
          const targetExists = nodeIdSet.has(targetId)

          if (!sourceExists || !targetExists) {
            return false
          }
          return true
        })
        .map((edge) => {
          const weight = edge.weight
          // 动态边距离：权重越高，距离越短（关联性越强，距离越近）
          // baseDistance 150, weightFactor 0.5-1.5
          const baseDistance = 150
          const weightFactor = 0.5 + (1 - weight) // 0.5 for weight=1, 1.5 for weight=0
          const distance = baseDistance * weightFactor
          // 动态边强度：权重越高，强度越大（拉得更紧）
          const strength = weight * 200

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
              sharedKeywords: edge.sharedKeywords,
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
        animation: false,
        padding: [60, 60, 60, 60],
        data: { nodes, edges },

        // 布局配置
        layout: hasEdges
          ? {
              // 有边时使用力导向布局
              type: 'd3-force',
              preventOverlap: true,
              nodeSize: (node: { data?: { degree?: number } }) => 20 + (node.data?.degree ?? 0) * 2,
              link: {
                // 动态边距离：权重越高，距离越短（关联性越强，距离越近）
                distance: (edge: { data?: { distance?: number } }) => edge.data?.distance ?? 150,
                // 动态边强度：权重越高，强度越大（拉得更近）
                strength: (edge: { data?: { strength?: number } }) => edge.data?.strength ?? 0.3,
              },
              manyBody: {
                // 节点间斥力：负值越大，无关联节点距离越远（从-200增加到-500）
                strength: -500,
              },
              collide: {
                // 碰撞检测：避免节点重叠
                radius: (node: { data?: { degree?: number } }) => 20 + (node.data?.degree ?? 0) * 2,
                strength: 1,
              },
              center: {
                strength: 0.05,
              },
              // 降低衰减率，让布局收敛更慢但更稳定
              alphaDecay: 0.05,
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
              const originalId = data?.originalId

              // 1. 焦点节点最高优先级
              if (data?.isFocused) {
                return '#f59e0b' // 橙色高亮
              }

              // 2. 如果有自定义颜色映射 (聚类颜色)
              if (originalId && nodeColorMap && nodeColorMap[originalId]) {
                return nodeColorMap[originalId]
              }

              // 3. 默认基于关联度
              return getNodeFill(data?.degree ?? 0)
            },
            // 透明度：如果有高亮列表且当前节点不在列表中，则变淡
            opacity: (d: Record<string, unknown>) => {
              const data = d.data as GraphNodeData['data'] | undefined
              if (highlightedNodeIds && highlightedNodeIds.length > 0 && data?.originalId) {
                return highlightedNodeIds.includes(data.originalId) ? 1 : 0.1
              }
              return 1
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
              // 边样式基于权重区分
              // 高权重 (>0.7): 实线, stroke: 2px
              // 中权重 (0.4-0.7): 虚线, stroke: 1.5px
              // 低权重 (<0.4): 点线, stroke: 1px
              if (weight > 0.7) return 2
              if (weight >= 0.4) return 1.5
              return 1
            },
            lineDash: (d: Record<string, unknown>) => {
              const data = d.data as GraphEdgeData['data'] | undefined
              const weight = data?.weight ?? 0.5
              // 中权重虚线，低权重点线
              if (weight < 0.4) return [2, 2] // 点线
              if (weight < 0.7) return [6, 4] // 虚线
              return undefined // 实线
            },
            opacity: (d: Record<string, unknown>) => {
              const data = d.data as GraphEdgeData['data'] | undefined

              // 如果有高亮节点列表，淡化无关的边
              if (highlightedNodeIds && highlightedNodeIds.length > 0) {
                // 这里很难直接判断边的两端是否都在高亮列表中，因为d是样式数据
                // 简化处理：如果启用高亮模式，所有边默认变淡，只有 hover 或选中时高亮
                // 或者：G6 v5 API 可能不支持在 style 回调中轻易获取 source/target ID 用于判断
                // 暂时统一变淡
                return 0.1
              }

              const weight = data?.weight ?? 0.5
              // 低权重边更透明
              if (weight < 0.4) return 0.5
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

      // 节点双击事件 - 焦点模式（Task 19）
      graph.on('node:dblclick', (e: IElementEvent) => {
        const nodeId = e.target?.id
        if (nodeId && onNodeDoubleClick) {
          const nodeData = graph.getNodeData(nodeId)
          const originalId = nodeData?.data?.originalId
          if (typeof originalId === 'number') {
            onNodeDoubleClick(originalId)
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

        // Create a map to group edges by target node
        const groupedEdges = new Map<string, GraphEdge[]>()

        for (const edgeData of relatedEdges) {
          const originalEdge = edgeData?.data?.originalEdge as GraphEdge | undefined
          if (!originalEdge) {
            continue
          }

          // 找到"另一个"节点
          const sourceNodeId = String(originalEdge.sourceId)
          const targetNodeId = String(originalEdge.targetId)
          const otherNodeId = sourceNodeId === nodeId ? targetNodeId : sourceNodeId

          if (!groupedEdges.has(otherNodeId)) {
            groupedEdges.set(otherNodeId, [])
          }
          groupedEdges.get(otherNodeId)?.push(originalEdge)
        }

        // Process grouped edges
        for (const [otherNodeId, edges] of groupedEdges.entries()) {
          // Deduplicate edges by type to avoid showing same association twice (e.g. A->B and B->A)
          const uniqueEdgesMap = new Map<string, GraphEdge>()
          for (const edge of edges) {
            // Keep the one with higher weight if duplicates exist, or just the first one
            if (!uniqueEdgesMap.has(edge.type) || (uniqueEdgesMap.get(edge.type)?.weight || 0) < edge.weight) {
              uniqueEdgesMap.set(edge.type, edge)
            }
          }
          const uniqueEdges = Array.from(uniqueEdgesMap.values())

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
              edges: uniqueEdges,
            })
          } catch {
            // Silently skip nodes that cannot be processed
          }
        }

        if (associations.length > 0) {
          setTooltipInfo({
            hoveredNodeId: nodeId,
            hoveredNodeTitle,
            associations,
          })
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
    }, [graphData, onNodeClick, onEdgeClick, filters?.focusedNodeId, nodeColorMap, highlightedNodeIds])

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

    // 暴露控制方法给父组件
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        if (hasZoomMethods(graphRef.current)) {
          try {
            const currentZoom = graphRef.current.getZoom?.() ?? 1
            const newZoom = currentZoom * 1.2
            graphRef.current.zoomTo?.(newZoom) || graphRef.current.zoom?.(newZoom)
          } catch (error) {
            console.error('Zoom in failed:', error)
          }
        }
      },
      zoomOut: () => {
        if (hasZoomMethods(graphRef.current)) {
          try {
            const currentZoom = graphRef.current.getZoom?.() ?? 1
            const newZoom = Math.max(0.1, currentZoom * 0.8)
            graphRef.current.zoomTo?.(newZoom) || graphRef.current.zoom?.(newZoom)
          } catch (error) {
            console.error('Zoom out failed:', error)
          }
        }
      },
      fitView: () => {
        if (hasFitMethods(graphRef.current)) {
          try {
            graphRef.current.fitView?.() || graphRef.current.fit?.()
          } catch (error) {
            console.error('Fit view failed:', error)
          }
        }
      },
      getGraph: () => graphRef.current,
    }))

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
            edges={assoc.edges}
            key={`${assoc.nodeId}-${index}`}
            x={assoc.x}
            y={assoc.y}
          />
        ))}
      </div>
    )
  }
)

GraphView.displayName = 'GraphView'

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
  edges: GraphEdge[]
  x: number
  y: number
}

const NodeAssociationTooltipComponent = ({ edges, x, y }: NodeAssociationTooltipProps) => {
  // 根据关联类型生成详情描述
  const getDetailDescription = (edge: GraphEdge): string | null => {
    switch (edge.type) {
      case 'semantic':
        if (edge.semanticSimilarity !== undefined) {
          return `相似度 ${(edge.semanticSimilarity * 100).toFixed(0)}%`
        }
        return '语义相似'
      case 'tag':
        if (edge.sharedTags && edge.sharedTags.length > 0) {
          return `标签: ${edge.sharedTags.slice(0, 2).join(', ')}${edge.sharedTags.length > 2 ? '...' : ''}`
        }
        return '标签共享'
      case 'folder':
        if (edge.domain) {
          return `收藏夹: ${edge.domain}`
        }
        if (edge.sharedFolders && edge.sharedFolders.length > 0) {
          return `收藏夹: ${edge.sharedFolders.slice(0, 2).join(', ')}`
        }
        return '收藏夹共享'
      case 'time':
        if (edge.timeInterval !== undefined) {
          const minutes = Math.round(edge.timeInterval)
          return minutes < 1 ? '不到1分钟' : `${minutes}分钟内`
        }
        return '时间邻近'
      case 'domain':
        return edge.domain ? `来自: ${edge.domain}` : '同一网站'
      case 'keyword':
        if (edge.sharedKeywords && edge.sharedKeywords.length > 0) {
          const keywords = edge.sharedKeywords.slice(0, 3)
          return `关键词: ${keywords.join(', ')}${edge.sharedKeywords.length > 3 ? '...' : ''}`
        }
        if (edge.keywordOverlap !== undefined) {
          return `关键词重叠 ${(edge.keywordOverlap * 100).toFixed(0)}%`
        }
        return '关键词重叠'
      case 'topic':
        if (edge.sharedFolders && edge.sharedFolders.length > 0) {
          // sharedFolders is reused to store shared topics
          const topics = edge.sharedFolders.slice(0, 3)
          return `主题: ${topics.join(', ')}${edge.sharedFolders.length > 3 ? '...' : ''}`
        }
        if (edge.topicMatch !== undefined) {
          return `主题匹配 ${(edge.topicMatch * 100).toFixed(0)}%`
        }
        return '主题相关'
      default:
        // Try to map unknown types using TYPE_NAMES if possible, or just return type
        return TYPE_NAMES[edge.type] || edge.type
    }
  }

  return (
    <div
      className="pointer-events-none absolute z-50 flex flex-col gap-1 rounded-md bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur-sm dark:bg-slate-800/95 dark:text-slate-200"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      {/* 箭头 */}
      <div
        className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1 rotate-45 transform bg-white dark:bg-slate-800"
        style={{ borderRight: '1px solid rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
      />

      {edges.map((edge, index) => {
        const detail = getDetailDescription(edge)
        if (!detail) return null

        const color = getEdgeStroke(edge.type)
        const typeName = TYPE_NAMES[edge.type] || edge.type

        return (
          <div
            className={`flex items-center gap-2 ${index > 0 ? 'border-slate-100 border-t pt-1 dark:border-slate-700' : ''}`}
            key={edge.id}
          >
            <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div className="flex flex-col">
              <span className="font-medium text-[10px] text-slate-500 leading-tight dark:text-slate-400">
                {typeName}
              </span>
              <span className="whitespace-nowrap font-medium leading-tight">{detail}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
