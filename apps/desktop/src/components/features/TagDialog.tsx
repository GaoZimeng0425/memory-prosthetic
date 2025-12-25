/**
 * Tag Dialog Component
 *
 * Dialog for selecting and managing tags for a collection.
 */

import { useState } from 'react'
import { Hash, Plus, X } from 'lucide-react'

import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@memory-prosthetic/ui/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { ScrollArea } from '@memory-prosthetic/ui/components/ui/scroll-area'
import { useTags } from '@/hooks/use-tags'

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTagIds: number[]
  onSelectionChange: (tagIds: number[]) => void
  onCreateTag?: (name: string) => Promise<number>
}

export function TagDialog({ open, onOpenChange, selectedTagIds, onSelectionChange, onCreateTag }: TagDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { tags } = useTags('name')

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id))
  const filteredTags = availableTags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleToggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onSelectionChange([...selectedTagIds, tagId])
    }
  }

  const handleRemoveTag = (tagId: number) => {
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
  }

  const handleCreateNewTag = async () => {
    if (!searchQuery.trim() || !onCreateTag) return

    const existingTag = tags.find((t) => t.name.toLowerCase() === searchQuery.toLowerCase())
    if (existingTag) {
      handleToggleTag(existingTag.id)
      setSearchQuery('')
      return
    }

    try {
      const newTagId = await onCreateTag(searchQuery.trim())
      onSelectionChange([...selectedTagIds, newTagId])
      setSearchQuery('')
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert(`创建标签失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    onOpenChange(false)
  }

  return (
    <Dialog onOpenChange={handleClose} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理标签</DialogTitle>
          <DialogDescription>为内容添加或移除标签</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div>
              <div className="mb-2 font-medium text-sm">已选择的标签</div>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge className="flex items-center gap-1" key={tag.id} variant="secondary">
                    <Hash className="h-3 w-3" />
                    <span>{tag.name}</span>
                    <Button
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveTag(tag.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tag Search and Selection */}
          <div>
            <div className="mb-2 font-medium text-sm">搜索标签</div>
            <Command shouldFilter={false}>
              <CommandInput onValueChange={setSearchQuery} placeholder="搜索标签或创建新标签..." value={searchQuery} />
              <ScrollArea className="h-[200px]">
                <CommandList>
                  <CommandEmpty>
                    {searchQuery.trim() && !filteredTags.length ? (
                      <div className="py-4 text-center">
                        <Button
                          className="w-full justify-start"
                          onClick={handleCreateNewTag}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          创建标签: "{searchQuery}"
                        </Button>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-muted-foreground text-sm">未找到标签</div>
                    )}
                  </CommandEmpty>

                  {filteredTags.length > 0 && (
                    <CommandGroup heading="可用标签">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleTag(tag.id)
                          }}
                          onSelect={() => {
                            handleToggleTag(tag.id)
                          }}
                          value={tag.name}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4" />
                              <span>{tag.name}</span>
                            </div>
                            {selectedTagIds.includes(tag.id) && (
                              <Badge className="text-xs" variant="secondary">
                                已选
                              </Badge>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </ScrollArea>
            </Command>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} variant="outline">
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
