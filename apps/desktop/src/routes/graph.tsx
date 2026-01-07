import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { GraphPage } from '@/components/pages/GraphPage'

export const Route = createFileRoute('/graph')({
  component: GraphPageRoute,
})

function GraphPageRoute() {
  const navigate = useNavigate()

  const handleNodeSelect = (nodeId: number) => {
    // 点击节点时，切换到文章列表并选中该文章
    void navigate({ to: '/all/article/$articleId', params: { articleId: String(nodeId) }, resetScroll: false })
  }

  return <GraphPage onNodeSelect={handleNodeSelect} />
}
