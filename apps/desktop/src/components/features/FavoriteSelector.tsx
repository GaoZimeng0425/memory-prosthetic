/**
 * Favorite Selector Component
 *
 * Dropdown menu for selecting a favorite (folder) for a collection.
 */

import { Check, Folder, FolderPlus, X } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { useFavorites } from '@/hooks/use-favorites'

interface FavoriteSelectorProps {
  currentFavoriteId?: number | null
  onSelect: (favoriteId: number | null) => void
  onCreateNew?: () => void
  trigger?: React.ReactNode
}

export function FavoriteSelector({ currentFavoriteId, onSelect, onCreateNew, trigger }: FavoriteSelectorProps) {
  const { favorites, isLoading } = useFavorites()

  const currentFavorite = currentFavoriteId ? favorites.find((f) => f.id === currentFavoriteId) : null

  const defaultTrigger = (
    <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" type="button">
      <Folder className="h-4 w-4" />
      <span>{currentFavorite ? currentFavorite.name : '添加到收藏夹'}</span>
    </button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger || defaultTrigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>选择收藏夹</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>加载中...</DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem className={cn(currentFavoriteId === null && 'bg-accent')} onClick={() => onSelect(null)}>
              {currentFavoriteId === null && <Check className="mr-2 h-4 w-4" />}
              {currentFavoriteId !== null && <X className="mr-2 h-4 w-4" />}
              未分类
            </DropdownMenuItem>
            {favorites.map((favorite) => (
              <DropdownMenuItem
                className={cn(currentFavoriteId === favorite.id && 'bg-accent')}
                key={favorite.id}
                onClick={() => onSelect(favorite.id)}
              >
                {currentFavoriteId === favorite.id ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Folder className="mr-2 h-4 w-4" />
                )}
                {favorite.name}
              </DropdownMenuItem>
            ))}
            {onCreateNew && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateNew}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  创建新收藏夹
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
