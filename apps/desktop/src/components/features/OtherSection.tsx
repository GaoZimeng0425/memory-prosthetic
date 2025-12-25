/**
 * Other Section Component
 *
 * Displays "Other" category in sidebar with Archived and Recently Deleted items.
 */

import { useState } from 'react'
import { Archive, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'

interface OtherSectionProps {
  isCollapsed: boolean
  activeNav: string
  onNavChange: (nav: string) => void
  archivedCount?: number
  deletedCount?: number
}

export function OtherSection({
  isCollapsed,
  activeNav,
  onNavChange,
  archivedCount = 0,
  deletedCount = 0,
}: OtherSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (isCollapsed) {
    return (
      <div className="p-2">
        <Button
          className="w-full justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
          size="icon"
          variant="ghost"
        >
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const isArchivedActive = activeNav === 'archived'
  const isDeletedActive = activeNav === 'deleted'

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <Button
          className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-xs">其他</span>
        </Button>
      </div>

      {/* Sub-items */}
      {isExpanded && (
        <div className="space-y-0.5 px-2">
          <Button
            className={cn(
              'w-full justify-start gap-2 text-xs',
              isArchivedActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              !isArchivedActive && 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onNavChange('archived')}
            size="sm"
            variant="ghost"
          >
            <Archive className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate text-left">已归档</span>
            {archivedCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                {archivedCount}
              </span>
            )}
          </Button>

          <Button
            className={cn(
              'w-full justify-start gap-2 text-xs',
              isDeletedActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              !isDeletedActive && 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onNavChange('deleted')}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate text-left">最近删除</span>
            {deletedCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
                {deletedCount}
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
