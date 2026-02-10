/**
 * Tag Selector Component
 *
 * Allows selecting multiple tags with autocomplete and create new tag option.
 */

import { useState } from 'react'
import { Hash, Plus } from 'lucide-react'

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
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import { useTags } from '@/hooks/use-tags'

interface TagSelectorProps {
  selectedTagIds: number[]
  onSelectionChange: (tagIds: number[]) => void
  onCreateTag?: (name: string) => Promise<number>
  trigger?: React.ReactNode
}

export function TagSelector({ selectedTagIds, onSelectionChange, onCreateTag, trigger }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
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
    }
  }

  const defaultTrigger = (
    <Button size="sm" variant="outline">
      <Hash className="mr-2 h-4 w-4" />
      添加标签
    </Button>
  )

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0">
        <Command>
          <CommandInput onValueChange={setSearchQuery} placeholder="搜索标签或创建新标签..." value={searchQuery} />
          <CommandList>
            <CommandEmpty>
              {searchQuery.trim() && !filteredTags.length ? (
                <div className="py-2">
                  <Button className="w-full justify-start" onClick={handleCreateNewTag} size="sm" variant="ghost">
                    <Plus className="mr-2 h-4 w-4" />
                    创建标签: "{searchQuery}"
                  </Button>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground text-sm">未找到标签</div>
              )}
            </CommandEmpty>

            {selectedTags.length > 0 && (
              <CommandGroup heading="已选择">
                {selectedTags.map((tag) => (
                  <CommandItem key={tag.id} onSelect={() => handleToggleTag(tag.id)} value={tag.name}>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        <span>{tag.name}</span>
                      </div>
                      <Badge className="text-xs" variant="secondary">
                        已选
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredTags.length > 0 && (
              <CommandGroup heading="可用标签">
                {filteredTags.map((tag) => (
                  <CommandItem key={tag.id} onSelect={() => handleToggleTag(tag.id)} value={tag.name}>
                    <Hash className="mr-2 h-4 w-4" />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
