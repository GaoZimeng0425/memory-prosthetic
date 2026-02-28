/**
 * Select Favorite Dialog Component (Composable)
 *
 * Dialog for selecting a favorite (folder) for a collection.
 * Supports two modes:
 * 1. With collectionId: Directly updates the collection's favorite
 * 2. With onSelect: Just returns selected favoriteId (for new collections)
 */

import { Check, Folder, FolderPlus } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'

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
import { useCollections } from '@/hooks/use-collections'

interface SelectFavoriteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** For existing collections: directly updates the favorite */
  collectionId?: number
  /** For new collections: just returns the selected favoriteId */
  onSelect?: (favoriteId: number | null) => void
  currentFavoriteId?: number | null
  onCreateNew?: () => void
}

export function SelectFavoriteDialog({
  open,
  onOpenChange,
  collectionId,
  onSelect,
  currentFavoriteId,
  onCreateNew,
}: SelectFavoriteDialogProps) {
  const { favorites, isLoading } = useFavorites()
  const { setFavorite } = useCollections({ status: 'active' })

  const handleSelect = useCallback(
    async (favoriteId: number | null) => {
      // Mode 1: Direct update for existing collection
      if (collectionId) {
        try {
          await setFavorite(collectionId, favoriteId)
          toast.success('收藏夹已设置')
          onOpenChange(false)
        } catch (error) {
          console.error('[SelectFavoriteDialog] Failed to set favorite:', error)
          toast.error(`设置收藏夹失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }
      // Mode 2: Just callback for new collection
      else if (onSelect) {
        onSelect(favoriteId)
        onOpenChange(false)
      }
    },
    [collectionId, setFavorite, onSelect, onOpenChange]
  )

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
            {/* Option to remove favorite */}
            <Button
              className="w-full justify-start gap-2"
              onClick={() => handleSelect(null)}
              variant="ghost"
            >
              <Folder className="h-4 w-4 opacity-50" />
              <span className="flex-1 text-left text-muted-foreground">移除收藏夹</span>
            </Button>
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
