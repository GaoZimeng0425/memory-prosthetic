/**
 * Note Editor View Component
 *
 * Displays and allows editing of note content using Plate.js editor.
 * Used in ArticleReader when displaying notes (type='笔记').
 */

import { Suspense, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useDebounce } from 'react-use'
import { toast } from 'sonner'

import { NoteEditor } from '@memory-prosthetic/editor/components/note-editor'
import type { Collection, CollectionType } from '@memory-prosthetic/shared/types/collection'
import { FieldError } from '@memory-prosthetic/ui/components/ui/field'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { collections } from '@/apis'
import { TypeSelector } from '@/components/features/TypeSelector'

type NoteEditorViewProps = {
  collection: Collection
  disabled?: boolean
  isEditing: boolean
}

export function NoteEditorView({ collection, isEditing, disabled = false }: NoteEditorViewProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(collection.title)
  const [markdownContent, setMarkdownContent] = useState<string>(collection.content)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<CollectionType>(() => {
    return (collection.type as CollectionType) || '笔记'
  })
  useDebounce(
    () => {
      updateMutation.mutate({ title: title.trim(), content: markdownContent, type: selectedType })
    },
    500,
    [title, markdownContent, selectedType]
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when isEditing changes
  useEffect(() => {
    if (isEditing) return
    updateMutation.mutateAsync({ title: title.trim(), content: markdownContent, type: selectedType })
  }, [isEditing])

  // Sync local state with prop changes when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setTitle(collection.title)
      setSelectedType((collection.type as CollectionType) || '笔记')
      setTitleError(null)
    }
  }, [isEditing, collection.title, collection.type])
  useEffect(() => {
    setMarkdownContent(collection.content)
  }, [collection.content])

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; type?: string }) => {
      return collections.api.update(collection.id, data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: collections.keys.all })
      await queryClient.invalidateQueries({ queryKey: collections.keys.detail(collection.id) })
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '更新笔记时发生错误',
      })
    },
  })

  return (
    <div className="man-w-full overflow-hidden">
      <div className="flex w-full items-center justify-between gap-2 px-16 pt-4 text-base sm:px-[max(64px,calc(50%-350px))]">
        <div className="flex-1">
          <Input
            aria-invalid={!!titleError}
            autoFocus
            className={cn('h-auto border-0 text-2xl md:text-2xl', titleError && 'border-destructive')}
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
        <TypeSelector onSelect={setSelectedType} selectedType={selectedType} />
      </div>

      <div className="min-h-full rounded-md">
        <Suspense
          fallback={
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground text-sm">加载编辑器中...</span>
            </div>
          }
        >
          <NoteEditor
            disabled={disabled}
            markdown={markdownContent}
            onMarkdownChange={setMarkdownContent}
            placeholder="输入笔记内容..."
          />
        </Suspense>
      </div>
    </div>
  )
}
