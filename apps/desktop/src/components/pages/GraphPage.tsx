import type { GraphFilters } from '@memory-prosthetic/shared'
import { GraphControls } from '@/components/features/GraphControls'
import { GraphView } from '@/components/features/GraphView'

interface GraphPageProps {
  filters: GraphFilters
  onFiltersChange: (filters: GraphFilters) => void
  onNodeSelect: (nodeId: number) => void
}

export function GraphPage({ filters, onFiltersChange, onNodeSelect }: GraphPageProps) {
  const handleEdgeClick = (edgeId: string) => {
    console.log('Edge clicked:', edgeId)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-full gap-4 overflow-hidden p-4">
        {/* Graph Controls */}
        <div className="w-80 shrink-0 overflow-y-auto">
          <GraphControls
            filters={filters}
            onFiltersChange={onFiltersChange}
            onRefresh={() => {
              // GraphView 会自动通过 useQuery 刷新
            }}
          />
        </div>

        {/* Graph View */}
        <div className="flex-1 overflow-hidden rounded-lg border">
          <GraphView filters={filters} onEdgeClick={handleEdgeClick} onNodeClick={onNodeSelect} />
        </div>
      </div>
    </div>
  )
}
