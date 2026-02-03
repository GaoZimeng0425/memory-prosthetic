/**
 * Favorites List Component
 *
 * Displays a list of favorites (folders) with expand/collapse functionality.
 * Optimized to use useSidebarSync for favorites with counts.
 */
import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Folder, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { FavoriteWithCount } from '@memory-prosthetic/shared'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/context-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { EditFavoriteDialog } from '@/components/features/EditFavoriteDialog'
import { useSidebarSync } from '@/hooks/use-sidebar-sync'
import { useFavorites } from '@/hooks/use-favorites'

type FavoritesListProps = {
  isCollapsed: boolean
  onCreateClick: () => void
  onFavoriteChange?: () => void
}

export const FavoritesList = ({ isCollapsed, onCreateClick, onFavoriteChange }: FavoritesListProps) => {
  const [isExpanded, setIsExpanded] = useState(true)
  // Use useSidebarSync for optimized favorites with counts data
  const { favorites, isLoading } = useSidebarSync()
  const params = useParams({ strict: false })
  const activeFavoriteId = params.favoriteId ? Number(params.favoriteId) : null

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
              {/* 收藏夹列表 - 包括"未分类" */}
              {favorites.map((favorite) => (
                <FavoriteItemWithCount
                  active={activeFavoriteId === favorite.id}
                  favorite={favorite}
                  key={favorite.id}
                  onFavoriteChange={onFavoriteChange}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface FavoriteItemWithCountProps {
  favorite: FavoriteWithCount
  active: boolean
  onFavoriteChange?: () => void
}

function FavoriteItemWithCount({ favorite, active, onFavoriteChange }: FavoriteItemWithCountProps) {
  // favorite now includes count from useSidebarSync, no need to fetch collections
  const { deleteFavorite } = useFavorites()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const count = favorite.count // Use count directly from FavoriteWithCount

  const handleDelete = async () => {
    // if (favorite.name === '未分类') {
    //   return // 不能删除默认收藏夹
    // }

    setIsDeleting(true)
    try {
      const hasContent = count > 0
      if (hasContent) {
        const confirmed = window.confirm(
          `收藏夹"${favorite.name}"中有 ${count} 条内容。删除后，这些内容将移动到"未分类"。确定要删除吗？`
        )
        if (!confirmed) {
          return
        }
      }

      await deleteFavorite(favorite.id)
      toast.success('收藏夹已删除')
      onFavoriteChange?.()
    } catch (error) {
      toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Navigate to favorite route using favorite ID
  const to = `/favorite/${favorite.id}`

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Link
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
              active && 'bg-sidebar-accent text-sidebar-accent-foreground',
              !active && 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
            )}
            to={to}
          >
            <Folder className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate text-left">{favorite.name}</span>
            {count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
                {count}
              </span>
            )}
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {
            <>
              <ContextMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                重命名
              </ContextMenuItem>
              <ContextMenuItem className="text-destructive" disabled={isDeleting} onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </ContextMenuItem>
            </>
          }
        </ContextMenuContent>
      </ContextMenu>

      <EditFavoriteDialog
        favorite={favorite}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            onFavoriteChange?.()
          }
        }}
        open={isEditDialogOpen}
      />
    </>
  )
}
