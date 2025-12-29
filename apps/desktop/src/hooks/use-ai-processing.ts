/**
 * AI Processing Hook
 *
 * Handles AI content processing using react-query mutation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import { type ProcessContentUnifiedResult, processContentAi } from '@memory-prosthetic/ai'
import type { Collection } from '@memory-prosthetic/shared'
import { collections, tags } from '@/apis'

type UseAiProcessingReturn = {
  processCollection: (collection: Collection, existingTags?: string[]) => Promise<ProcessContentUnifiedResult>
  isProcessing: boolean
  error: string | null
}

export const useAiProcessing = (): UseAiProcessingReturn => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({
      collection,
      existingTags,
    }: {
      collection: Collection
      existingTags?: string[]
    }): Promise<ProcessContentUnifiedResult> => {
      // 前端 AI 处理（统一生成所有元数据，包括 tags）
      const result = await processContentAi(collection.content, collection.title, existingTags)

      // 提取 AiMetadata（不包含 tags）
      const { tags: generatedTags, ...aiMetadata } = result

      // 保存到后端数据库（只保存 AiMetadata，tags 单独处理）
      await invoke('update_collection_ai_metadata', {
        id: collection.id,
        aiMetadata,
      })

      if (generatedTags.length > 0) {
        // 处理生成的 tags：查找或创建，然后添加到 collection
        // 获取所有现有 tags
        const allTags = await tags.api.getList()
        const tagMap = new Map(allTags.map((t) => [t.name.toLowerCase(), t]))

        // 查找或创建 tags
        const tagIdsToAdd: number[] = []
        for (const generatedTag of generatedTags) {
          const tagName = generatedTag.name.trim()
          const tagKey = tagName.toLowerCase()

          // 查找现有 tag
          let tagId = tagMap.get(tagKey)?.id

          // 如果不存在，创建新 tag
          if (!tagId) {
            tagId = await tags.api.create({ name: tagName })
            // 更新 tagMap 以便后续查找
            tagMap.set(tagKey, { id: tagId, name: tagName } as (typeof allTags)[0])
          }

          tagIdsToAdd.push(tagId)
        }

        // 添加 tags 到 collection
        if (tagIdsToAdd.length > 0) {
          await collections.api.addCollectionTags(collection.id, tagIdsToAdd)
        }
      }

      // 刷新相关查询
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collectionTags', collection.id] }),
        queryClient.invalidateQueries({ queryKey: collections.keys.all }),
        queryClient.invalidateQueries({ queryKey: tags.keys.lists() }),
      ])

      return result
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
