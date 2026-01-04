/**
 * Note Editor View Component
 *
 * Displays and allows editing of note content using Plate.js editor.
 * Used in ArticleReader when displaying notes (type='笔记').
 */

import { lazy, Suspense, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import type { Collection, CollectionType } from '@memory-prosthetic/shared/types/collection'
import { MarkdownUI } from '@memory-prosthetic/ui/components/markdown-ui'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { FieldError } from '@memory-prosthetic/ui/components/ui/field'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import { collections } from '@/apis'
import { TypeSelector } from '@/components/features/TypeSelector'

// Lazy load the editor to avoid blocking main interface
const NoteEditor = lazy(() =>
  import('@memory-prosthetic/editor/components/note-editor').then((module) => ({ default: module.NoteEditor }))
)

type NoteEditorViewProps = {
  collection: Collection
  isEditing: boolean
  onUpdate?: () => void
  onCancel?: () => void
}

export function NoteEditorView({ collection, isEditing: isEditingProp, onUpdate, onCancel }: NoteEditorViewProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(collection.title)
  const [markdownContent, setMarkdownContent] = useState<string>(collection.content)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<CollectionType>(() => {
    return (collection.type as CollectionType) || '笔记'
  })

  // Sync local state with prop changes when entering edit mode
  useEffect(() => {
    if (isEditingProp) {
      setTitle(collection.title)
      setSelectedType((collection.type as CollectionType) || '笔记')
      setTitleError(null)
    }
  }, [isEditingProp, collection.title, collection.type])
  useEffect(() => {
    setMarkdownContent(collection.content)
  }, [collection.content])

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type?: string }) => {
      return collections.api.update(collection.id, data)
    },
    onSuccess: async () => {
      // Invalidate collections queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: collections.keys.all })

      toast.success('保存成功', {
        description: '笔记已成功更新',
      })

      onUpdate?.()
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '更新笔记时发生错误',
      })
    },
  })

  const handleSave = () => {
    // Validate title
    if (!title.trim()) {
      setTitleError('标题为必填项')
      return
    }

    // Clear error if title is valid
    setTitleError(null)

    // Use Markdown content (preferred) or empty string
    const contentString = markdownContent || ''

    // Update note
    updateMutation.mutate({
      title: title.trim(),
      content: contentString,
      type: selectedType,
    })
  }

  const handleCancel = () => {
    // Reset to original values
    setTitle(collection.title)
    // Reset to original Markdown content
    setMarkdownContent(collection.content)
    setSelectedType((collection.type as CollectionType) || '笔记')
    setTitleError(null)
    onCancel?.()
  }

  // Use Markdown content directly for display (no conversion needed)
  const displayMarkdown = markdownContent || collection.content || ''

  if (isEditingProp) {
    return (
      <div className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="note-title-edit">
            标题
            <span className="ml-1 text-destructive">*</span>
          </Label>
          <Input
            aria-invalid={!!titleError}
            autoFocus
            className={titleError ? 'border-destructive text-lg' : 'text-lg'}
            id="note-title-edit"
            onChange={(e) => {
              setTitle(e.target.value)
              if (titleError) {
                setTitleError(null)
              }
            }}
            placeholder="输入笔记标题..."
            value={title}
          />
          {titleError && <FieldError>{titleError}</FieldError>}
        </div>

        {/* Type Selector */}
        <div className="space-y-2">
          <Label>分类</Label>
          <TypeSelector onSelect={setSelectedType} selectedType={selectedType} />
        </div>

        {/* Content Editor */}
        <div className="space-y-2">
          <Label htmlFor="note-content-edit">内容</Label>
          <div className="min-h-[400px] rounded-md border border-input">
            <Suspense
              fallback={
                <div className="flex h-[400px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground text-sm">加载编辑器中...</span>
                </div>
              }
            >
              <NoteEditor
                markdown={markdownContent}
                onMarkdownChange={setMarkdownContent}
                placeholder="输入笔记内容..."
              />
            </Suspense>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button disabled={updateMutation.isPending} onClick={handleCancel} variant="outline">
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button disabled={!title.trim() || updateMutation.isPending} onClick={handleSave}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Content Display */}
      <div className="max-w-none select-auto">
        {displayMarkdown ? (
          <MarkdownUI markdown={displayMarkdown} />
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-muted-foreground">没有可显示的内容</p>
          </div>
        )}
      </div>
    </div>
  )
}
