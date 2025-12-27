import { useRef } from 'react'
import { Calendar, ExternalLink, Folder, Globe, Hash, Maximize2, Minimize2, Star, Trash2 } from 'lucide-react'

import { formatDateTime, getDomain } from '@memory-prosthetic/shared/utils/date'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { TagBadge } from '@/components/features/TagBadge'
import { Link } from '@/components/Link'
import { useDialog } from '@/contexts/DialogContext'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import type { Collection } from '@/types/api'

type ArticleReaderProps = {
  className?: string
  article: Collection | null
  isMaximized: boolean
  onToggleMaximize: () => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onSetFavorite?: (id: number, favoriteId: number | null) => void
  onArchive?: (id: number) => void
  onRestore?: (id: number) => void
  onPermanentDelete?: (id: number) => void
  isLoading?: boolean
}

export const ArticleReader = ({
  className,
  article,
  isMaximized,
  onToggleMaximize,
  onDelete,
  onOpenUrl,
  onToggleStar,
  onSetFavorite,
  onArchive,
  onRestore,
  onPermanentDelete,
  isLoading,
}: ArticleReaderProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { tags: collectionTags, removeTag } = useCollectionTags(article?.id ?? null)
  const { openTagDialog, openFavoriteDialog } = useDialog()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Globe className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-medium text-lg">选择一篇文章</h3>
        <p className="max-w-sm text-muted-foreground text-sm">从左侧列表中选择一篇文章来阅读内容</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-1 flex-col overflow-hidden bg-background',
        isMaximized && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-2">
          {onToggleStar && (
            <Button
              className={cn(
                'transition-colors',
                article.starred
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-muted-foreground hover:text-yellow-500'
              )}
              onClick={() => onToggleStar(article.id)}
              size="icon"
              title={article.starred ? '取消星标' : '添加星标'}
              variant="ghost"
            >
              <Star className={cn('h-4 w-4', article.starred && 'fill-current')} />
            </Button>
          )}
          <Button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onOpenUrl(article.url)}
            size="sm"
            variant="ghost"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            打开原文
          </Button>
          {onSetFavorite && article && (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => openFavoriteDialog(article.id)}
              size="sm"
              variant="ghost"
            >
              <Folder className="mr-2 h-4 w-4" />
              收藏夹
            </Button>
          )}
          {article && (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => openTagDialog(article.id)}
              size="sm"
              variant="ghost"
            >
              <Hash className="mr-2 h-4 w-4" />
              管理标签
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(article.status === 'archived' || article.status === 'deleted') && onRestore && (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onRestore(article.id)}
              size="sm"
              variant="ghost"
            >
              恢复
            </Button>
          )}
          {article.status === 'active' && onArchive && (
            <Button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onArchive(article.id)}
              size="sm"
              variant="ghost"
            >
              归档
            </Button>
          )}
          {article.status === 'deleted' && onPermanentDelete && (
            <Button
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onPermanentDelete(article.id)}
              size="sm"
              variant="ghost"
            >
              永久删除
            </Button>
          )}
          {article.status !== 'deleted' && (
            <Button
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(article.id)}
              size="icon"
              title="删除"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Separator className="h-6" orientation="vertical" />
          <Button
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggleMaximize}
            size="icon"
            title={isMaximized ? '退出全屏' : '全屏阅读'}
            variant="ghost"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 flex-1" ref={scrollAreaRef}>
        <article className="mx-auto max-w-3xl px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="mb-4 font-bold text-2xl leading-tight tracking-tight">{article.title}</h1>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  <Link className="hover:text-foreground" href={article.url}>
                    {getDomain(article.url)}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDateTime(article.createdAt)}</span>
                </div>
              </div>

              {/* Tags Section */}
              {collectionTags.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-sm">标签</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {collectionTags.map((tag) => (
                      <TagBadge key={tag.id} onRemove={() => removeTag(tag.id)} tag={tag} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </header>

          <Separator className="mb-8" />

          {/* Body */}
          <div className="max-w-none">
            {article.content ? (
              <MarkdownUI markdown={article.content} scrollAreaRef={scrollAreaRef} />
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                <p className="text-muted-foreground">没有可显示的内容</p>
                <Button className="mt-4" onClick={() => onOpenUrl(article.url)} size="sm" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  在浏览器中查看
                </Button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-12 border-border border-t pt-6">
            <p className="text-muted-foreground text-xs">收集于 {formatDateTime(article.createdAt)}</p>
            <p className="mt-1 truncate text-muted-foreground text-xs">
              <Link className="hover:text-foreground" href={article.url}>
                {article.url}
              </Link>
            </p>
          </div>
        </article>
      </ScrollArea>
    </div>
  )
}
