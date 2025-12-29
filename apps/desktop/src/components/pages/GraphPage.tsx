import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { Bug, SlidersHorizontal } from 'lucide-react'

import type { CommandResult, GraphFilters } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import { GraphControls } from '@/components/features/GraphControls'
import { GraphView } from '@/components/features/GraphView'
import { checkAssociationStats } from '@/utils/debug-associations'

interface GraphPageProps {
  filters: GraphFilters
  onFiltersChange: (filters: GraphFilters) => void
  onNodeSelect: (nodeId: number) => void
}

export function GraphPage({ filters, onFiltersChange, onNodeSelect }: GraphPageProps) {
  const queryClient = useQueryClient()
  const [isDiscovering, setIsDiscovering] = useState(false)

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

  return (
    <div className="relative flex h-full grow flex-col overflow-hidden">
      <div className="flex h-full gap-4 overflow-hidden p-4">
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
          <GraphView filters={filters} onEdgeClick={handleEdgeClick} onNodeClick={onNodeSelect} />
        </div>
      </div>
    </div>
  )
}
