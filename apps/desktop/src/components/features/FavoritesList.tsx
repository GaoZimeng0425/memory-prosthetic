/**
 * Favorites List Component
 *
 * Displays a list of favorites (folders) with expand/collapse functionality.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, Plus } from 'lucide-react'

import type { Favorite } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { useFavorites } from '@/hooks/use-favorites'

interface FavoritesListProps {
  isCollapsed: boolean
  activeFavoriteId?: number
  onFavoriteClick: (favoriteId: number | null) => void
  onCreateClick: () => void
}

export function FavoritesList({ isCollapsed, activeFavoriteId, onFavoriteClick, onCreateClick }: FavoritesListProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { favorites, isLoading } = useFavorites()

  if (isCollapsed) {
    return (
      <div className="p-2">
        <Button
          className="w-full justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
          size="icon"
          variant="ghost"
        >
          <Folder className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <Button
          className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-xs">收藏夹</span>
        </Button>
        <Button className="h-6 w-6 p-0" onClick={onCreateClick} size="icon" title="创建收藏夹" variant="ghost">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Favorites List */}
      {isExpanded && (
        <div className="space-y-0.5 px-2">
          {isLoading ? (
            <div className="px-2 py-1 text-muted-foreground text-xs">加载中...</div>
          ) : (
            <>
              {/* 未分类选项 */}
              <Button
                className={cn(
                  'w-full justify-start gap-2 text-xs',
                  activeFavoriteId === null && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  activeFavoriteId !== null && 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onFavoriteClick(null)}
                size="sm"
                variant="ghost"
              >
                <Folder className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate text-left">未分类</span>
              </Button>
              {/* 收藏夹列表 */}
              {favorites.length === 0 ? (
                <div className="px-2 py-1 text-muted-foreground text-xs">暂无收藏夹</div>
              ) : (
                favorites.map((favorite) => (
                  <FavoriteItem
                    active={activeFavoriteId === favorite.id}
                    favorite={favorite}
                    key={favorite.id}
                    onClick={() => onFavoriteClick(favorite.id)}
                  />
                ))
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface FavoriteItemProps {
  favorite: Favorite
  active: boolean
  onClick: () => void
}

function FavoriteItem({ favorite, active, onClick }: FavoriteItemProps) {
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
      <Folder className="h-3 w-3 shrink-0" />
      <span className="flex-1 truncate text-left">{favorite.name}</span>
      {/* TODO: Show count when we have collection count API */}
    </Button>
  )
}
