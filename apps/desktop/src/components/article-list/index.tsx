import { useMemo, useState } from 'react'
import leven from 'leven'
import { ArrowDown, ArrowUp, Clock, Search, X } from 'lucide-react'

import type { CollectionType } from '@memory-prosthetic/shared/types/collection'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ButtonGroup } from '@memory-prosthetic/ui/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { TypeFilter } from '@/components/features/TypeFilter'
import type { CollectionListItem } from '@/types/api'
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
  const [sortByTime, setSortByTime] = useState(false)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc') // 'desc' = 最新的在前, 'asc' = 旧的在前
  const [selectedTypes, setSelectedTypes] = useState<CollectionType[]>([])

  const filteredCollections = useMemo(() => {
    let result = collections

    if (selectedTypes.length > 0) {
      // Filter by selected types if any
      result = result.filter((item) => item.type && selectedTypes.includes(item.type as CollectionType))
    }

    // Filter by search query
    const query = filter.trim()

    // 有搜索查询时，先进行搜索过滤
    const scored = result
      .map((item) => {
        const titleScore = getFuzzyScore(item.title, query)
        const urlScore = item.url ? getFuzzyScore(item.url, query) : Number.POSITIVE_INFINITY
        const score = Math.min(titleScore, urlScore)
        return { item, score }
      })
      .filter(({ score }) => score < Number.POSITIVE_INFINITY)

    if (sortByTime) {
      // 按时间排序
      return scored
        .map(({ item }) => item)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
        })
    }

    // 按相关度排序（匹配度高的在前）
    return scored
      .sort((a, b) => a.score - b.score) // 按相关度排序
      .map(({ item }) => item)
  }, [collections, filter, sortByTime, sortOrder, selectedTypes])

  const groups = useMemo(() => groupByTime(filteredCollections), [filteredCollections])

  if (isLoading && collections.length === 0) {
    return (
      <div className="flex h-full w-80 flex-col">
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full w-80 flex-col overflow-hidden', className)}>
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
      <div className="space-y-2 border-border border-b p-3">
        <ButtonGroup>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 rounded-r-none bg-background pl-9 text-sm"
              onChange={(e) => setFilter(e.target.value)}
              placeholder="过滤..."
              value={filter}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={cn(sortByTime && 'bg-accent text-accent-foreground')} size="sm" variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                {sortByTime ? (
                  <>
                    按时间
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    )}
                  </>
                ) : (
                  '按相关度'
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className={!sortByTime ? 'bg-accent' : ''}
                onClick={() => {
                  setSortByTime(false)
                }}
              >
                按相关度排序
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortByTime && sortOrder === 'desc' ? 'bg-accent' : ''}
                onClick={() => {
                  setSortByTime(true)
                  setSortOrder('desc')
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span>按时间排序（倒序）</span>
                  <ArrowDown className="h-3 w-3" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortByTime && sortOrder === 'asc' ? 'bg-accent' : ''}
                onClick={() => {
                  setSortByTime(true)
                  setSortOrder('asc')
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span>按时间排序（正序）</span>
                  <ArrowUp className="h-3 w-3" />
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TypeFilter onSelectionChange={setSelectedTypes} selectedTypes={selectedTypes} />
        </ButtonGroup>
      </div>

      {/* List */}
      <ScrollArea className="min-h-0 flex-1">
        {groups.length === 0 ? (
          <EmptyState hasFilter={!!filter} />
        ) : (
          <div className="space-y-1 divide-y divide-border p-2">
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
