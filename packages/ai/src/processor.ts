// 使用 shared 包的类型定义
import type { AiMetadata, Keyword, SummaryType, Topic } from '@memory-prosthetic/shared'
import { classifyContent } from './classification'
import { extractKeywords } from './keywords'
import { generateSummary } from './summary'
import { identifyTopics } from './topics'

// 重新导出类型以保持兼容性
export type { AiMetadata, SummaryType, Keyword, Topic }

// 请求限流器（避免 API 配额超限）
class RateLimiter {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private readonly maxConcurrent: number
  private readonly delayBetweenRequests: number

  constructor(maxConcurrent = 3, delayBetweenRequests = 200) {
    this.maxConcurrent = maxConcurrent
    this.delayBetweenRequests = delayBetweenRequests
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          this.processQueue()
        }
      })
      this.processQueue()
    })
  }

  private processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.running++
    const task = this.queue.shift()!
    task().then(() => {
      // 延迟后处理下一个请求
      setTimeout(() => this.processQueue(), this.delayBetweenRequests)
    })
  }
}

// 全局限流器实例
const rateLimiter = new RateLimiter(3, 200) // 最多3个并发，请求间隔200ms

// 结果缓存（基于内容哈希）
const cache = new Map<string, { data: AiMetadata; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时

const getContentHash = (content: string, title: string): string => {
  // 简单哈希（实际可以使用 crypto.subtle.digest）
  return `${title}:${content.length}:${content.substring(0, 100)}`
}

export const processContentAi = async (
  content: string,
  title: string,
  _existingTags?: string[]
): Promise<AiMetadata> => {
  const cacheKey = getContentHash(content, title)

  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // 使用限流器执行并行处理
    const [summary, classification, keywords, topics] = await Promise.all([
      rateLimiter.execute(() => generateSummary(content, title)).catch(() => null),
      rateLimiter
        .execute(() => classifyContent(content, title))
        .catch(() => ({
          contentType: null,
          domain: null,
          difficulty: null,
          language: null,
          techStack: [],
        })),
      rateLimiter.execute(() => extractKeywords(content, title)).catch(() => []),
      rateLimiter.execute(() => identifyTopics(content, title)).catch(() => []),
    ])

    const result: AiMetadata = {
      summary: summary || null,
      summaryType: summary ? 'auto' : null,
      contentType: classification.contentType,
      domain: classification.domain,
      difficulty: classification.difficulty,
      language: classification.language,
      qualityScore: null, // 可选，未来可添加
      processedAt: Date.now(),
      keywords,
      topics,
    }

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
