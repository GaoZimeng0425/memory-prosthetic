import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { Bug, Maximize2, Minimize2, Network, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react'

import type { ClusteringResult, CommandResult } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import { ClusterPanel } from '@/components/features/ClusterPanel'
import { GraphControls } from '@/components/features/GraphControls'
import { GraphView, type GraphViewRef } from '@/components/features/GraphView'
import { useGraphStore } from '@/store/graph-store'
import { checkAssociationStats } from '@/utils/debug-associations'

interface GraphPageProps {
  onNodeSelect: (nodeId: number) => void
}

export function GraphPage({ onNodeSelect }: GraphPageProps) {
  // Shared state from graph-store
  const filters = useGraphStore((state) => state.filters)
  const updateFilters = useGraphStore((state) => state.updateFilters)
  const clusterResult = useGraphStore((state) => state.clusterResult)
  const selectedClusterId = useGraphStore((state) => state.selectedClusterId)
  const setClusterResult = useGraphStore((state) => state.setClusterResult)
  const selectCluster = useGraphStore((state) => state.selectCluster)

  // Local state (not shared with other components)
  const queryClient = useQueryClient()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const graphViewRef = useRef<GraphViewRef>(null)

  // Local cluster UI state (algorithm choice, threshold - not shared state)
  const [clusterAlgorithm, setClusterAlgorithm] = useState<'connected_components' | 'weighted_clustering'>(
    'weighted_clustering'
  )
  const [clusterThreshold, setClusterThreshold] = useState(0.3)
  const [isClusterLoading, setIsClusterLoading] = useState(false)

  const handleEdgeClick = (edgeId: string) => {
    // Edge click handler - can be extended to show edge details
  }

  // Task 19: Double-click node for focus mode
  const handleNodeDoubleClick = (nodeId: number) => {
    // Toggle focus mode: if clicking the same focused node, exit focus mode
    if (filters.focusedNodeId === nodeId) {
      updateFilters({
        focusedNodeId: undefined,
        maxDepth: undefined,
      })
    } else {
      // Enter focus mode on the clicked node
      updateFilters({
        focusedNodeId: nodeId,
        maxDepth: 1, // Show only direct neighbors
      })
    }
  }

  // Fetch clustering results
  const fetchClusters = async () => {
    setIsClusterLoading(true)
    try {
      const result = await invoke<CommandResult<ClusteringResult>>('get_graph_clusters', {
        request: {
          algorithm: clusterAlgorithm,
          minWeight: clusterThreshold,
        },
      })
      setClusterResult(result.data)
      selectCluster(undefined)
    } catch (error) {
      console.error('Failed to fetch clusters:', error)
    } finally {
      setIsClusterLoading(false)
    }
  }

  // Get cluster colors map for nodes
  const getClusterColorsMap = (result?: ClusteringResult): Record<number, string> => {
    if (!result) return {}
    const colors: Record<number, string> = {}
    const clusterColors = [
      '#f43f5e',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#06b6d4',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#6366f1',
      '#14b8a6',
      '#84cc16',
      '#f59e0b',
    ]
    result.clusters.forEach((cluster, index) => {
      const color = clusterColors[index % clusterColors.length]
      cluster.nodeIds.forEach((nodeId) => {
        colors[nodeId] = color
      })
    })
    return colors
  }

  const handleClusterAlgorithmChange = (algo: 'connected_components' | 'weighted_clustering') => {
    setClusterAlgorithm(algo)
    setTimeout(() => fetchClusters(), 100)
  }

  const handleClusterThresholdChange = (threshold: number) => {
    setClusterThreshold(threshold)
    setTimeout(() => fetchClusters(), 500)
  }

  const handleRefresh = async () => {
    setIsDiscovering(true)
    try {
      await invoke<CommandResult<number>>('discover_all_associations')
      await queryClient.invalidateQueries({ queryKey: ['graph', 'data'] })
    } catch (error) {
      console.error('Failed to refresh graph:', error)
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleDebugStats = async () => {
    try {
      await checkAssociationStats()
      const topicsResult = await invoke<CommandResult<any>>('diagnose_topics_data')
      // Results are logged in checkAssociationStats
      void topicsResult // Use the result to avoid unused variable warning
    } catch (error) {
      console.error('Failed to get association stats:', error)
    }
  }

  const handleZoomIn = () => {
    graphViewRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    graphViewRef.current?.zoomOut()
  }

  const handleFitView = () => {
    graphViewRef.current?.fitView()
  }

  const handleToggleFullscreen = () => {
    const container = document.querySelector('[data-graph-container]') as HTMLElement
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        void container.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <div className="relative m-2 flex grow flex-col overflow-hidden" data-graph-container>
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Graph View and Controls - Main Area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Graph Controls */}
          <Popover>
            <PopoverTrigger asChild>
              <Button className="absolute top-6 left-6 z-20" size="icon" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <GraphControls
                filters={filters}
                isRefreshing={isDiscovering}
                onFiltersChange={updateFilters}
                onRefresh={handleRefresh}
              />
            </PopoverContent>
          </Popover>

          {/* Cluster Controls */}
          <Popover>
            <PopoverTrigger asChild>
              <Button className="absolute top-20 left-6 z-20" size="icon" variant="outline">
                <Network className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80">
              <ClusterPanel
                isLoading={isClusterLoading}
                onAlgorithmChange={handleClusterAlgorithmChange}
                onRefresh={fetchClusters}
                onSelectCluster={selectCluster}
                onThresholdChange={handleClusterThresholdChange}
                result={clusterResult}
                selectedClusterId={selectedClusterId}
              />
            </PopoverContent>
          </Popover>

          {/* Zoom Controls */}
          <div className="absolute top-20 right-6 z-20 flex flex-col gap-2">
            <Button
              className="bg-white/90 shadow-md hover:bg-white"
              onClick={handleZoomIn}
              size="icon"
              title="Zoom In"
              variant="outline"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              className="bg-white/90 shadow-md hover:bg-white"
              onClick={handleZoomOut}
              size="icon"
              title="Zoom Out"
              variant="outline"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              className="bg-white/90 shadow-md hover:bg-white"
              onClick={handleFitView}
              size="icon"
              title="Fit View (1:1)"
              variant="outline"
            >
              <span className="font-medium text-xs">1:1</span>
            </Button>
            <Button
              className="bg-white/90 shadow-md hover:bg-white"
              onClick={handleToggleFullscreen}
              size="icon"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              variant="outline"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Debug Button */}
          <Button
            className="absolute top-6 right-6 z-20"
            onClick={handleDebugStats}
            size="icon"
            title="View Association Stats (in console)"
            variant="outline"
          >
            <Bug className="h-4 w-4" />
          </Button>

          {/* Graph View */}
          <div className="grow overflow-hidden rounded-lg border">
            <GraphView
              filters={filters}
              highlightedNodeIds={
                selectedClusterId !== undefined
                  ? clusterResult?.clusters.find((c) => c.id === selectedClusterId)?.nodeIds
                  : undefined
              }
              nodeColorMap={getClusterColorsMap(clusterResult)}
              onEdgeClick={handleEdgeClick}
              onNodeClick={onNodeSelect}
              onNodeDoubleClick={handleNodeDoubleClick}
              ref={graphViewRef}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
