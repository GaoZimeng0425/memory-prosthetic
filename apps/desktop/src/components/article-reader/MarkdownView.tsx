import { Calendar, ExternalLink, Globe, Sparkles } from 'lucide-react'

import type { Tag } from '@memory-prosthetic/shared'
import { formatDateTime, getDomain } from '@memory-prosthetic/shared/utils/date'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { TagBadge } from '@/components/features/TagBadge'
import { Link } from '@/components/Link'
import type { Collection } from '@/types/api'

type MarkdownViewProps = {
  article: Collection
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
  layout: 'narrow-left' | 'narrow-center' | 'wide' | 'full-width'
  fontSize: number
  fontFamily: string
  collectionTags: Tag[]
  onRemoveTag: (tagId: number) => void
  onOpenUrl: (url: string) => void
}

export const MarkdownView = ({
  article,
  scrollAreaRef,
  layout,
  fontSize,
  fontFamily,
  collectionTags,
  onRemoveTag,
  onOpenUrl,
}: MarkdownViewProps) => {
  return (
    <ScrollArea className={cn('h-full min-h-0 max-w-full flex-1')} ref={scrollAreaRef}>
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
              {/* Show type for all collections */}
              {article.type && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{article.type}</span>
                </div>
              )}
              {/* Only show URL/domain for non-note collections */}
              {article.type !== '笔记' && article.url && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  <Link className="hover:text-foreground" href={article.url}>
                    {getDomain(article.url)}
                  </Link>
                </div>
              )}
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
                    <TagBadge key={tag.id} onRemove={() => onRemoveTag(tag.id)} tag={tag} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <Separator className="mb-8" />

        {/* Body */}
        <div className="max-w-none select-auto">
          {/* Check if this is a note (type='笔记' or url is empty) */}
          {article.content ? (
            <MarkdownUI markdown={article.content} scrollAreaRef={scrollAreaRef} />
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
              <p className="text-muted-foreground">没有可显示的内容</p>
              {article.url && (
                <Button
                  className="mt-4"
                  onClick={() => {
                    const url = article.url
                    if (url) {
                      onOpenUrl(url)
                    }
                  }}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  在浏览器中查看
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-border border-t pt-6">
          <p className="text-muted-foreground text-xs">
            {article.type === '笔记' ? '创建于' : '收集于'} {formatDateTime(article.createdAt)}
          </p>
          {article.type !== '笔记' && article.url && (
            <p className="mt-1 truncate text-muted-foreground text-xs">
              <Link className="hover:text-foreground" href={article.url}>
                {article.url}
              </Link>
            </p>
          )}
        </div>
      </article>
    </ScrollArea>
  )
}
