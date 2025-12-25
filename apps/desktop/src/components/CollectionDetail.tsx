import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Calendar, ExternalLink, Trash2 } from 'lucide-react'

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
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { TagBadge } from '@/components/features/TagBadge'
import { TagSelector } from '@/components/features/TagSelector'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useTags } from '@/hooks/use-tags'
import type { Collection, CommandResult } from '@/types/api'

interface CollectionDetailProps {
  collection: Collection | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function CollectionDetail({ collection, open, onOpenChange, onDeleted }: CollectionDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { tags: collectionTags, addTags, removeTag } = useCollectionTags(collection?.id ?? null)
  const { createTag } = useTags()

  if (!collection) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleOpenUrl = async () => {
    try {
      await openUrl(collection.url)
    } catch (err) {
      console.error('Failed to open URL:', err)
      // Fallback to window.open
      window.open(collection.url, '_blank')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await invoke<CommandResult<boolean>>('delete_collection', { id: collection.id })
      onOpenChange(false)
      onDeleted()
    } catch (err) {
      console.error('Failed to delete collection:', err)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const statusLabel: Record<string, string> = {
    pending: '等待处理',
    processing: '处理中',
    completed: '已完成',
    done: '已完成',
    failed: '失败',
  }

  const statusVariant: Record<string, 'secondary' | 'default' | 'destructive'> = {
    pending: 'secondary',
    processing: 'default',
    completed: 'default',
    done: 'default',
    failed: 'destructive',
  }

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="line-clamp-2 pr-8 text-xl">{collection.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{new URL(collection.url).hostname}</Badge>
                  {collection.embeddingStatus && (
                    <Badge variant={statusVariant[collection.embeddingStatus]}>
                      {statusLabel[collection.embeddingStatus]}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Calendar className="h-3 w-3" />
                    {formatDate(collection.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">标签：</span>
                  {collectionTags.map((tag) => (
                    <TagBadge key={tag.id} onRemove={() => removeTag(tag.id)} tag={tag} />
                  ))}
                  <TagSelector
                    onCreateTag={async (name) => {
                      const newTagId = await createTag({ name })
                      await addTags([newTagId])
                      return newTagId
                    }}
                    onSelectionChange={async (tagIds) => {
                      const currentTagIds = collectionTags.map((t) => t.id)
                      const toAdd = tagIds.filter((id) => !currentTagIds.includes(id))
                      const toRemove = currentTagIds.filter((id) => !tagIds.includes(id))

                      if (toAdd.length > 0) {
                        await addTags(toAdd)
                      }
                      for (const tagId of toRemove) {
                        await removeTag(tagId)
                      }
                    }}
                    selectedTagIds={collectionTags.map((t) => t.id)}
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4 pr-4">
              {collection.summary && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium text-sm">摘要</h4>
                  <p className="text-muted-foreground text-sm">{collection.summary}</p>
                </div>
              )}

              <div>
                <h4 className="mb-2 font-medium text-sm">正文内容</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                  {collection.content.slice(0, 3000)}
                  {collection.content.length > 3000 && (
                    <span className="text-muted-foreground">... (内容过长，已截断)</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-sm">原文链接</h4>
                <a
                  className="break-all text-primary text-sm underline-offset-4 hover:underline"
                  href={collection.url}
                  onClick={(e) => {
                    e.preventDefault()
                    void handleOpenUrl()
                  }}
                >
                  {collection.url}
                </a>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={handleOpenUrl} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              打开原文
            </Button>
            <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setShowDeleteConfirm} open={showDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除这篇内容？</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。内容及其向量数据将被永久删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
