import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { Bug, Maximize2, Minimize2, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react'

import type { CommandResult, GraphFilters } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import { GraphControls } from '@/components/features/GraphControls'
import { GraphView, type GraphViewRef } from '@/components/features/GraphView'
import { checkAssociationStats } from '@/utils/debug-associations'

interface GraphPageProps {
  filters: GraphFilters
  onFiltersChange: (filters: GraphFilters) => void
  onNodeSelect: (nodeId: number) => void
}

export function GraphPage({ filters, onFiltersChange, onNodeSelect }: GraphPageProps) {
  const queryClient = useQueryClient()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const graphViewRef = useRef<GraphViewRef>(null)

  const handleEdgeClick = (edgeId: string) => {
    console.log('Edge clicked:', edgeId)
  }

  const handleRefresh = async () => {
    setIsDiscovering(true)
    try {
      // 先触发批量关联发现
      const result = await invoke<CommandResult<number>>('discover_all_associations')
      console.log(`发现了 ${result.data} 个关联`)

      // 然后刷新图谱数据
      await queryClient.invalidateQueries({ queryKey: ['graph', 'data'] })
    } catch (error) {
      console.error('刷新图谱失败:', error)
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleDebugStats = async () => {
    try {
      await checkAssociationStats()
    } catch (error) {
      console.error('获取关联统计失败:', error)
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

  // 监听全屏状态变化
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
              onFiltersChange={onFiltersChange}
              onRefresh={handleRefresh}
            />
          </PopoverContent>
        </Popover>

        {/* Zoom Controls */}
        <div className="absolute top-20 right-6 z-20 flex flex-col gap-2">
          <Button
            className="bg-white/90 shadow-md hover:bg-white"
            onClick={handleZoomIn}
            size="icon"
            title="放大"
            variant="outline"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            className="bg-white/90 shadow-md hover:bg-white"
            onClick={handleZoomOut}
            size="icon"
            title="缩小"
            variant="outline"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            className="bg-white/90 shadow-md hover:bg-white"
            onClick={handleFitView}
            size="icon"
            title="适应视图 (1:1)"
            variant="outline"
          >
            <span className="font-medium text-xs">1:1</span>
          </Button>
          <Button
            className="bg-white/90 shadow-md hover:bg-white"
            onClick={handleToggleFullscreen}
            size="icon"
            title={isFullscreen ? '退出全屏' : '全屏'}
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
          title="查看关联统计（在控制台）"
          variant="outline"
        >
          <Bug className="h-4 w-4" />
        </Button>

        {/* Graph View */}
        <div className="grow overflow-hidden rounded-lg border">
          <GraphView filters={filters} onEdgeClick={handleEdgeClick} onNodeClick={onNodeSelect} ref={graphViewRef} />
        </div>
      </div>
    </div>
  )
}
