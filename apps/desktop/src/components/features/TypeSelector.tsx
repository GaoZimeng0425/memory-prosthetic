/**
 * Type Selector Component
 *
 * Allows selecting a collection type (网页, 代码, 音频, 视频, 笔记, 文件).
 */

import { type ComponentProps, useState } from 'react'
import { FileCode, FileText, FileVideo, Globe, Music, StickyNote } from 'lucide-react'

import type { CollectionType } from '@memory-prosthetic/shared/types/collection'
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
import { cn } from '@memory-prosthetic/ui/utils/tw'

const COLLECTION_TYPES: { value: CollectionType; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { value: '网页', label: '网页', icon: Globe },
    { value: '代码', label: '代码', icon: FileCode },
    { value: '音频', label: '音频', icon: Music },
    { value: '视频', label: '视频', icon: FileVideo },
    { value: '笔记', label: '笔记', icon: StickyNote },
    { value: '文件', label: '文件', icon: FileText },
  ]

type TypeSelectorProps = {
  selectedType: CollectionType
  onSelect: (type: CollectionType) => void
  disabled?: boolean
} & Omit<ComponentProps<typeof Button>, 'onSelect'>

export function TypeSelector({ selectedType, onSelect, disabled, ...props }: TypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const selectedTypeInfo = COLLECTION_TYPES.find((t) => t.value === selectedType)
  const Icon = selectedTypeInfo?.icon ?? Globe

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} size="sm" variant="outline" {...props}>
          <Icon className="mr-2 h-4 w-4" />
          {selectedTypeInfo?.label ?? selectedType}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="搜索分类..." />
          <CommandList>
            <CommandEmpty>未找到分类</CommandEmpty>
            <CommandGroup>
              {COLLECTION_TYPES.map((type) => {
                const TypeIcon = type.icon
                return (
                  <CommandItem
                    key={type.value}
                    onSelect={() => {
                      onSelect(type.value)
                      setOpen(false)
                    }}
                    value={type.value}
                  >
                    <TypeIcon className={cn('mr-2 h-4 w-4', selectedType === type.value && 'text-primary')} />
                    <span>{type.label}</span>
                    {selectedType === type.value && <span className="ml-auto text-primary text-xs">✓</span>}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
