import { createFileRoute } from '@tanstack/react-router'

import { NoteEditorPage } from '@/components/pages/NoteEditorPage'

export const Route = createFileRoute('/note/new')({
  component: NoteEditorPage,
})
