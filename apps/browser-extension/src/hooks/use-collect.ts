/**
 * Collect Hook
 *
 * Manages page content collection with preview support.
 */

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { collections } from '@/apis'
import type { ContentResponse, ExtractedContent } from '@/types/messages'

export type CollectStatus = 'idle' | 'extracting' | 'previewing' | 'collecting' | 'success' | 'error'

interface UseCollectResult {
  status: CollectStatus
  error: string | null
  preview: ExtractedContent | null
  collect: () => void
  confirmCollect: () => void
  cancelPreview: () => void
  reset: () => void
}

/**
 * Extract content from current tab via browser messaging
 */
async function extractContent(): Promise<ExtractedContent> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

  if (!tab?.id) {
    throw new Error('无法获取当前标签页')
  }

  // Check if it's a special page where content scripts can't run
  const url = tab.url || ''
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('file://') ||
    url.startsWith('data:')
  ) {
    throw new Error('无法在此页面收集内容')
  }

  try {
    // Try to send message to content script
    const response: ContentResponse = await browser.tabs.sendMessage(tab.id, {
      type: 'EXTRACT_CONTENT',
    })

    if (!response.success) {
      throw new Error(response.error)
    }

    return response.data
  } catch (error) {
    // If content script is not loaded, try to inject it first
    if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
      // Inject content script programmatically
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-scripts/content.js'],
      })

      // Wait a bit for the script to initialize
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Retry sending message
      const response: ContentResponse = await browser.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT',
      })

      if (!response.success) {
        throw new Error(response.error)
      }

      return response.data
    }

    throw error
  }
}

/**
 * Hook to manage page collection with preview
 */
export function useCollect(): UseCollectResult {
  const [status, setStatus] = useState<CollectStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ExtractedContent | null>(null)

  const collectMutation = useMutation({
    ...collections.mutations.collect(),
    onSuccess: (data) => {
      if (!data.success) {
        setError(data.error.message)
        setStatus('error')
        return
      }

      setStatus('success')

      // Auto reset after 2 seconds
      setTimeout(() => {
        setStatus('idle')
        setPreview(null)
      }, 2000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '收集失败')
      setStatus('error')
    },
  })

  // Auto-extract content on mount for preview
  useEffect(() => {
    setStatus('extracting')

    extractContent()
      .then((content) => {
        setPreview(content)
        setStatus('previewing')
      })
      .catch((err) => {
        // Show error instead of silently failing
        setError(err instanceof Error ? err.message : '内容脚本未加载，请刷新页面后重试')
        setStatus('error')
      })
  }, [])

  const collect = () => {
    setStatus('extracting')
    setError(null)

    extractContent()
      .then((content) => {
        setPreview(content)
        setStatus('previewing')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '提取内容失败')
        setStatus('error')
      })
  }

  const confirmCollect = () => {
    if (!preview) return

    setStatus('collecting')
    setError(null)

    collectMutation.mutate(preview)
  }

  const cancelPreview = () => {
    setStatus('idle')
    setPreview(null)
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
    setPreview(null)
    collectMutation.reset()
  }

  return {
    status,
    error,
    preview,
    collect,
    confirmCollect,
    cancelPreview,
    reset,
  }
}
