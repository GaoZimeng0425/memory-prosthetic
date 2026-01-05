/**
 * Note Editor View Component
 *
 * Displays and allows editing of note content using Plate.js editor.
 * Used in ArticleReader when displaying notes (type='笔记').
 */

import { lazy, Suspense, useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useDebounce } from 'react-use'
import { toast } from 'sonner'

import type { Collection, CollectionType } from '@memory-prosthetic/shared/types/collection'
import { FieldError } from '@memory-prosthetic/ui/components/ui/field'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { collections } from '@/apis'
import { TypeSelector } from '@/components/features/TypeSelector'

// Lazy load the editor to avoid blocking main interface
const NoteEditor = lazy(() =>
  import('@memory-prosthetic/editor/components/note-editor').then((module) => ({ default: module.NoteEditor }))
)

type NoteEditorViewProps = {
  collection: Collection
  isEditing: boolean
}

export function NoteEditorView({ collection, isEditing }: NoteEditorViewProps) {
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
    1000,
    [title, markdownContent, selectedType]
  )

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
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '更新笔记时发生错误',
      })
    },
  })

  return (
    <div className="man-w-full overflow-hidden">
      <TypeSelector onSelect={setSelectedType} selectedType={selectedType} />
      <div className="mt-4">
        <Input
          aria-invalid={!!titleError}
          autoFocus
          className={cn('border-0', titleError ? 'border-destructive text-lg' : 'text-lg')}
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

      <div className="min-h-[400px] rounded-md">
        <Suspense
          fallback={
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground text-sm">加载编辑器中...</span>
            </div>
          }
        >
          <NoteEditor markdown={markdownContent} onMarkdownChange={setMarkdownContent} placeholder="输入笔记内容..." />
        </Suspense>
      </div>
    </div>
  )
}
