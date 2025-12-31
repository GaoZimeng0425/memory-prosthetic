'use client'

import { LinkPlugin } from '@platejs/link/react'

import { LinkElement } from '@memory-prosthetic/editor/components/ui/link-node'
import { LinkFloatingToolbar } from '@memory-prosthetic/editor/components/ui/link-toolbar'

export const LinkKit = [
  LinkPlugin.configure({
    render: {
      node: LinkElement,
      afterEditable: () => <LinkFloatingToolbar />,
    },
  }),
]
