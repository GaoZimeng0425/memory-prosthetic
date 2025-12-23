import { useMemo, useState } from 'react'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Search } from 'lucide-react'

import type { CollectionListItem } from '@/types/api'
import { ArticleGroupSection } from './ArticleGroupSection'
import { EmptyState } from './EmptyState'
import { groupByTime } from './utils'

interface ArticleListProps {
  collections: CollectionListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  isLoading?: boolean
}

export function ArticleList({
  collections,
  selectedId,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
  isLoading,
}: ArticleListProps) {
  const [filter, setFilter] = useState('')

  const filteredCollections = useMemo(() => {
    if (!filter.trim()) return collections
    const lowerFilter = filter.toLowerCase()
    return collections.filter(
      (item) => item.title.toLowerCase().includes(lowerFilter) || item.url.toLowerCase().includes(lowerFilter)
    )
  }, [collections, filter])

  const groups = useMemo(() => groupByTime(filteredCollections), [filteredCollections])

  if (isLoading && collections.length === 0) {
    return (
      <div className="flex h-full w-80 flex-col border-border border-r bg-card">
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-80 flex-col overflow-hidden border-border border-r bg-card">
      {/* Filter Input */}
      <div className="border-border border-b p-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 bg-background pl-9 text-sm"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="过滤..."
            value={filter}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="min-h-0 flex-1">
        {groups.length === 0 ? (
          <EmptyState hasFilter={!!filter} />
        ) : (
          <div className="p-2">
            {groups.map((group) => (
              <ArticleGroupSection
                group={group}
                key={group.label}
                onDelete={onDelete}
                onOpenUrl={onOpenUrl}
                onSelect={onSelect}
                onToggleStar={onToggleStar}
                selectedId={selectedId}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Stats */}
      <div className="border-border border-t px-4 py-2">
        <p className="text-muted-foreground text-xs">
          共 {collections.length} 条 {filter && `· 显示 ${filteredCollections.length} 条`}
        </p>
      </div>
    </div>
  )
}
