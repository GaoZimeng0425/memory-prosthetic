/**
 * AI Button Component
 *
 * Provides AI-powered features for articles:
 * - Generate summary
 * - Auto-generate tags
 * - Content classification
 * - Keyword extraction
 * - Topic identification
 */

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, Brain, FileText, Key, Lightbulb, Loader2, Settings, Sparkles } from 'lucide-react'

import type { AiMetadata, Collection } from '@memory-prosthetic/shared'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { collections } from '@/apis'
import { useDialog } from '@/contexts/DialogContext'
import { useAiConfig } from '@/hooks/use-ai-config'
import { useAiMetadata } from '@/hooks/use-ai-metadata'
import { useAiProcessing } from '@/hooks/use-ai-processing'
import { useCollectionTags } from '@/hooks/use-collection-tags'

type AiButtonProps = {
  article: Collection
}

// 难度标签颜色
const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800',
}

// 难度显示名称
const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
  expert: '专家',
}

// 内容类型显示名称
const contentTypeLabels: Record<string, string> = {
  article: '文章',
  tutorial: '教程',
  docs: '文档',
  news: '新闻',
  blog: '博客',
  paper: '论文',
}

// 领域显示名称
const domainLabels: Record<string, string> = {
  frontend: '前端',
  backend: '后端',
  fullstack: '全栈',
  mobile: '移动端',
  devops: 'DevOps',
  ai: 'AI/ML',
}

export const AiButton = ({ article }: AiButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<AiMetadata | null>(null)
  const { isConfigured, enabled } = useAiConfig()
  const { processCollection, isProcessing, error } = useAiProcessing()
  const { openSettingsDialog } = useDialog()
  const { tags: collectionTags } = useCollectionTags(article.id)
  const queryClient = useQueryClient()

  // 判断是否已分析过（通过 summary 判断）
  const isAnalyzed = !!article.summary

  // 使用 hook 获取 AI 元数据（仅在 popover 打开且已分析时加载）
  const { data: existingMetadata, isLoading: isLoadingMetadata } = useAiMetadata(article.id, {
    fallbackSummary: article.summary,
    enabled: isOpen && isAnalyzed,
  })

  // 当加载到已有数据时，更新 result
  useEffect(() => {
    if (existingMetadata && !isProcessing) {
      setResult(existingMetadata)
    }
  }, [existingMetadata, isProcessing])

  // 当 popover 关闭时，重置 result（以便下次打开时重新加载）
  useEffect(() => {
    if (!isOpen) {
      setResult(null)
    }
  }, [isOpen])

  const handleProcess = async () => {
    try {
      // 获取现有 tags 的名称
      const existingTagNames = collectionTags.map((t) => t.name)
      const aiResult = await processCollection(article, existingTagNames)
      setResult(aiResult)

      // 刷新 collection 数据和 AI 元数据
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: collections.keys.detail(article.id) }),
        queryClient.invalidateQueries({ queryKey: ['collectionTags', article.id] }),
        queryClient.invalidateQueries({ queryKey: ['aiMetadata', article.id] }),
      ])
    } catch (err) {
      console.error('AI processing failed:', err)
    }
  }

  const handleOpenSettings = () => {
    openSettingsDialog()
  }

  // 未配置 AI 时显示配置提示
  if (!isConfigured || !enabled) {
    return (
      <Button
        aria-label="Go Back"
        className="text-muted-foreground hover:text-foreground"
        onClick={handleOpenSettings}
        size="icon"
        title="配置 AI 功能"
        variant="outline"
      >
        <Sparkles className="mr-2 h-4 w-4 text-primary" />
        AI
        <Badge className="ml-1.5 px-1 py-0 text-[10px]" variant="secondary">
          未配置
        </Badge>
      </Button>
    )
  }

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label="AI Content Analysis"
          className={cn(isProcessing && 'text-primary')}
          size="icon"
          variant="ghost"
        >
          {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-primary" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        {/* Header */}
        <div className="flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">AI 内容分析</span>
          </div>
          <Button onClick={handleOpenSettings} size="icon" title="AI 设置" variant="ghost">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="h-96 p-3">
          <div className="space-y-4">
            {/* 处理按钮 */}
            {!result && !isProcessing && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs">使用 AI 自动分析文章内容，生成摘要、标签、分类等信息。</p>
              </div>
            )}
            {/* 处理中状态 */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="font-medium text-sm">正在分析文章...</p>
                <p className="mt-1 text-muted-foreground text-xs">AI 正在生成摘要、标签和分类</p>
              </div>
            )}

            {/* 加载已有数据状态 */}
            {isLoadingMetadata && !isProcessing && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="font-medium text-sm">加载分析数据...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && !isProcessing && !isLoadingMetadata && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="font-medium text-destructive text-sm">处理失败</p>
                <p className="mt-1 text-muted-foreground text-xs">{error}</p>
              </div>
            )}

            {/* 结果展示 */}
            {result && !isProcessing && !isLoadingMetadata && (
              <div className="space-y-4">
                {/* 摘要 */}
                {result.summary && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="font-medium text-xs">摘要</span>
                    </div>
                    <p className="rounded-md bg-muted/50 p-2 text-sm leading-relaxed">{result.summary}</p>
                  </div>
                )}

                {/* 分类信息 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="font-medium text-xs">分类</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.contentType && (
                      <Badge variant="outline">{contentTypeLabels[result.contentType] || result.contentType}</Badge>
                    )}
                    {result.domain && <Badge variant="outline">{domainLabels[result.domain] || result.domain}</Badge>}
                    {result.difficulty && (
                      <Badge className={cn('border-0', difficultyColors[result.difficulty])}>
                        {difficultyLabels[result.difficulty] || result.difficulty}
                      </Badge>
                    )}
                    {result.language && (
                      <Badge variant="secondary">
                        {result.language === 'zh' ? '中文' : result.language === 'en' ? '英文' : '中英混合'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 关键词 */}
                {result.keywords && result.keywords.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Key className="h-3.5 w-3.5" />
                      <span className="font-medium text-xs">关键词</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {result.keywords.map((kw) => (
                        <Badge className="text-xs" key={kw.id} variant="secondary">
                          {kw.keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 主题 */}
                {result.topics && result.topics.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span className="font-medium text-xs">主题</span>
                    </div>
                    <div className="space-y-1">
                      {result.topics.map((topic) => (
                        <div
                          className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1"
                          key={topic.id}
                        >
                          <span className="text-sm">{topic.topic}</span>
                          <span className="text-muted-foreground text-xs">{Math.round(topic.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 分析按钮 */}
        <Button className="w-full" disabled={isProcessing} onClick={handleProcess} size="sm" variant="outline">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          {isAnalyzed ? '重新分析' : '开始分析'}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
