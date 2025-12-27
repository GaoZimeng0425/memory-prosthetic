import { Archive, ExternalLink, Folder, Hash, Star, Trash2 } from 'lucide-react'

import type { Tag } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/context-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { TagBadge } from '@/components/features/TagBadge'
import { useDialog } from '@/contexts/DialogContext'
import { useFavorites } from '@/hooks/use-favorites'
import type { CollectionListItem } from '@/types/api'
import { formatTime, getDomain } from './utils'

interface ArticleListItemProps {
  item: CollectionListItem
  isSelected: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onArchive?: (id: number) => void
  tags?: Tag[]
  thumbnailUrl?: string
}

export function ArticleListItem({
  item,
  isSelected,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
  onArchive,
  tags = [],
  thumbnailUrl,
}: ArticleListItemProps) {
  const { openTagDialog, openFavoriteDialog } = useDialog()
  const { favorites } = useFavorites()
  const favorite = item.favoriteId ? favorites.find((f) => f.id === item.favoriteId) : null
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group relative flex w-full gap-3 rounded-lg p-3 text-left transition-colors',
            isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          )}
          onClick={() => onSelect(item.id)}
        >
          {/* Selected Indicator */}
          {isSelected && <div className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}

          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <h3 className="mb-2 line-clamp-2 font-medium text-sm leading-snug">{item.title}</h3>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <TagBadge key={tag.id} size="sm" tag={tag} variant="secondary" />
                ))}
              </div>
            )}

            {/* Meta Info: URL, Category, Time */}
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span className="truncate">{getDomain(item.url)}</span>
              <span>·</span>
              <span>{favorite ? favorite.name : '未分类'}</span>
              <span>·</span>
              <span className="shrink-0">{formatTime(item.createdAt)}</span>
            </div>
          </div>

          {/* Thumbnail Image */}
          {thumbnailUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              <img
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Hide image on error
                  e.currentTarget.style.display = 'none'
                }}
                src={thumbnailUrl}
              />
            </div>
          )}

          {/* Star Toggle - Top right */}

          <Button
            className={cn(
              'absolute top-2 right-2 size-3 transition-colors',
              item.starred ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground/40 hover:text-yellow-500'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar?.(item.id)
            }}
            size="icon"
            title={item.starred ? '取消星标' : '添加星标'}
            variant="ghost"
          >
            <Star className={cn('size-full', item.starred && 'fill-current')} />
          </Button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onToggleStar && (
          <ContextMenuItem onClick={() => onToggleStar(item.id)}>
            <Star className={cn('mr-2 h-4 w-4', item.starred && 'fill-current')} />
            {item.starred ? '取消星标' : '添加星标'}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => openTagDialog(item.id)}>
          <Hash className="mr-2 h-4 w-4" />
          管理标签
        </ContextMenuItem>
        <ContextMenuItem onClick={() => openFavoriteDialog(item.id)}>
          <Folder className="mr-2 h-4 w-4" />
          添加到收藏夹
        </ContextMenuItem>
        {onArchive && (
          <ContextMenuItem onClick={() => onArchive(item.id)}>
            <Archive className="mr-2 h-4 w-4" />
            归档
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => onOpenUrl(item.url)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          打开原文
        </ContextMenuItem>
        <ContextMenuItem className="text-destructive" onClick={() => onDelete(item.id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
