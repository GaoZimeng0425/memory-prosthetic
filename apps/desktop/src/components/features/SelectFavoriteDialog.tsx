/**
 * Select Favorite Dialog Component
 *
 * Dialog for selecting a favorite (folder) for a collection.
 */

import { Check, Folder, FolderPlus } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { useFavorites } from '@/hooks/use-favorites'

interface SelectFavoriteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFavoriteId?: number | null
  onSelect: (favoriteId: number | null) => void
  onCreateNew?: () => void
}

export function SelectFavoriteDialog({
  open,
  onOpenChange,
  currentFavoriteId,
  onSelect,
  onCreateNew,
}: SelectFavoriteDialogProps) {
  const { favorites, isLoading } = useFavorites()

  const handleSelect = (favoriteId: number | null) => {
    onSelect(favoriteId)
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>选择收藏夹</DialogTitle>
          <DialogDescription>为内容选择一个收藏夹</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1">
            {isLoading ? (
              <div className="py-6 text-center text-muted-foreground text-sm">加载中...</div>
            ) : (
              favorites.map((favorite) => (
                <Button
                  className={cn(
                    'w-full justify-start gap-2',
                    currentFavoriteId === favorite.id && 'bg-accent text-accent-foreground'
                  )}
                  key={favorite.id}
                  onClick={() => handleSelect(favorite.id)}
                  variant="ghost"
                >
                  {currentFavoriteId === favorite.id ? <Check className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  <span className="flex-1 text-left">{favorite.name}</span>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {onCreateNew && (
            <Button onClick={onCreateNew} variant="outline">
              <FolderPlus className="mr-2 h-4 w-4" />
              创建新收藏夹
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
