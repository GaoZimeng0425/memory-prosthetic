'use client'

import { CursorOverlayPlugin } from '@platejs/selection/react'

import { CursorOverlay } from '@memory-prosthetic/editor/components/ui/cursor-overlay'

export const CursorOverlayKit = [
  CursorOverlayPlugin.configure({
    render: {
      afterEditable: () => <CursorOverlay />,
    },
  }),
]
