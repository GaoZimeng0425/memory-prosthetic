/**
 * Tags List Component
 *
 * Displays a list of tags with expand/collapse functionality.
 */

import { useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, Hash, Pencil, Plus, SortAsc, SortDesc, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { Tag } from '@memory-prosthetic/shared'
import type { TagSortOrder } from '@memory-prosthetic/shared/apis'
import { compareDates } from '@memory-prosthetic/shared/utils/date'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@memory-prosthetic/ui/components/ui/alert-dialog'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@memory-prosthetic/ui/components/ui/dropdown-menu'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { EditTagDialog } from '@/components/features/EditTagDialog'
import { useCollections } from '@/hooks/use-collections'
import { useTags } from '@/hooks/use-tags'

interface TagsListProps {
  isCollapsed: boolean
  onCreateClick: () => void
  onTagChange?: () => void
}

type SortDirection = 'asc' | 'desc'

export function TagsList({ isCollapsed, onCreateClick, onTagChange }: TagsListProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [sortOrder, setSortOrder] = useState<TagSortOrder>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { tags: rawTags, isLoading } = useTags(sortOrder)
  const params = useParams({ strict: false })
  const activeTagId = params.tagId ? Number(params.tagId) : null

  // 根据排序方向和排序字段对标签进行排序
  const tags = useMemo(() => {
    if (!rawTags.length) return rawTags

    // 对于使用频率排序，后端已经按降序返回，我们只需要根据方向决定是否反转
    if (sortOrder === 'usage') {
      return sortDirection === 'desc' ? rawTags : [...rawTags].reverse()
    }

    // 对于名称和创建时间，在前端排序
    const sorted = [...rawTags].sort((a, b) => {
      let comparison = 0

      switch (sortOrder) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN', { numeric: true })
          break
        case 'created': {
          comparison = compareDates(a.createdAt, b.createdAt)
          break
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [rawTags, sortOrder, sortDirection])

  // 处理排序字段点击：如果当前字段相同则切换方向，否则设置为该字段且方向为正序
  const handleSortFieldClick = (field: TagSortOrder) => {
    if (sortOrder === field) {
      // 相同字段，切换方向
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      // 不同字段，设置为该字段且方向为正序
      setSortOrder(field)
      setSortDirection('asc')
    }
  }

  if (isCollapsed) {
    return (
      <div className="p-2">
        <Button
          className="w-full justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
          size="icon"
          variant="ghost"
        >
          <Hash className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <Button
            className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium text-xs">标签</span>
          </Button>
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-6 w-6 p-0"
                size="icon"
                title={`排序: ${sortOrder === 'name' ? '名称' : sortOrder === 'usage' ? '使用频率' : '创建时间'} (${
                  sortDirection === 'asc' ? '正序' : '倒序'
                })`}
                variant="ghost"
              >
                {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortFieldClick('name')}>
                <span className="flex-1">按名称排序</span>
                {sortOrder === 'name' && (
                  <span className="mr-1 text-muted-foreground text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortFieldClick('usage')}>
                <span className="flex-1">按使用频率排序</span>
                {sortOrder === 'usage' && (
                  <span className="mr-1 text-muted-foreground text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortFieldClick('created')}>
                <span className="flex-1">按创建时间排序</span>
                {sortOrder === 'created' && (
                  <span className="mr-1 text-muted-foreground text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className="h-6 w-6 p-0" onClick={onCreateClick} size="icon" title="创建标签" variant="ghost">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tags List */}
      {isExpanded && (
        <div className="space-y-0.5 px-2">
          {isLoading ? (
            <div className="px-2 py-1 text-muted-foreground text-xs">加载中...</div>
          ) : tags.length === 0 ? (
            <div className="px-2 py-1 text-muted-foreground text-xs">暂无标签</div>
          ) : (
            tags.map((tag) => (
              <TagItemWithCount active={activeTagId === tag.id} key={tag.id} onTagChange={onTagChange} tag={tag} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TagItemWithCountProps {
  tag: Tag
  active: boolean
  onTagChange?: () => void
}

function TagItemWithCount({ tag, active, onTagChange }: TagItemWithCountProps) {
  const { collections } = useCollections({ tagIds: [tag.id], status: 'active' })
  const { deleteTag } = useTags()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const count = collections.length

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await deleteTag(tag.id)
      setIsDeleteDialogOpen(false)
      toast.success('标签已删除')
      onTagChange?.()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsDeleting(false)
    }
  }

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
            to={active ? '/' : `/tag/${tag.id}`}
          >
            <Hash className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate text-left">{tag.name}</span>
            {count > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
                {count}
              </span>
            )}
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            重命名
          </ContextMenuItem>
          <ContextMenuItem className="text-destructive" disabled={isDeleting} onClick={handleDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <EditTagDialog
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            onTagChange?.()
          }
        }}
        open={isEditDialogOpen}
        tag={tag}
      />

      <AlertDialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              {count > 0
                ? `标签"${tag.name}"被 ${count} 条内容使用。删除后，这些内容的标签关联将被移除。确定要删除吗？`
                : `确定要删除标签"${tag.name}"吗？`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
