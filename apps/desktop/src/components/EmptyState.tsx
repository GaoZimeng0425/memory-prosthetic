import { Database, Search, Sparkles } from 'lucide-react'

interface EmptyStateProps {
  type: 'search' | 'no-results' | 'error'
  message?: string
}

export function EmptyState({ type, message }: EmptyStateProps) {
  const config = {
    search: {
      icon: Search,
      title: 'Search your memory',
      description: 'Type a query to search through your collected content using semantic search.',
    },
    'no-results': {
      icon: Database,
      title: 'No results found',
      description: message || 'Try a different search query or collect more content.',
    },
    error: {
      icon: Sparkles,
      title: 'Semantic search unavailable',
      description: message || 'The embedding model is not available. Please download it first.',
    },
  }

  const { icon: Icon, title, description } = config[type]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 font-medium text-lg">{title}</h3>
      <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
    </div>
  )
}
