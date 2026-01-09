'use client'

import { useEffect, useRef } from 'react'
import { MarkdownPlugin } from '@platejs/markdown'
import { isString } from 'es-toolkit'
import { normalizeNodeId } from 'platejs'
import { Plate, usePlateEditor } from 'platejs/react'

import { EditorKit } from '@memory-prosthetic/editor/components/editor/editor-kit'
import { Editor, EditorContainer } from '@memory-prosthetic/editor/components/ui/editor'
import type { Value } from '@memory-prosthetic/editor/types'
import { normalizeMarkdownListMarkers } from '@memory-prosthetic/editor/utils/markdown-storage'

type NoteEditorProps = {
  disabled?: boolean
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

export const NoteEditor = ({ value, markdown, onChange, onMarkdownChange, placeholder, disabled }: NoteEditorProps) => {
  const editor = usePlateEditor({
    plugins: [...EditorKit],
    value: value ?? defaultValue,
  })

  const markdownLoadedRef = useRef(false)

  // Load Markdown content when provided (only once on mount)
  // biome-ignore lint/correctness/useExhaustiveDependencies: mounted
  useEffect(() => {
    if (!isString(markdown)) return
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
  }, [editor.getApi])

  return (
    <Plate
      editor={editor}
      onChange={({ value: newValue }) => {
        if (onChange) {
          onChange(newValue)
        }
        // Also provide Markdown version if callback is provided
        if (onMarkdownChange) {
          try {
            const markdownApi = editor.getApi(MarkdownPlugin)
            if (markdownApi) {
              try {
                const markdownString = normalizeMarkdownListMarkers(markdownApi.markdown.serialize())
                console.log('🚀 : NoteEditor : markdownString:', markdownString)
                onMarkdownChange(markdownString)
              } catch (error) {
                console.error('Failed to serialize to Markdown:', error)
              }
            }
          } catch (error) {
            console.error('Failed to serialize to Markdown:', error)
          }
        }
      }}
    >
      <EditorContainer>
        <Editor disabled={disabled} placeholder={placeholder} variant="default" />
      </EditorContainer>
    </Plate>
  )
}
