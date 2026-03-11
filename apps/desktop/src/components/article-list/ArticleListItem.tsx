import { Archive, ExternalLink, Folder, Hash, Star } from 'lucide-react'

import type { Tag } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/context-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { PermanentDeleteButton } from '@/components/features/PermanentDeleteButton'
import { SoftDeleteButton } from '@/components/features/SoftDeleteButton'
import { TagBadge } from '@/components/features/TagBadge'
import { useFavorites } from '@/hooks/use-favorites'
import { useAppNavigation } from '@/hooks/use-app-navigation'
import type { CollectionListItem } from '@/types/api'
import { formatTime, getDomain } from './utils'

interface ArticleListItemProps {
  item: CollectionListItem
  isSelected: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onPermanentDelete?: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onArchive?: (id: number) => void
  onManageTags?: (collectionId: number) => void
  onSelectFavorite?: (collectionId: number) => void
  tags?: Tag[]
  thumbnailUrl?: string
}

export function ArticleListItem({
  item,
  isSelected,
  onSelect,
  onDelete,
  onPermanentDelete,
  onOpenUrl,
  onToggleStar,
  onArchive,
  onManageTags,
  onSelectFavorite,
  tags = [],
  thumbnailUrl,
}: ArticleListItemProps) {
  const { favorites } = useFavorites()
  const { getActiveNav } = useAppNavigation()
  const activeNav = getActiveNav()
  const favorite = item.favoriteId ? favorites.find((f) => f.id === item.favoriteId) : null
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group relative flex w-full gap-3 overflow-hidden rounded-lg border border-primary/10 bg-background p-3 text-left shadow transition-colors',
            isSelected ? 'border-primary text-accent-foreground' : 'hover:bg-primary/5'
          )}
          onClick={() => onSelect(item.id)}
        >
          {/* Selected Indicator */}
          {isSelected && <div className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}

          {/* Main Content */}
          <div className="min-w-0 flex-1 pb-8">
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
            <div className="absolute right-0 bottom-0 left-0 flex items-center gap-2 whitespace-nowrap bg-muted-foreground/10 px-3 py-1 text-[10px] text-muted-foreground">
              {item.url && (
                <>
                  <span className="truncate">{getDomain(item.url)}</span>
                  <span>·</span>
                </>
              )}
              {item.type && (
                <>
                  <span className="truncate">{item.type}</span>
                  <span>·</span>
                </>
              )}
              <span className="truncate">{favorite ? favorite.name : '未分类'}</span>
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
              'absolute top-2 right-2 size-3 rounded-full transition-colors',
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
            <Star className={cn('size-full text-yellow-400', item.starred && 'fill-current')} />
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
        {onManageTags && (
          <ContextMenuItem onClick={() => onManageTags(item.id)}>
            <Hash className="mr-2 h-4 w-4" />
            管理标签
          </ContextMenuItem>
        )}
        {onSelectFavorite && (
          <ContextMenuItem onClick={() => onSelectFavorite(item.id)}>
            <Folder className="mr-2 h-4 w-4" />
            添加到收藏夹
          </ContextMenuItem>
        )}
        {onArchive && (
          <ContextMenuItem onClick={() => onArchive(item.id)}>
            <Archive className="mr-2 h-4 w-4" />
            归档
          </ContextMenuItem>
        )}
        {item.url && (
          <ContextMenuItem onClick={() => onOpenUrl(item.url!)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            打开原文
          </ContextMenuItem>
        )}
        {activeNav !== 'deleted' && <SoftDeleteButton articleId={item.id} onDelete={onDelete} />}
        {onPermanentDelete && <PermanentDeleteButton articleId={item.id} onPermanentDelete={onPermanentDelete} />}
      </ContextMenuContent>
    </ContextMenu>
  )
}
