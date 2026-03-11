import { Globe, Hash, Link2, MoreVertical, Move, Star, Trash, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import type { Collection } from '@/types/api'
import { useAppNavigation } from '@/hooks/use-app-navigation'

type ArticleActionsMenuProps = {
  article: Collection | null
  onOpenUrl: (url: string) => void
  onDelete: (id: number) => void
  onPermanentDelete?: (id: number) => void
  onToggleStar?: (id: number) => void
  onSetFavorite?: (id: number, favoriteId: number | null) => void
  onOpenTagDialog?: (id: number) => void
  onOpenFavoriteDialog?: (id: number) => void
}

export const ArticleActionsMenu = ({
  article,
  onOpenUrl,
  onDelete,
  onPermanentDelete,
  onToggleStar,
  onSetFavorite,
  onOpenTagDialog,
  onOpenFavoriteDialog,
}: ArticleActionsMenuProps) => {
  const { getActiveNav } = useAppNavigation()
  const activeNav = getActiveNav()

  const handleCopyUrl = async () => {
    if (!article) return
    try {
      await navigator.clipboard.writeText(article.url ?? '')
      toast.success('链接已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

  if (!article) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="text-muted-foreground hover:text-foreground" size="icon" variant="ghost">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">更多操作</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-10 w-80 bg-popover">
        <div className="border-border border-b px-3 py-2">
          <DropdownMenuLabel className="px-0 font-semibold">阅读器动作</DropdownMenuLabel>
        </div>
        {/* 第一行：功能按钮 */}
        <div className="grid grid-cols-4 gap-0 p-2">
          {article.url && (
            <DropdownMenuItem
              className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
              onClick={() => onOpenUrl(article.url ?? '')}
            >
              <Globe className="size-5 text-foreground" />
              <span className="text-foreground text-xs">使用浏览器访问</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
            onClick={handleCopyUrl}
          >
            <Link2 className="size-5 text-foreground" />
            <span className="text-foreground text-xs">复制网页链接</span>
          </DropdownMenuItem>
          {onOpenTagDialog && (
            <DropdownMenuItem
              className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
              onClick={() => onOpenTagDialog(article.id)}
            >
              <Hash className="size-5 text-foreground" />
              <span className="text-foreground text-xs">标签</span>
            </DropdownMenuItem>
          )}
          {onOpenFavoriteDialog && onSetFavorite && (
            <DropdownMenuItem
              className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
              onClick={() => onOpenFavoriteDialog(article.id)}
            >
              <Move className="size-5 text-foreground" />
              <span className="text-foreground text-xs">移动</span>
            </DropdownMenuItem>
          )}
        </div>
        {/* 第二行：状态按钮 */}
        <div className="border-border border-t p-2">
          <div className="grid grid-cols-4 gap-0">
            <DropdownMenuItem
              className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
              onClick={() => onToggleStar?.(article.id)}
            >
              <Star className={cn('size-5', article?.starred && 'fill-current text-yellow-500')} />
              <span className="text-foreground text-xs">星标</span>
            </DropdownMenuItem>
            {activeNav !== 'deleted' && (
              <DropdownMenuItem
                className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(article.id)}
              >
                <Trash2 className="size-5 text-destructive" />
                <span className="text-destructive text-xs">删除</span>
              </DropdownMenuItem>
            )}
            {onPermanentDelete && (
              <DropdownMenuItem
                className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-destructive/10 focus:text-destructive"
                onClick={() => onPermanentDelete(article.id)}
              >
                <Trash className="size-5 text-destructive" />
                <span className="text-destructive text-xs">永久删除</span>
              </DropdownMenuItem>
            )}
            {/* 空白占位符保持 4 列布局 */}
            <div />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
