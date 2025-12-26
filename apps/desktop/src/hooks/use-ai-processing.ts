/**
 * AI Processing Hook
 *
 * Handles AI content processing using react-query mutation.
 */

import { useMutation } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import { processContentAi } from '@memory-prosthetic/ai'
import type { AiMetadata, Collection } from '@memory-prosthetic/shared'

interface UseAiProcessingReturn {
  processCollection: (collection: Collection, existingTags?: string[]) => Promise<AiMetadata>
  isProcessing: boolean
  error: string | null
}

export function useAiProcessing(): UseAiProcessingReturn {
  const mutation = useMutation({
    mutationFn: async ({
      collection,
      existingTags,
    }: {
      collection: Collection
      existingTags?: string[]
    }): Promise<AiMetadata> => {
      // 前端 AI 处理
      const aiMetadata = await processContentAi(collection.content, collection.title, existingTags)

      // 保存到后端数据库
      await invoke('update_collection_ai_metadata', {
        id: collection.id,
        aiMetadata,
      })

      return aiMetadata
    },
    onError: (error) => {
      console.error('AI processing error:', error)
    },
  })

  return {
    processCollection: async (collection: Collection, existingTags?: string[]) => {
      return mutation.mutateAsync({ collection, existingTags })
    },
    isProcessing: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
