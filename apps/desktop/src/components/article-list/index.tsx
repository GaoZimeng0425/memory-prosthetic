import { useMemo, useState } from 'react'
import leven from 'leven'
import { Search, X } from 'lucide-react'

import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import type { CollectionListItem } from '@/types/api'
import { cn } from '../../../../../packages/ui/src/utils/tw'
import { ArticleGroupSection } from './ArticleGroupSection'
import { EmptyState } from './EmptyState'
import { groupByTime } from './utils'

/** 计算模糊匹配得分 (越小越匹配) */
const getFuzzyScore = (text: string, query: string): number => {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()

  // 完全包含: 最高优先级
  if (lowerText.includes(lowerQuery)) {
    return 0
  }

  // 计算每个单词与 query 的最小 Levenshtein 距离
  const words = lowerText.split(/\s+/)
  let minDistance = Number.POSITIVE_INFINITY

  for (const word of words) {
    const distance = leven(word, lowerQuery)
    // 允许的最大编辑距离 = query 长度的 40%
    if (distance <= Math.ceil(lowerQuery.length * 0.4)) {
      minDistance = Math.min(minDistance, distance)
    }
  }

  return minDistance
}

interface ArticleListProps {
  className?: string
  collections: CollectionListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onArchive?: (id: number) => void
  isLoading?: boolean
  filterHint?: {
    type: 'favorite' | 'tag' | 'archived' | 'deleted' | null
    label: string
    count: number
    onClear?: () => void
  }
}

export function ArticleList({
  className,
  collections,
  selectedId,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
  onArchive,
  isLoading,
  filterHint,
}: ArticleListProps) {
  const [filter, setFilter] = useState('')

  const filteredCollections = useMemo(() => {
    const query = filter.trim()
    if (!query) return collections

    // 计算每个 item 的匹配得分
    const scored = collections
      .map((item) => {
        const titleScore = getFuzzyScore(item.title, query)
        const urlScore = getFuzzyScore(item.url, query)
        const score = Math.min(titleScore, urlScore)
        return { item, score }
      })
      .filter(({ score }) => score < Number.POSITIVE_INFINITY) // 过滤掉完全不匹配的
      .sort((a, b) => a.score - b.score) // 按相关度排序

    return scored.map(({ item }) => item)
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
    <div className={cn('flex h-full w-80 flex-col overflow-hidden border-border border-r bg-card', className)}>
      {/* Filter Hint */}
      {filterHint?.type && (
        <div className="border-border border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="text-xs" variant="secondary">
                {filterHint.label} ({filterHint.count} 条)
              </Badge>
            </div>
            {filterHint.onClear && (
              <Button className="h-5 w-5 p-0" onClick={filterHint.onClear} size="icon" title="清除筛选" variant="ghost">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

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
                onArchive={onArchive}
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
