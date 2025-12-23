import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { Calendar, ExternalLink, Globe, Maximize2, Minimize2, Star, Trash2 } from 'lucide-react'

import type { Collection } from '@/types/api'

interface ArticleReaderProps {
  article: Collection | null
  isMaximized: boolean
  onToggleMaximize: () => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  isLoading?: boolean
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function ArticleReader({
  article,
  isMaximized,
  onToggleMaximize,
  onDelete,
  onOpenUrl,
  onToggleStar,
  isLoading,
}: ArticleReaderProps) {
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
    <div className={cn('flex flex-1 flex-col overflow-hidden bg-background', isMaximized && 'fixed inset-0 z-50')}>
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-2">
          {onToggleStar && (
            <Button
              className="text-muted-foreground hover:text-yellow-500"
              onClick={() => onToggleStar(article.id)}
              size="icon"
              title="星标"
              variant="ghost"
            >
              <Star className="h-4 w-4" />
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
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(article.id)}
            size="icon"
            title="删除"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
      <ScrollArea className="min-h-0 flex-1">
        <article className="mx-auto max-w-3xl px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="mb-4 font-bold text-2xl leading-tight tracking-tight">{article.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                <a
                  className="hover:text-foreground hover:underline"
                  href={article.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {getDomain(article.url)}
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(article.createdAt)}</span>
              </div>
            </div>
          </header>

          <Separator className="mb-8" />

          {/* Body */}
          <div className="prose prose-invert max-w-none">
            {article.content ? (
              <div
                className="whitespace-pre-wrap text-foreground/90 leading-relaxed"
                style={{ wordBreak: 'break-word' }}
              >
                {article.content}
              </div>
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
            <p className="text-muted-foreground text-xs">收集于 {formatDate(article.createdAt)}</p>
            <p className="mt-1 truncate text-muted-foreground text-xs">
              <a
                className="hover:text-foreground hover:underline"
                href={article.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {article.url}
              </a>
            </p>
          </div>
        </article>
      </ScrollArea>
    </div>
  )
}
