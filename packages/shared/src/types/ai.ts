/**
 * AI Metadata Types
 *
 * Types for AI-generated content metadata (summary, tags, classification, etc.)
 */

export type SummaryType = 'auto' | 'manual'

export type ContentType = 'article' | 'tutorial' | 'docs' | 'news' | 'blog' | 'paper'

export type Domain = 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'devops' | 'ai'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type Language = 'zh' | 'en' | 'mixed'

export type Keyword = {
  id: string
  keyword: string
  weight: number // 0-1
  extractionMethod: 'ai' | 'tfidf' | 'textrank' // 当前仅支持 'ai'
}

export type Topic = {
  id: string
  topic: string
  confidence: number // 0-1
}

export type AiMetadata = {
  summary: string | null
  summaryType: SummaryType | null
  contentType: ContentType | null
  domain: Domain | null
  difficulty: Difficulty | null
  language: Language | null
  qualityScore: number | null
  processedAt: number | null
  keywords: Keyword[]
  topics: Topic[]
}

export type AiProcessingLog = {
  id: string
  collectionId: number
  taskType: 'summary' | 'tag' | 'classification' | 'keyword' | 'topic'
  modelName: string | null
  status: 'success' | 'failed' | 'timeout'
  processingTime: number | null // 毫秒
  errorMessage: string | null
  createdAt: number
}
