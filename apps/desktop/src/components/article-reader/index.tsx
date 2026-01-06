import { Activity, useEffect, useRef, useState } from 'react'
import { Archive, Globe, Maximize2, Minimize2, PaintbrushIcon, PenIcon, RotateCcw, Save } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ButtonGroup } from '@memory-prosthetic/ui/components/ui/button-group'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { useTheme } from '@memory-prosthetic/ui/hooks/use-theme'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { MarkdownView } from '@/components/article-reader/MarkdownView'
import { ReaderSettings } from '@/components/article-reader/ReaderSettings'
import { WebviewView } from '@/components/article-reader/WebviewView'
import { AiButton } from '@/components/features/AiButton'
import { ArticleActionsMenu } from '@/components/features/ArticleActionsMenu'
import { useDialog } from '@/contexts/DialogContext'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useResizeObserver } from '@/hooks/use-resize-observer'
import { useWebviewWindow } from '@/hooks/use-webview-window'
import { useReaderStore } from '@/store/reader-store'
import type { Collection } from '@/types/api'
import { NoteEditorView } from '../features/NoteEditorView'

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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const webviewContainerRef = useRef<HTMLDivElement>(null)
  const { tags: collectionTags, removeTag } = useCollectionTags(article?.id ?? null)
  const { openTagDialog, openFavoriteDialog } = useDialog()
  const [viewMode, setViewMode] = useState<ViewMode>('markdown')
  const [isNoteEditing, setIsNoteEditing] = useState(false)
  const { fontSize, fontFamily, layout, getBackgroundColorClassName } = useReaderStore()
  const { resolvedTheme } = useTheme()

  // 当文章切换时，重置为原文视图和编辑模式
  // biome-ignore lint/correctness/useExhaustiveDependencies: 当文章切换时，重置为原文视图和编辑模式
  useEffect(() => {
    setViewMode('markdown')
    setIsNoteEditing(false)
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
  // Only for non-note collections (notes don't have URLs)
  const isNote = article?.type === '笔记' || !article?.url

  useEffect(() => {
    if (viewMode === 'webview' && article?.url && !isNote) {
      // 等待 DOM 更新后获取容器元素的位置
      const timer = setTimeout(() => {
        if (article.url) {
          void openWebview(article.url, article.title, webviewContainerRef.current)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
    void closeWebview()
  }, [viewMode, article?.url, article?.title, isNote, openWebview, closeWebview])

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
        'm-2 flex flex-1 flex-col overflow-hidden rounded-md bg-background shadow-lg',
        isMaximized && 'fixed inset-0 z-10',
        backgroundColorClassName,
        className
      )}
    >
      {/* Toolbar */}
      <div className="relative z-10 flex h-14 w-full shrink-0 items-center justify-between border-border border-b px-4">
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
        {/* Only show view mode toggle for non-note collections (notes don't have URLs) */}
        {article && article.type !== '笔记' && article.url && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <ButtonGroup className="divide-x divide-muted-foreground/5 overflow-hidden rounded-full bg-secondary shadow-lg">
              <Button
                aria-label="原文视图"
                className={cn(viewMode === 'markdown' && 'bg-primary text-primary-foreground')}
                onClick={() => setViewMode('markdown')}
                size="sm"
                variant="ghost"
              >
                原文
              </Button>
              <Button
                aria-label="网页视图"
                className={cn(viewMode === 'webview' && 'bg-primary text-primary-foreground')}
                onClick={() => setViewMode('webview')}
                size="sm"
                variant="ghost"
              >
                网页
              </Button>
            </ButtonGroup>
          </div>
        )}

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
              {/* Only show edit button for notes */}
              <Button
                aria-label={isNoteEditing ? '取消编辑' : '编辑笔记'}
                onMouseDown={() => setIsNoteEditing(!isNoteEditing)}
                size="icon"
                variant="ghost"
              >
                {isNoteEditing ? <Save className="size-4" /> : <PenIcon className="size-4" />}
              </Button>
            </ButtonGroup>
          </Activity>
        </div>
      </div>

      <div className="w-full flex-1 overflow-hidden" ref={webviewContainerRef}>
        <Activity mode={isNoteEditing ? 'visible' : 'hidden'}>
          <ScrollArea className="h-full min-h-0 max-w-full flex-1">
            <NoteEditorView collection={article} isEditing={isNoteEditing} />
          </ScrollArea>
        </Activity>
        {/* Content */}
        <Activity mode={!isNoteEditing && viewMode === 'webview' ? 'visible' : 'hidden'}>
          <WebviewView
            article={article}
            onOpenUrl={onOpenUrl}
            onSwitchToMarkdown={() => setViewMode('markdown')}
            webviewError={webviewError}
            webviewLoading={webviewLoading}
          />
        </Activity>
        <Activity mode={!isNoteEditing && viewMode === 'markdown' ? 'visible' : 'hidden'}>
          <MarkdownView
            article={article}
            collectionTags={collectionTags}
            fontFamily={fontFamily}
            fontSize={fontSize}
            layout={layout}
            onOpenUrl={onOpenUrl}
            onRemoveTag={removeTag}
            scrollAreaRef={scrollAreaRef}
          />
        </Activity>
      </div>
    </div>
  )
}
