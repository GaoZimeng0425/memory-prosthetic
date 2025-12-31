'use client'

import { TogglePlugin } from '@platejs/toggle/react'

import { IndentKit } from '@memory-prosthetic/editor/components/editor/plugins/indent-kit'
import { ToggleElement } from '@memory-prosthetic/editor/components/ui/toggle-node'

export const ToggleKit = [...IndentKit, TogglePlugin.withComponent(ToggleElement)]
