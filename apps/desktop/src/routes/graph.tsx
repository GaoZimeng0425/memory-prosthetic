import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import type { GraphFilters } from '@memory-prosthetic/shared'
import { GraphPage } from '@/components/pages/GraphPage'

export const Route = createFileRoute('/graph')({
  component: GraphPageRoute,
})

function GraphPageRoute() {
  const navigate = useNavigate()
  const [graphFilters, setGraphFilters] = useState<GraphFilters>({
    minWeight: 0.3,
    maxNodes: 100,
  })

  const handleNodeSelect = (nodeId: number) => {
    // 点击节点时，切换到文章列表并选中该文章
    void navigate({ to: '/all/article/$articleId', params: { articleId: String(nodeId) }, resetScroll: false })
  }

  return <GraphPage filters={graphFilters} onFiltersChange={setGraphFilters} onNodeSelect={handleNodeSelect} />
}
