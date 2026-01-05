/**
 * Type Filter Component
 *
 * Allows selecting multiple collection types for filtering.
 */

import { useState } from 'react'
import { FileCode, FileText, FileVideo, Globe, Music, StickyNote, X } from 'lucide-react'

import type { CollectionType } from '@memory-prosthetic/shared/types/collection'
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

const COLLECTION_TYPES: { value: CollectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { value: '网页', label: '网页', icon: Globe },
    { value: '代码', label: '代码', icon: FileCode },
    { value: '音频', label: '音频', icon: Music },
    { value: '视频', label: '视频', icon: FileVideo },
    { value: '笔记', label: '笔记', icon: StickyNote },
    { value: '文件', label: '文件', icon: FileText },
  ]

interface TypeFilterProps {
  selectedTypes: CollectionType[]
  onSelectionChange: (types: CollectionType[]) => void
}

export function TypeFilter({ selectedTypes, onSelectionChange }: TypeFilterProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const availableTypes = COLLECTION_TYPES.filter((t) => !selectedTypes.includes(t.value))
  const filteredTypes = availableTypes.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleToggleType = (type: CollectionType) => {
    if (selectedTypes.includes(type)) {
      onSelectionChange(selectedTypes.filter((t) => t !== type))
    } else {
      onSelectionChange([...selectedTypes, type])
    }
  }

  const handleRemoveType = (type: CollectionType) => {
    onSelectionChange(selectedTypes.filter((t) => t !== type))
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="flex-1" size="sm" variant="outline">
          <span className="text-xs">分类筛选</span>
          {selectedTypes.length > 0 && (
            <Badge className="ml-auto" variant="secondary">
              {selectedTypes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[250px] p-0">
        <Command>
          <CommandInput onValueChange={setSearchQuery} placeholder="搜索分类..." value={searchQuery} />
          <CommandList>
            <CommandEmpty>未找到分类</CommandEmpty>

            {selectedTypes.length > 0 && (
              <CommandGroup heading="已选择">
                {selectedTypes.map((type) => {
                  const typeInfo = COLLECTION_TYPES.find((t) => t.value === type)
                  const Icon = typeInfo?.icon ?? Globe
                  return (
                    <CommandItem key={type} onSelect={() => handleRemoveType(type)} value={type}>
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{typeInfo?.label ?? type}</span>
                        </div>
                        <Button
                          className="h-5 w-5 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveType(type)
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {filteredTypes.length > 0 && (
              <CommandGroup heading="可用分类">
                {filteredTypes.map((type) => {
                  const TypeIcon = type.icon
                  return (
                    <CommandItem key={type.value} onSelect={() => handleToggleType(type.value)} value={type.value}>
                      <TypeIcon className="mr-2 h-4 w-4" />
                      <span>{type.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
