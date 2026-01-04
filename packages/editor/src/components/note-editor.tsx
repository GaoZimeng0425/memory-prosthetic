'use client'

import { useEffect, useRef } from 'react'
import { normalizeNodeId } from 'platejs'
import { MarkdownPlugin } from '@platejs/markdown'
import { Plate, usePlateEditor } from 'platejs/react'

import { EditorKit } from '@memory-prosthetic/editor/components/editor/editor-kit'
import { Editor, EditorContainer } from '@memory-prosthetic/editor/components/ui/editor'
import type { Value } from '@memory-prosthetic/editor/types'

type NoteEditorProps = {
  value?: Value
  markdown?: string // Markdown string (preferred over value for loading)
  onChange?: (value: Value) => void
  onMarkdownChange?: (markdown: string) => void // Callback with Markdown string when content changes
  placeholder?: string
}

const defaultValue: Value = normalizeNodeId([
  {
    children: [{ text: '' }],
    type: 'p',
  },
])

export const NoteEditor = ({ value, markdown, onChange, onMarkdownChange, placeholder }: NoteEditorProps) => {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: value ?? defaultValue,
  })

  const markdownLoadedRef = useRef(false)

  // Load Markdown content when provided (only once on mount)
  useEffect(() => {
    if (markdown !== undefined && markdown !== '' && !markdownLoadedRef.current) {
      try {
        const markdownApi = editor.getApi(MarkdownPlugin)
        if (markdownApi && markdown) {
          const deserialized = markdownApi.markdown.deserialize(markdown)
          if (deserialized && deserialized.length > 0) {
            editor.tf.setValue(normalizeNodeId(deserialized) as Value)
            markdownLoadedRef.current = true
          }
        }
      } catch (error) {
        console.error('Failed to deserialize Markdown:', error)
      }
    }
  }, []) // Only run once on mount

  return (
    <Plate
      editor={editor}
      onChange={({ value: newValue }: { value: Value }) => {
        if (onChange) {
          onChange(newValue)
        }
        // Also provide Markdown version if callback is provided
        if (onMarkdownChange) {
          try {
            const markdownApi = editor.getApi(MarkdownPlugin)
            if (markdownApi) {
              const markdownString = markdownApi.markdown.serialize()
              onMarkdownChange(markdownString)
            }
          } catch (error) {
            console.error('Failed to serialize to Markdown:', error)
          }
        }
      }}
    >
      <EditorContainer>
        <Editor variant="default" placeholder={placeholder} />
      </EditorContainer>
    </Plate>
  )
}
