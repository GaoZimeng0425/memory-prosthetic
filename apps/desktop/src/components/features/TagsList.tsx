/**
 * Tags List Component
 *
 * Displays a list of tags with expand/collapse functionality.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Hash, Plus, SortAsc } from 'lucide-react'

import type { Tag } from '@memory-prosthetic/shared'
import type { TagSortOrder } from '@memory-prosthetic/shared/apis'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { useTags } from '@/hooks/use-tags'

interface TagsListProps {
  isCollapsed: boolean
  activeTagId?: number | null
  onTagClick: (tagId: number | null) => void
  onCreateClick: () => void
}

export function TagsList({ isCollapsed, activeTagId, onTagClick, onCreateClick }: TagsListProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sortOrder, setSortOrder] = useState<TagSortOrder>('name')
  const { tags, isLoading } = useTags(sortOrder)

  if (isCollapsed) {
    return (
      <div className="p-2">
        <Button
          className="w-full justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
          size="icon"
          variant="ghost"
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <Button
            className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-xs">标签</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-6 w-6 p-0" size="icon" variant="ghost">
                <SortAsc className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortOrder('name')}>按名称排序</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('usage')}>按使用频率排序</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('created')}>按创建时间排序</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Button className="h-6 w-6 p-0" onClick={onCreateClick} size="icon" title="创建标签" variant="ghost">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Tags List */}
      {isExpanded && (
        <div className="space-y-0.5 px-2">
          {isLoading ? (
            <div className="px-2 py-1 text-muted-foreground text-xs">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="px-2 py-1 text-muted-foreground text-xs">暂无标签</div>
          ) : (
            tags.map((tag) => (
              <TagItem
                active={activeTagId === tag.id}
                key={tag.id}
                onClick={() => onTagClick(activeTagId === tag.id ? null : tag.id)}
                tag={tag}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TagItemProps {
  tag: Tag
  active: boolean
  onClick: () => void
}

function TagItem({ tag, active, onClick }: TagItemProps) {
  return (
    <Button
      className={cn(
        'w-full justify-start gap-2 text-xs',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground',
        !active && 'text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
      size="sm"
      variant="ghost"
    >
      <Hash className="h-3 w-3 shrink-0" />
      <span className="flex-1 truncate text-left">{tag.name}</span>
      {/* TODO: Show usage count when we have tag usage API */}
    </Button>
  )
}
