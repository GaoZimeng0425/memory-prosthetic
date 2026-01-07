'use client'

import { TrailingBlockPlugin, type Value } from 'platejs'
import { type TPlateEditor, useEditorRef } from 'platejs/react'

import { AIKit } from '@memory-prosthetic/editor/components/editor/plugins/ai-kit'
import { AlignKit } from '@memory-prosthetic/editor/components/editor/plugins/align-kit'
import { AutoformatKit } from '@memory-prosthetic/editor/components/editor/plugins/autoformat-kit'
import { BasicBlocksKit } from '@memory-prosthetic/editor/components/editor/plugins/basic-blocks-kit'
import { BasicMarksKit } from '@memory-prosthetic/editor/components/editor/plugins/basic-marks-kit'
import { BlockMenuKit } from '@memory-prosthetic/editor/components/editor/plugins/block-menu-kit'
import { BlockPlaceholderKit } from '@memory-prosthetic/editor/components/editor/plugins/block-placeholder-kit'
import { CalloutKit } from '@memory-prosthetic/editor/components/editor/plugins/callout-kit'
import { CodeBlockKit } from '@memory-prosthetic/editor/components/editor/plugins/code-block-kit'
import { ColumnKit } from '@memory-prosthetic/editor/components/editor/plugins/column-kit'
import { CommentKit } from '@memory-prosthetic/editor/components/editor/plugins/comment-kit'
import { CopilotKit } from '@memory-prosthetic/editor/components/editor/plugins/copilot-kit'
import { CursorOverlayKit } from '@memory-prosthetic/editor/components/editor/plugins/cursor-overlay-kit'
import { DateKit } from '@memory-prosthetic/editor/components/editor/plugins/date-kit'
import { DiscussionKit } from '@memory-prosthetic/editor/components/editor/plugins/discussion-kit'
import { DndKit } from '@memory-prosthetic/editor/components/editor/plugins/dnd-kit'
import { DocxKit } from '@memory-prosthetic/editor/components/editor/plugins/docx-kit'
import { EmojiKit } from '@memory-prosthetic/editor/components/editor/plugins/emoji-kit'
import { ExitBreakKit } from '@memory-prosthetic/editor/components/editor/plugins/exit-break-kit'
import { FixedToolbarKit } from '@memory-prosthetic/editor/components/editor/plugins/fixed-toolbar-kit'
import { FloatingToolbarKit } from '@memory-prosthetic/editor/components/editor/plugins/floating-toolbar-kit'
import { FontKit } from '@memory-prosthetic/editor/components/editor/plugins/font-kit'
import { LineHeightKit } from '@memory-prosthetic/editor/components/editor/plugins/line-height-kit'
import { LinkKit } from '@memory-prosthetic/editor/components/editor/plugins/link-kit'
import { ListKit } from '@memory-prosthetic/editor/components/editor/plugins/list-kit'
import { MarkdownKit } from '@memory-prosthetic/editor/components/editor/plugins/markdown-kit'
import { MathKit } from '@memory-prosthetic/editor/components/editor/plugins/math-kit'
import { MediaKit } from '@memory-prosthetic/editor/components/editor/plugins/media-kit'
import { MentionKit } from '@memory-prosthetic/editor/components/editor/plugins/mention-kit'
import { SlashKit } from '@memory-prosthetic/editor/components/editor/plugins/slash-kit'
import { SuggestionKit } from '@memory-prosthetic/editor/components/editor/plugins/suggestion-kit'
import { TableKit } from '@memory-prosthetic/editor/components/editor/plugins/table-kit'
import { TocKit } from '@memory-prosthetic/editor/components/editor/plugins/toc-kit'
import { ToggleKit } from '@memory-prosthetic/editor/components/editor/plugins/toggle-kit'

export const EditorKit = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  // ...DiscussionKit,
  // ...CommentKit,
  // ...SuggestionKit,

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  // ...BlockMenuKit,
  // ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
]

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>

export const useEditor = () => useEditorRef<MyEditor>()
