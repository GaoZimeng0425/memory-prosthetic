/**
 * AI Metadata Hook
 *
 * Fetches complete AI metadata for a collection, including summary, classification,
 * keywords, and topics.
 */
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

import type { AiMetadata } from '@memory-prosthetic/shared'

type UseAiMetadataOptions = {
  /**
   * Fallback summary to use if the collection has a summary but AI metadata doesn't
   */
  fallbackSummary?: string | null
  /**
   * Whether to enable the query
   */
  enabled?: boolean
}

export const useAiMetadata = (collectionId: number | null, options?: UseAiMetadataOptions) => {
  const { fallbackSummary, enabled = true } = options || {}

  return useQuery({
    queryKey: ['aiMetadata', collectionId],
    queryFn: async (): Promise<AiMetadata | null> => {
      if (!collectionId) {
        return null
      }

      try {
        // 使用统一的 Tauri command 获取完整的 AI 元数据
        const metadataResult = await invoke<{
          data: {
            summary: string | null
            summaryType: string | null
            contentType: string | null
            domain: string | null
            difficulty: string | null
            language: string | null
            qualityScore: number | null
            processedAt: number | null
            keywords: Array<{
              id: string
              keyword: string
              weight: number
              extractionMethod: string
            }>
            topics: Array<{
              id: string
              topic: string
              confidence: number
            }>
          }
        }>('get_collection_ai_metadata', { collectionId })

        const data = metadataResult.data

        // 转换格式以匹配 AiMetadata 类型
        const metadata: AiMetadata = {
          summary: data.summary || fallbackSummary || null,
          summaryType: (data.summaryType === 'auto' || data.summaryType === 'manual'
            ? data.summaryType
            : data.summary || fallbackSummary
              ? 'auto'
              : null) as AiMetadata['summaryType'],
          contentType: data.contentType as AiMetadata['contentType'],
          domain: data.domain as AiMetadata['domain'],
          difficulty: data.difficulty as AiMetadata['difficulty'],
          language: data.language as AiMetadata['language'],
          qualityScore: data.qualityScore ?? null,
          processedAt: data.processedAt ?? null,
          keywords: data.keywords.map((k) => ({
            id: k.id,
            keyword: k.keyword,
            weight: k.weight,
            extractionMethod: (k.extractionMethod || 'ai') as 'ai' | 'tfidf' | 'textrank',
          })),
          topics: data.topics.map((t) => ({
            id: t.id,
            topic: t.topic,
            confidence: t.confidence,
          })),
        }

        return metadata
      } catch (error) {
        console.error('Failed to fetch AI metadata:', error)
        // 降级：至少返回基本的 metadata
        if (fallbackSummary) {
          return {
            summary: fallbackSummary,
            summaryType: 'auto',
            contentType: null,
            domain: null,
            difficulty: null,
            language: null,
            qualityScore: null,
            processedAt: null,
            keywords: [],
            topics: [],
          }
        }
        return null
      }
    },
    enabled: enabled && collectionId !== null && collectionId > 0,
  })
}
