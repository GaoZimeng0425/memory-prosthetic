import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  Calendar,
  ExternalLink,
  Globe,
  Hash,
  Link2,
  Maximize2,
  Minimize2,
  MoreVertical,
  Move,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { formatDateTime, getDomain } from '@memory-prosthetic/shared/utils/date'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ButtonGroup } from '@memory-prosthetic/ui/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { AiButton } from '@/components/features/AiButton'
import { TagBadge } from '@/components/features/TagBadge'
import { Link } from '@/components/Link'
import { useDialog } from '@/contexts/DialogContext'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useIframeCspDetection } from '@/hooks/use-iframe-csp-detection'
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
  const { tags: collectionTags, removeTag } = useCollectionTags(article?.id ?? null)
  const { openTagDialog, openFavoriteDialog } = useDialog()
  const [viewMode, setViewMode] = useState<ViewMode>('markdown')

  // 当文章切换时，重置为原文视图
  // biome-ignore lint/correctness/useExhaustiveDependencies: 当文章切换时，重置为原文视图
  useEffect(() => {
    setViewMode('markdown')
  }, [article?.id])

  // 使用 hook 检测 iframe CSP 错误
  const {
    error: iframeError,
    isLoading: iframeLoading,
    iframeRef,
  } = useIframeCspDetection(article?.url ?? null, viewMode === 'webview')
  console.log('🚀 : ArticleReader : iframeError:', iframeError)

  const handleCopyUrl = async () => {
    if (!article) return
    try {
      await navigator.clipboard.writeText(article.url)
      toast.success('链接已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

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
  console.log(iframeError, '<<<')

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
              className={cn(viewMode === 'webview' && 'bg-primary/10 text-primary-foreground')}
              onClick={() => setViewMode('webview')}
              size="sm"
              variant="ghost"
            >
              网页
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex items-center gap-2">
          <ButtonGroup className="divide-x divide-muted-foreground/5 overflow-hidden rounded-full bg-secondary shadow-lg">
            {/* AI 分析按钮 */}
            <AiButton article={article} />
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="text-muted-foreground hover:text-foreground" size="icon" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">更多操作</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover">
                <div className="border-border border-b px-3 py-2">
                  <DropdownMenuLabel className="px-0 font-semibold">阅读器动作</DropdownMenuLabel>
                </div>
                <div className="grid grid-cols-4 gap-0 p-2">
                  {/* 第一行 */}
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
                    onClick={() => article && onOpenUrl(article.url)}
                  >
                    <Globe className="size-5 text-foreground" />
                    <span className="text-foreground text-xs">使用浏览器访问</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
                    onClick={handleCopyUrl}
                  >
                    <Link2 className="size-5 text-foreground" />
                    <span className="text-foreground text-xs">复制网页链接</span>
                  </DropdownMenuItem>

                  {/* 第二行 */}
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
                    onClick={() => article && openTagDialog(article.id)}
                  >
                    <Hash className="size-5 text-foreground" />
                    <span className="text-foreground text-xs">标签</span>
                  </DropdownMenuItem>

                  {/* 第三行 */}
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
                    onClick={() => article && onSetFavorite && openFavoriteDialog(article.id)}
                  >
                    <Move className="size-5 text-foreground" />
                    <span className="text-foreground text-xs">移动</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-accent"
                    onClick={() => article && onToggleStar && onToggleStar(article.id)}
                  >
                    <Star className={cn('size-5', article?.starred && 'fill-current text-yellow-500')} />
                    <span className="text-foreground text-xs">星标</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex flex-col items-center justify-center gap-1.5 rounded-md p-3 hover:bg-destructive/10 focus:text-destructive"
                    onClick={() => article && onDelete(article.id)}
                  >
                    <Trash2 className="size-5 text-destructive" />
                    <span className="text-destructive text-xs">删除</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Content */}
        {viewMode === 'webview' ? (
          <div className="relative h-full w-full">
            {/* iframe 始终渲染，确保 ref 可以正常赋值 */}
            <iframe
              allow="clipboard-read; clipboard-write"
              className={cn(
                'h-full w-full border-0',
                (iframeLoading || iframeError) && 'pointer-events-none opacity-0'
              )}
              ref={iframeRef}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
              src={article.url}
              title={article.title}
            />
            {/* 加载状态覆盖层 */}
            {iframeLoading && !iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-sm">正在加载网页...</p>
              </div>
            )}
            {/* 错误状态覆盖层 */}
            {iframeError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-lg">无法在应用内显示此网页</h3>
                  <p className="mb-4 max-w-md text-muted-foreground text-sm">
                    该网站设置了安全策略，不允许在应用内嵌入显示。您可以在外部浏览器中打开此网页。
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
          </div>
        ) : (
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
