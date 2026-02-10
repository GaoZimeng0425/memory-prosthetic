/**
 * Article Associations Component
 *
 * Displays associations for the currently selected article in the article list
 * Shows association cards with type icon, title, and weight visualization
 *
 * @example
 * ```tsx
 * <ArticleAssociations
 *   articleId={selectedId}
 *   onSelect={(id) => onSelect(id)}
 *   maxDisplay={10}
 * />
 * ```
 */

import type { Association, AssociationType } from '@memory-prosthetic/shared'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { Clock, Folder, FolderOpen, Sparkles, Tag } from 'lucide-react'

import { useArticleAssociations } from '@/hooks/useArticleAssociations'

// 类型图标和颜色映射
const TYPE_CONFIG: Record<
  AssociationType,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  semantic: {
    icon: Sparkles,
    color: 'text-rose-500',
    label: '语义相似',
  },
  tag: {
    icon: Tag,
    color: 'text-emerald-500',
    label: '标签共享',
  },
  folder: {
    icon: Folder,
    color: 'text-purple-500',
    label: '收藏夹共享',
  },
  time: {
    icon: Clock,
    color: 'text-amber-500',
    label: '时间邻近',
  },
  domain: {
    icon: () => null, // 使用简单的圆点
    color: 'text-indigo-500',
    label: '同一网站',
  },
  keyword: {
    icon: Tag,
    color: 'text-cyan-500',
    label: '关键词重叠',
  },
  topic: {
    icon: FolderOpen,
    color: 'text-pink-500',
    label: '主题相关',
  },
  reference: {
    icon: () => null,
    color: 'text-gray-500',
    label: '引用关联',
  },
  author: {
    icon: () => null,
    color: 'text-gray-500',
    label: '作者关联',
  },
}

interface ArticleAssociationsProps {
  articleId: number | null
  onSelect: (articleId: number) => void
  maxDisplay?: number
  className?: string
}

interface AssociationCardProps {
  association: Association
  onClick: () => void
}

/**
 * Individual association card component
 */
function AssociationCard({ association, onClick }: AssociationCardProps) {
  const config = TYPE_CONFIG[association.type]
  const Icon = config.icon

  // 权重可视化圆点大小和透明度
  const dotSize = association.weight >= 0.7 ? 12 : association.weight >= 0.4 ? 8 : 6
  const dotOpacity = association.weight

  return (
    <button
      className="flex w-full items-center gap-3 rounded-md border border-transparent bg-background/50 p-2 text-left hover:bg-accent hover:text-accent-foreground"
      onClick={onClick}
      type="button"
    >
      {/* 左侧：类型图标 */}
      <div className="flex-shrink-0">
        {Icon ? (
          <Icon className={config.color + ' h-4 w-4'} />
        ) : (
          <div
            className={`h-2 w-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
            style={{ opacity: dotOpacity }}
          />
        )}
      </div>

      {/* 中间：标题 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate font-medium" title={String(association.id)}>
          {/* 关联的另一个节点标题 - 需要从后端返回 */}
          关联 #{association.sourceId === Number.parseInt(association.id, 10) ? association.targetId : association.sourceId}
        </p>
        <p className="text-muted-foreground text-xs" title={config.label}>
          {config.label}
        </p>
      </div>

      {/* 右侧：权重可视化 */}
      <div className="flex-shrink-0">
        <div
          className="rounded-full"
          style={{
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            backgroundColor: config.color.replace('text-', 'rgb(').replace(/(\d+)$/, '0.$1, 1)').replace('rgb(rose', 'rgb(244'),
            opacity: dotOpacity,
          }}
        />
      </div>
    </button>
  )
}

/**
 * Article associations component for displaying related articles
 */
export function ArticleAssociations({
  articleId,
  onSelect,
  maxDisplay = 10,
  className,
}: ArticleAssociationsProps) {
  const { associations, isLoading, error } = useArticleAssociations(articleId ?? null)

  // 不显示的情况
  if (!articleId) {
    return null
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className={className + ' border-t p-4'}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground text-sm">加载关联中...</span>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={className + ' border-t p-4'}>
        <p className="text-destructive text-sm">加载关联失败: {error}</p>
      </div>
    )
  }

  // 空状态
  if (associations.length === 0) {
    return (
      <div className={className + ' border-t p-4'}>
        <p className="text-muted-foreground text-sm">暂无相关文章</p>
      </div>
    )
  }

  // 显示关联列表
  const displayAssociations = associations.slice(0, maxDisplay)

  return (
    <div className={className + ' border-t'}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">相关文章</h3>
          <Badge className="text-xs" variant="secondary">
            {associations.length}
          </Badge>
        </div>
      </div>

      {/* 关联列表 */}
      <ScrollArea className="h-64">
        <div className="space-y-1 p-2">
          {displayAssociations.map((association) => {
            // 获取目标节点 ID（与当前文章不同的那一边）
            const targetId =
              association.sourceId === articleId ? association.targetId : association.sourceId

            return (
              <AssociationCard
                association={association}
                key={association.id}
                onClick={() => onSelect(targetId)}
              />
            )
          })}
        </div>
      </ScrollArea>

      {/* "查看全部"按钮 */}
      {associations.length > maxDisplay && (
        <div className="border-t p-2">
          <Button
            className="w-full"
            onClick={() => {
              /* TODO: 实现查看全部功能 */
            }}
            size="sm"
            variant="ghost"
          >
            查看全部 {associations.length} 篇 →
          </Button>
        </div>
      )}
    </div>
  )
}
