/**
 * Hook for collecting page content
 */

import { useState } from 'react'

import type { ContentResponse } from '@/types/messages'
import { collectContent } from '@/utils/api'

export type CollectStatus = 'idle' | 'extracting' | 'collecting' | 'success' | 'error'

interface UseCollectResult {
  status: CollectStatus
  error: string | null
  collect: () => Promise<void>
  reset: () => void
}

/**
 * Hook to manage page collection
 */
export function useCollect(): UseCollectResult {
  const [status, setStatus] = useState<CollectStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const collect = async () => {
    setStatus('extracting')
    setError(null)

    try {
      // Get current tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

      if (!tab?.id) {
        throw new Error('无法获取当前标签页')
      }

      // Send message to content script to extract content
      const response: ContentResponse = await browser.tabs.sendMessage(tab.id, {
        type: 'EXTRACT_CONTENT',
      })

      if (!response.success) {
        throw new Error(response.error)
      }

      // Send to desktop app
      setStatus('collecting')
      const collectResult = await collectContent(response.data)

      if (!collectResult.success) {
        throw new Error(collectResult.error.message)
      }

      setStatus('success')

      // Auto reset after 2 seconds
      setTimeout(() => {
        setStatus('idle')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '收集失败')
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
  }

  return {
    status,
    error,
    collect,
    reset,
  }
}
