/**
 * Graph View Component
 *
 * Visualizes knowledge graph using AntV G6
 */

import { useEffect, useRef, useState } from 'react'
import type { IElementEvent } from '@antv/g6'
import { Graph as G6Graph } from '@antv/g6'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { GraphData, GraphFilters } from '@memory-prosthetic/shared'
import type { CommandResult } from '@/types/api'

// 节点颜色映射
const getNodeColor = (node: { degree: number; tags: string[] }): string => {
  if (node.degree > 10) return '#ff6b6b' // 高关联度 - 红色
  if (node.degree > 5) return '#4ecdc4' // 中关联度 - 青色
  return '#95e1d3' // 低关联度 - 浅青色
}

// 边颜色映射
const getEdgeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    semantic: '#ff6b6b', // 语义关联 - 红色
    tag: '#4ecdc4', // 标签关联 - 青色
    folder: '#95e1d3', // 收藏夹关联 - 浅青色
    time: '#ffeaa7', // 时间关联 - 黄色
    domain: '#a29bfe', // 领域关联 - 紫色
    keyword: '#13c2c2', // 关键词重叠 - 青色
    topic: '#fa8c16', // 主题匹配 - 橙色
  }
  return colorMap[type] || '#ddd'
}

interface GraphViewProps {
  filters?: GraphFilters
  onNodeClick?: (nodeId: number) => void
  onEdgeClick?: (edgeId: string) => void
}

export function GraphView({ filters, onNodeClick, onEdgeClick }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<G6Graph | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: graphData, refetch } = useQuery({
    queryKey: ['graph', 'data', filters],
    queryFn: async () => {
      const result = await invoke<CommandResult<GraphData>>('get_graph_data', {
        filters: {
          minWeight: filters?.minWeight,
          types: filters?.types,
          maxNodes: filters?.maxNodes,
        },
      })
      return result.data
    },
  })

  useEffect(() => {
    if (!graphData || !containerRef.current) return

    setIsLoading(false)

    // 转换数据格式为 G6 格式
    const g6Data = {
      nodes: graphData.nodes.map((node) => ({
        id: String(node.id),
        label: node.title.length > 20 ? `${node.title.substring(0, 20)}...` : node.title,
        size: Math.max(20, Math.min(60, node.degree * 5)),
        style: {
          fill: getNodeColor(node),
          stroke: '#fff',
          lineWidth: 2,
        },
        labelCfg: {
          style: {
            fill: '#333',
            fontSize: 12,
          },
        },
        data: {
          id: node.id,
          url: node.url,
          summary: node.summary,
          tags: node.tags,
          folder: node.folder,
        },
      })),
      edges: graphData.edges.map((edge) => ({
        id: edge.id,
        source: String(edge.sourceId),
        target: String(edge.targetId),
        label: edge.type,
        style: {
          stroke: getEdgeColor(edge.type),
          lineWidth: Math.max(1, Math.min(5, edge.weight * 5)),
          opacity: edge.weight,
        },
        labelCfg: {
          style: {
            fill: '#666',
            fontSize: 10,
          },
        },
        data: {
          weight: edge.weight,
          type: edge.type,
          confidence: edge.confidence,
        },
      })),
    }

    // 清理旧图实例
    if (graphRef.current) {
      graphRef.current.destroy()
    }

    // 创建 G6 图实例
    const graph = new G6Graph({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      data: g6Data,
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSize: 30,
        nodeStrength: -300,
        edgeStrength: 0.1,
        collideStrength: 0.8,
        alpha: 0.3,
        alphaDecay: 0.028,
        alphaMin: 0.01,
      },
      node: {
        type: 'circle',
      },
      edge: {
        type: 'line',
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'click-select'],
    })

    // 渲染
    void graph.render()

    // 节点点击事件
    graph.on('node:click', (e: IElementEvent) => {
      const node = e.target
      if (node?.id) {
        const nodeData = graph.getNodeData(node.id)
        // nodeData.id 是字符串，需要转换为数字
        const nodeId = Number.parseInt(String(nodeData?.id), 10)
        if (!Number.isNaN(nodeId) && onNodeClick) {
          onNodeClick(nodeId)
        }
      }
    })

    // 节点悬停事件
    graph.on('node:pointerenter', (e: IElementEvent) => {
      const node = e.target
      if (node?.id) {
        void graph.setElementState(node.id, 'hover')
      }
    })

    graph.on('node:pointerleave', (e: IElementEvent) => {
      const node = e.target
      if (node?.id) {
        void graph.setElementState(node.id, [])
      }
    })

    // 边点击事件
    graph.on('edge:click', (e: IElementEvent) => {
      const edge = e.target
      if (edge?.id && onEdgeClick) {
        onEdgeClick(String(edge.id))
      }
    })

    graphRef.current = graph

    // 清理函数
    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, [graphData, onNodeClick, onEdgeClick])

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

  if (isLoading || !graphData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <div className="h-full w-full" ref={containerRef} />
    </div>
  )
}
