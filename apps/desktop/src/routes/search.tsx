import { createFileRoute } from '@tanstack/react-router'

import { SearchWindow } from '@/pages/SearchWindow'

export const Route = createFileRoute('/search')({
  component: SearchWindow,
})
