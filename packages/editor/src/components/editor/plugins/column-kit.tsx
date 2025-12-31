'use client'

import { ColumnItemPlugin, ColumnPlugin } from '@platejs/layout/react'

import { ColumnElement, ColumnGroupElement } from '@memory-prosthetic/editor/components/ui/column-node'

export const ColumnKit = [ColumnPlugin.withComponent(ColumnGroupElement), ColumnItemPlugin.withComponent(ColumnElement)]
