import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { ExternalLink, Star, Trash2 } from 'lucide-react'

import type { CollectionListItem } from '@/types/api'
import { formatTime, getDomain } from './utils'

interface ArticleListItemProps {
  item: CollectionListItem
  isSelected: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
}

export function ArticleListItem({
  item,
  isSelected,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
}: ArticleListItemProps) {
  return (
    <button
      className={cn(
        'group relative w-full rounded-lg p-3 text-left transition-colors',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
      onClick={() => onSelect(item.id)}
      type="button"
    >
      {/* Selected Indicator */}
      {isSelected && <div className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}

      {/* Content */}
      <div className="min-w-0">
        <h3 className="mb-1 truncate pr-8 font-medium text-sm leading-snug">{item.title}</h3>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="truncate">{getDomain(item.url)}</span>
          <span>·</span>
          <span className="shrink-0">{formatTime(item.createdAt)}</span>
        </div>
      </div>

      {/* Actions - Show on hover */}
      <div
        className={cn(
          'absolute top-2 right-2 flex items-center gap-0.5 opacity-0 transition-opacity',
          'group-hover:opacity-100',
          isSelected && 'opacity-100'
        )}
      >
        {onToggleStar && (
          <Button
            className="h-7 w-7 text-muted-foreground hover:text-yellow-500"
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar(item.id)
            }}
            size="icon"
            title="星标"
            variant="ghost"
          >
            <Star className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onOpenUrl(item.url)
          }}
          size="icon"
          title="打开原文"
          variant="ghost"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <Button
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          size="icon"
          title="删除"
          variant="ghost"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </button>
  )
}
