import type { AiMetadata, Keyword, SummaryType, Topic } from '@memory-prosthetic/shared'
import { type ProcessContentUnifiedResult, processContentUnified } from './unified-processor'

// 重新导出类型以保持兼容性
export type { AiMetadata, SummaryType, Keyword, Topic }

// 结果缓存（基于内容哈希）
const cache = new Map<string, { data: ProcessContentUnifiedResult; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时

const getContentHash = (content: string, title: string): string => {
  // 简单哈希（实际可以使用 crypto.subtle.digest）
  return `${title}:${content.length}:${content.substring(0, 100)}`
}

export const processContentAi = async (
  content: string,
  title: string,
  existingTags?: string[]
): Promise<ProcessContentUnifiedResult> => {
  const cacheKey = getContentHash(content, title)

  // 检查缓存（注意：如果 existingTags 不同，应该使用不同的缓存键）
  // 但为了简化，这里暂时忽略 existingTags 对缓存的影响
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as ProcessContentUnifiedResult
  }

  try {
    // 使用统一的 AI 处理函数，一次性生成所有元数据（包括 tags）
    const result = await processContentUnified(content, title, existingTags)

    // 缓存结果
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    })

    // 清理过期缓存
    if (cache.size > 100) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      }
    }

    console.log('🚀 : processContentAi : result:', result)
    return result
  } catch (error) {
    console.error('AI processing failed:', error)
    throw error
  }
}

// 带重试的 AI 调用包装器
export const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果是认证错误，不重试
      if (lastError.message.includes('401') || lastError.message.includes('Unauthorized')) {
        throw lastError
      }

      // 指数退避
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * 2 ** attempt))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
