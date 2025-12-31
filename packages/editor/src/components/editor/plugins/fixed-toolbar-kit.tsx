'use client'

import { createPlatePlugin } from 'platejs/react'

import { FixedToolbar } from '@memory-prosthetic/editor/components/ui/fixed-toolbar'
import { FixedToolbarButtons } from '@memory-prosthetic/editor/components/ui/fixed-toolbar-buttons'

export const FixedToolbarKit = [
  createPlatePlugin({
    key: 'fixed-toolbar',
    render: {
      beforeEditable: () => (
        <FixedToolbar>
          <FixedToolbarButtons />
        </FixedToolbar>
      ),
    },
  }),
]
