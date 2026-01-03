import { Activity, useEffect, useRef, useState } from 'react'
import {
  Archive,
  Calendar,
  ExternalLink,
  Globe,
  Maximize2,
  Minimize2,
  PaintbrushIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

import { formatDateTime, getDomain } from '@memory-prosthetic/shared/utils/date'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ButtonGroup } from '@memory-prosthetic/ui/components/ui/button-group'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { useTheme } from '@memory-prosthetic/ui/hooks/use-theme'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { AiButton } from '@/components/features/AiButton'
import { ArticleActionsMenu } from '@/components/features/ArticleActionsMenu'
import { TagBadge } from '@/components/features/TagBadge'
import { Link } from '@/components/Link'
import { ReaderSettings } from '@/components/ReaderSettings'
import { useDialog } from '@/contexts/DialogContext'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useResizeObserver } from '@/hooks/use-resize-observer'
import { useWebviewWindow } from '@/hooks/use-webview-window'
import { useReaderStore } from '@/store/reader-store'
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

type ViewMode = 'markdown' | 'webview'

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
  isLoading,
}: ArticleReaderProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const webviewContainerRef = useRef<HTMLDivElement>(null)
  const { tags: collectionTags, removeTag } = useCollectionTags(article?.id ?? null)
  const { openTagDialog, openFavoriteDialog } = useDialog()
  const [viewMode, setViewMode] = useState<ViewMode>('markdown')
  const { fontSize, fontFamily, layout, getBackgroundColorClassName } = useReaderStore()
  const { resolvedTheme } = useTheme()

  // 当文章切换时，重置为原文视图
  // biome-ignore lint/correctness/useExhaustiveDependencies: 当文章切换时，重置为原文视图
  useEffect(() => {
    setViewMode('markdown')
  }, [article?.id])

  // 根据当前主题获取背景色类名
  const backgroundColorClassName = getBackgroundColorClassName(resolvedTheme === 'dark' ? 'dark' : 'light')

  // 使用原生 webview 窗口（绕过 CSP 限制）
  const {
    isLoading: webviewLoading,
    error: webviewError,
    openWebview,
    updateWebview,
    closeWebview,
  } = useWebviewWindow(viewMode === 'webview')

  // 当切换到 webview 模式时，打开原生 webview 窗口
  useEffect(() => {
    if (viewMode === 'webview' && article?.url) {
      // 等待 DOM 更新后获取容器元素的位置
      const timer = setTimeout(() => {
        void openWebview(article.url, article.title, webviewContainerRef.current)
      }, 100)
      return () => clearTimeout(timer)
    }
    void closeWebview()
  }, [viewMode, article?.url, article?.title, openWebview, closeWebview])

  // 监听容器大小变化，同步更新 webview 的位置和大小
  useResizeObserver(webviewContainerRef, {
    onResize: () => {
      if (viewMode === 'webview' && webviewContainerRef.current) {
        void updateWebview(webviewContainerRef.current)
      }
    },
    debounceMs: 100,
    enabled: viewMode === 'webview',
  })

  // 不再使用 iframe，改用原生 webview 窗口

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
        'm-2 flex flex-1 flex-col overflow-hidden rounded-2xl bg-background shadow-lg',
        isMaximized && 'fixed inset-0 z-50',
        backgroundColorClassName,
        className
      )}
    >
      {/* Toolbar */}
      <div className="relative z-10 flex h-14 shrink-0 items-center justify-between border-border border-b px-4">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Toggle Fullscreen"
            className="rounded-full bg-secondary shadow-lg hover:text-foreground"
            onClick={onToggleMaximize}
            size="icon"
            title={isMaximized ? '退出全屏' : '全屏阅读'}
            variant="ghost"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ButtonGroup className="divide-x divide-muted-foreground/5 overflow-hidden rounded-full bg-secondary shadow-lg">
            <Button
              aria-label="原文视图"
              className={cn(viewMode === 'markdown' && 'bg-primary/80 text-primary-foreground')}
              onClick={() => setViewMode('markdown')}
              size="sm"
              variant="ghost"
            >
              原文
            </Button>
            <Button
              aria-label="网页视图"
              className={cn(viewMode === 'webview' && 'bg-primary/80 text-primary-foreground')}
              onClick={() => setViewMode('webview')}
              size="sm"
              variant="ghost"
            >
              网页
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex items-center gap-2">
          <Activity mode={viewMode === 'webview' ? 'hidden' : 'visible'}>
            <ButtonGroup className="divide-x divide-muted-foreground/5 overflow-hidden rounded-full bg-secondary shadow-lg">
              {/* AI 分析按钮 */}
              <AiButton article={article} />
              <ReaderSettings
                trigger={
                  <Button size="icon" variant="ghost">
                    <PaintbrushIcon />
                  </Button>
                }
              />

              {(article.status === 'archived' || article.status === 'deleted') && onRestore && (
                <Button aria-label="Restore" onClick={() => onRestore(article.id)} size="icon" variant="ghost">
                  <RotateCcw className="size-4" />
                </Button>
              )}
              {article.status === 'active' && onArchive && (
                <Button aria-label="Archive" onClick={() => onArchive(article.id)} size="icon" variant="ghost">
                  <Archive className="size-4" />
                </Button>
              )}
              {/* 阅读器动作下拉菜单 */}
              <ArticleActionsMenu
                article={article}
                onDelete={onDelete}
                onOpenFavoriteDialog={openFavoriteDialog}
                onOpenTagDialog={openTagDialog}
                onOpenUrl={onOpenUrl}
                onSetFavorite={onSetFavorite}
                onToggleStar={onToggleStar}
              />
            </ButtonGroup>
          </Activity>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" ref={webviewContainerRef}>
        {/* Content */}
        {viewMode === 'webview' ? (
          <div className="relative h-full w-full">
            {/* 原生 webview 窗口状态显示 */}
            {webviewLoading && !webviewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-sm">正在打开网页窗口...</p>
              </div>
            )}
            {/* 错误状态覆盖层 */}
            {webviewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-lg">无法打开网页窗口</h3>
                  <p className="mb-4 max-w-md text-muted-foreground text-sm">
                    无法创建网页窗口。您可以在外部浏览器中打开此网页。
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={() => onOpenUrl(article.url)} size="sm" variant="default">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      在浏览器中打开
                    </Button>
                    <Button onClick={() => setViewMode('markdown')} size="sm" variant="outline">
                      返回原文视图
                    </Button>
                  </div>
                </div>
              </div>
            )}
            {/* webview 窗口已打开，显示提示信息（短暂显示后隐藏） */}
            {!webviewLoading && !webviewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-8 text-center backdrop-blur-sm">
                <div className="rounded-full bg-muted p-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-lg">网页正在加载中...</h3>
                  <p className="mb-4 max-w-md text-muted-foreground text-sm">
                    网页内容将在上方显示，可以完全绕过跨域限制。
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className={cn('min-h-0 flex-1')} ref={scrollAreaRef}>
            <article
              className={cn(
                'mx-auto px-8 py-8',
                layout === 'narrow-left' && 'max-w-2xl',
                layout === 'narrow-center' && 'max-w-3xl',
                layout === 'wide' && 'max-w-5xl',
                layout === 'full-width' && 'max-w-full'
              )}
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily === 'System' ? 'system-ui, sans-serif' : fontFamily,
              }}
            >
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

                  {/* AI Summary Section */}
                  {article.summary && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">AI 摘要</span>
                      </div>
                      <p className="text-foreground text-sm leading-relaxed">{article.summary}</p>
                    </div>
                  )}

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
              <div className="max-w-none select-auto">
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
        )}
      </div>
    </div>
  )
}
