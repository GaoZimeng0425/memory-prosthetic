import { createFileRoute } from '@tanstack/react-router'

import { ArticlesPage } from '@/components/pages/ArticlesPage'

export const Route = createFileRoute('/deleted/article/$articleId')({
  component: ArticlesPage,
})
