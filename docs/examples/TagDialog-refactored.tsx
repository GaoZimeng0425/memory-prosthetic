/**
 * TagDialog - 组合式对话框组件
 *
 * 不再依赖全局 DialogContext，直接在使用处渲染
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@memory-prosthetic/ui/components/ui/dialog'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useTags } from '@/hooks/use-tags'

interface TagDialogProps {
  /** 要编辑标签的收藏 ID */
  collectionId: number | null
  /** 对话框是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
}

/**
 * TagDialog 组件
 *
 * @example
 * ```tsx
 * function ArticleListItem() {
 *   const [isOpen, setIsOpen] = useState(false)
 *   return (
 *     <>
 *       <Button onClick={() => setIsOpen(true)}>编辑标签</Button>
 *       <TagDialog
 *         collectionId={collection.id}
 *         open={isOpen}
 *         onClose={() => setIsOpen(false)}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export function TagDialog({ collectionId, open, onClose }: TagDialogProps) {
  // ✅ 只在 open 时才加载数据
  const {
    tags: collectionTags,
    addTags,
    removeTag,
    isLoading,
  } = useCollectionTags(
    collectionId ?? 0,
    { enabled: open && collectionId !== null } // 使用 TanStack Query 的 enabled 选项
  )
  const { createTag } = useTags()

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // 当 dialog 打开时，同步标签
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) {
    setWasOpen(true)
    setSelectedTagIds(collectionTags.map((t) => t.id))
  }
  if (!open && wasOpen) {
    setWasOpen(false)
  }

  const handleCreateTag = async (name: string) => {
    setIsCreating(true)
    try {
      const newTagId = await createTag({ name })
      await addTags([newTagId])
      setSelectedTagIds((prev) => [...prev, newTagId])
      return newTagId
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast.error(`创建标签失败: ${error instanceof Error ? error.message : '未知错误'}`)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectionChange = async (newTagIds: number[]) => {
    setSelectedTagIds(newTagIds)

    if (collectionId === null) return

    try {
      const currentTagIds = collectionTags.map((t) => t.id)
      const toAdd = newTagIds.filter((id) => !currentTagIds.includes(id))
      const toRemove = currentTagIds.filter((id) => !newTagIds.includes(id))

      // 并发执行
      const operations = []
      if (toAdd.length > 0) {
        operations.push(addTags(toAdd))
      }
      for (const tagId of toRemove) {
        operations.push(removeTag(tagId))
      }

      await Promise.all(operations)
    } catch (error) {
      console.error('Failed to update tags:', error)
      toast.error(`更新标签失败: ${error instanceof Error ? error.message : '未知错误'}`)
      // 回滚选择状态
      setSelectedTagIds(currentTagIds)
    }
  }

  // ✅ 不渲染任何内容，而不是渲染隐藏的 Dialog
  if (!open || collectionId === null) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑标签</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 这里可以复用现有的标签选择 UI */}
            <div className="py-4">
              {/* TODO: 复用现有标签选择组件 */}
              <p>选中了 {selectedTagIds.length} 个标签</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={onClose}>完成</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
