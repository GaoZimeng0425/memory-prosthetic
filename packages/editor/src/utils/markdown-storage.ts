/**
 * Markdown storage utilities
 *
 * Provides functions for serializing and deserializing Markdown format
 * for storage in the database.
 */

import { MarkdownPlugin, serializeMd } from '@platejs/markdown'
import type { TPlateEditor } from 'platejs/react'

import type { Value } from '@memory-prosthetic/editor/types'

/**
 * Normalize Markdown list markers from * to -
 * Replaces list item markers at line start (e.g., "* item" -> "- item")
 * but preserves * used for bold/italic formatting
 *
 * @param markdown - Raw Markdown string
 * @returns Markdown string with normalized list markers
 */
export const normalizeMarkdownListMarkers = (markdown: string): string => {
  // Replace list markers from * to - (only at line start, followed by space)
  // This matches list items like "* item" or "  * nested item" but not "*bold*" or "*italic*"
  return markdown.replace(/^(\s*)\*\s/gm, '$1- ')
}

/**
 * Serialize editor content to Markdown string for database storage
 *
 * @param editor - Plate editor instance
 * @returns Markdown string representation
 * @throws Error if serialization fails
 */
export const serializeEditorToMarkdown = (editor: TPlateEditor): string => {
  try {
    const markdown = serializeMd(editor)
    return normalizeMarkdownListMarkers(markdown)
  } catch (error) {
    throw new Error(`Failed to serialize editor to Markdown: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Deserialize Markdown string to editor content
 *
 * @param editor - Plate editor instance
 * @param markdown - Markdown string from database
 * @returns Editor value (Slate format)
 * @throws Error if deserialization fails
 */
export const deserializeMarkdownToEditor = (editor: TPlateEditor, markdown: string): Value => {
  try {
    if (!markdown || markdown.trim() === '') {
      // Return empty paragraph for empty content
      return [
        {
          children: [{ text: '' }],
          type: 'p',
        },
      ] as Value
    }

    // Use MarkdownPlugin API to deserialize
    const markdownApi = editor.getApi(MarkdownPlugin)
    if (!markdownApi) {
      throw new Error('MarkdownPlugin not found in editor')
    }

    return markdownApi.markdown.deserialize(markdown) as Value
  } catch (error) {
    throw new Error(
      `Failed to deserialize Markdown to editor: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Check if content is likely Markdown format
 * (Simple heuristic: if it starts with Markdown syntax or doesn't look like JSON)
 *
 * @param content - Content string to check
 * @returns true if content appears to be Markdown
 */
export const isMarkdownFormat = (content: string): boolean => {
  if (!content || content.trim() === '') {
    return true // Empty content is treated as Markdown
  }

  // Check if it's JSON (Slate format)
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(content)
      // If it's a valid JSON array/object, it's likely Slate format
      if (Array.isArray(parsed) || typeof parsed === 'object') {
        return false
      }
    } catch {
      // Not valid JSON, likely Markdown
    }
  }

  // Check for common Markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /^\*\s/m, // Bullet lists
    /^-\s/m, // Bullet lists
    /^\d+\.\s/m, // Numbered lists
    /^\s*```/m, // Code blocks
    /^\s*>/m, // Blockquotes
    /\[.*\]\(.*\)/, // Links
    /!\[.*\]\(.*\)/, // Images
  ]

  return markdownPatterns.some((pattern) => pattern.test(content))
}
