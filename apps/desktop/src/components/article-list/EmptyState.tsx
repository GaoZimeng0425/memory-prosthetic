import { ExternalLink } from 'lucide-react'

interface EmptyStateProps {
  hasFilter: boolean
}

export function EmptyState({ hasFilter }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <ExternalLink className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{hasFilter ? '没有匹配的内容' : '还没有收集任何内容'}</p>
    </div>
  )
}
