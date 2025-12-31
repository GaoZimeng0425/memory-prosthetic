'use client'

import type { PlateElementProps } from 'platejs/react'
import { PlateElement } from 'platejs/react'

import { cn } from '@memory-prosthetic/ui/utils/tw'

export function ParagraphElement(props: PlateElementProps) {
  return (
    <PlateElement {...props} className={cn('m-0 px-0 py-1')}>
      {props.children}
    </PlateElement>
  )
}
