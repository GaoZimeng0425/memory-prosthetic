import { type ComponentProps, useRef } from 'react'

import { cn } from '@memory-prosthetic/ui/utils/tw'

type DragRegionProps = ComponentProps<'div'>

/**
 * DragRegion component - enables window dragging in Tauri apps
 * Uses data-tauri-drag-region attribute which is automatically handled by Tauri
 * The CSS app-region: drag is also applied via global styles
 */
export const DragRegion = ({ className = '', children }: DragRegionProps) => {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className={cn('absolute top-0 right-0 left-0 z-50 cursor-move', className)} data-tauri-drag-region ref={ref}>
      {children}
    </div>
  )
}
