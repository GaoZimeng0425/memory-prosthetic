/**
 * Favorite Selector Component
 *
 * Allows users to select a favorite (folder) for saving collections.
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Folder } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { favorites } from '@/apis'

interface FavoriteSelectorProps {
  selectedFavoriteId?: number
  onSelect: (favoriteId: number | undefined) => void
  disabled?: boolean
}

export function FavoriteSelector({ selectedFavoriteId, onSelect, disabled }: FavoriteSelectorProps) {
  const [open, setOpen] = useState(false)

  // Fetch favorites list
  const { data: favoritesList = [], isLoading } = useQuery({
    ...favorites.queries.list(),
  })
  useEffect(() => {
    if (favoritesList.length > 0 && selectedFavoriteId === undefined) {
      onSelect(favoritesList[0]?.id)
    }
  }, [favoritesList, selectedFavoriteId, onSelect])

  const selectedFavorite = favoritesList?.find((f: { id: number }) => f.id === selectedFavoriteId)

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <Button className="w-full justify-start" disabled={disabled || isLoading} size="sm" variant="outline">
          <Folder className="mr-2 size-4" />
          {isLoading ? '加载中...' : selectedFavorite ? selectedFavorite.name : '选择文件夹'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {favoritesList.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-xs">暂无文件夹</span>
          </DropdownMenuItem>
        ) : (
          favoritesList.map((favorite: { id: number; name: string }) => (
            <DropdownMenuItem
              className={selectedFavoriteId === favorite.id ? 'bg-accent' : ''}
              key={favorite.id}
              onClick={() => {
                onSelect(favorite.id)
                setOpen(false)
              }}
            >
              {favorite.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
