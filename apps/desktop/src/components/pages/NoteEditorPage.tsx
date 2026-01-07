import { Suspense, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Folder, Hash, HelpCircle, Loader2, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import { NoteEditor } from '@memory-prosthetic/editor/components/note-editor'
import type { CollectionType } from '@memory-prosthetic/shared/types/collection'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { FieldError } from '@memory-prosthetic/ui/components/ui/field'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { collections } from '@/apis'
import { EditorFirstTimeTip } from '@/components/features/EditorFirstTimeTip'
import { EditorShortcutsHelp } from '@/components/features/EditorShortcutsHelp'
import { NoteCreationTip } from '@/components/features/NoteCreationTip'
import { SelectFavoriteDialog } from '@/components/features/SelectFavoriteDialog'
import { TagSelector } from '@/components/features/TagSelector'
import { TypeSelector } from '@/components/features/TypeSelector'
import { useFavorites } from '@/hooks/use-favorites'
import { useHotkey } from '@/hooks/use-hotkey'
import { useTags } from '@/hooks/use-tags'

export function NoteEditorPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { favorites } = useFavorites()
  const { tags, createTag } = useTags('name')
  const [title, setTitle] = useState('')
  const [markdownContent, setMarkdownContent] = useState<string>('')
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<number | null>(null)
  const [showFavoriteDialog, setShowFavoriteDialog] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedType, setSelectedType] = useState<CollectionType>('笔记')

  // Wrap createTag to match TagSelector's expected signature
  const handleCreateTag = async (name: string) => {
    return createTag({ name })
  }

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; favoriteId?: number | null; type?: string }) => {
      return collections.api.createNote(data)
    },
    onSuccess: async (data) => {
      const noteId = data.id

      // Add tags if any were selected
      if (selectedTagIds.length > 0) {
        try {
          await collections.api.addCollectionTags(noteId, selectedTagIds)
        } catch (error) {
          console.error('Failed to add tags to note:', error)
          toast.error('笔记已保存，但添加标签失败', {
            description: error instanceof Error ? error.message : '未知错误',
          })
        }
      }

      // Invalidate collections queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: collections.keys.all })

      toast.success('保存成功', {
        description: '笔记已成功保存',
      })

      // Navigate to the note detail page or back to list
      void navigate({ to: '/all' })
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '保存笔记时发生错误',
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

    // Save note
    createNoteMutation.mutate({
      title: title.trim(),
      content: contentString,
      favoriteId: selectedFavoriteId,
      type: selectedType,
    })
  }

  const handleBack = () => {
    void navigate({ to: '/all' })
  }

  // Cmd+S to save
  useHotkey({
    key: 's',
    metaKey: true,
    onPress: () => {
      handleSave()
    },
  })

  // Cmd+? to show shortcuts help
  useHotkey({
    key: '?',
    metaKey: true,
    onPress: () => {
      setShowShortcutsHelp(true)
    },
  })

  return (
    <>
      <NoteCreationTip />
      <EditorFirstTimeTip />
      <EditorShortcutsHelp onOpenChange={setShowShortcutsHelp} open={showShortcutsHelp} />
      <SelectFavoriteDialog
        currentFavoriteId={selectedFavoriteId}
        onOpenChange={setShowFavoriteDialog}
        onSelect={setSelectedFavoriteId}
        open={showFavoriteDialog}
      />
      <div className="m-2 flex grow flex-col rounded-md border border-border bg-background shadow">
        {/* Header */}
        <div className="flex items-center gap-4 border-border border-b px-6 py-4">
          <Button onClick={handleBack} size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">新建笔记</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowShortcutsHelp(true)} size="icon" variant="ghost">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button disabled={!title.trim() || createNoteMutation.isPending} onClick={handleSave} size="sm">
              {createNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                  <kbd className="ml-2 rounded bg-background/50 px-1.5 py-0.5 font-mono text-xs">⌘S</kbd>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto flex w-full max-w-4xl flex-1 grow flex-col gap-6 overflow-y-auto p-6">
          {/* Title Input */}
          <div>
            <Input
              aria-invalid={!!titleError}
              autoFocus
              className={titleError ? 'border-destructive text-sm' : 'text-sm'}
              id="note-title"
              onChange={(e) => {
                setTitle(e.target.value)
                // Clear error when user starts typing
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
          <div className="flex items-center gap-2">
            <div className="space-y-2">
              <TypeSelector onSelect={setSelectedType} selectedType={selectedType} />
            </div>

            {/* Favorite Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowFavoriteDialog(true)} variant="outline">
                  <Folder className="size-4" />
                  {selectedFavoriteId
                    ? (favorites.find((f) => f.id === selectedFavoriteId)?.name ?? '选择收藏夹')
                    : '选择收藏夹'}
                </Button>
                {selectedFavoriteId && (
                  <Button onClick={() => setSelectedFavoriteId(null)} size="icon" variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {/* Tag Selector */}
            <div className="space-y-2">
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTagIds.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId)
                    if (!tag) return null
                    return (
                      <Badge className="flex items-center gap-1" key={tagId} variant="secondary">
                        <Hash className="h-3 w-3" />
                        <span>{tag.name}</span>
                        <Button
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId))}
                          size="icon"
                          variant="ghost"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              )}
              <TagSelector
                onCreateTag={handleCreateTag}
                onSelectionChange={setSelectedTagIds}
                selectedTagIds={selectedTagIds}
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="grow rounded-md border border-input">
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
      </div>
    </>
  )
}
