/**
 * Tag Badge Component
 *
 * Displays a tag as a badge/chip.
 */

import { Hash, X } from 'lucide-react'

import type { Tag } from '@memory-prosthetic/shared'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'

interface TagBadgeProps {
  tag: Tag
  onClick?: () => void
  onRemove?: () => void
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'sm' | 'md'
}

export function TagBadge({ tag, onClick, onRemove, variant = 'secondary', size = 'sm' }: TagBadgeProps) {
  const sizeClasses = size === 'sm' ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-sm'

  return (
    <Badge
      className={cn(
        'flex items-center gap-1 font-normal',
        sizeClasses,
        onClick && 'cursor-pointer hover:bg-secondary/80',
        tag.color && `bg-[${tag.color}]/10 text-[${tag.color}]`
      )}
      onClick={onClick}
      variant={variant}
    >
      <Hash className="h-3 w-3" />
      <span>{tag.name}</span>
      {onRemove && (
        <Button
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          size="icon"
          variant="ghost"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )
}
