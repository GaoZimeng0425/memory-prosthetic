import { generateText, Output } from 'ai'
import { z } from 'zod'

import type { AiMetadata } from '@memory-prosthetic/shared'
import { getAiConfig, getAiModel } from './config'
import { ARTICLE_PROMPT } from './constants/article-prompt'

// 定义统一的响应 Schema
const UnifiedAnalysisSchema = z.object({
  summary: z.string().nullable().describe('文章摘要，100-200字，如果不确定返回 null'),
  contentType: z
    .enum(['article', 'tutorial', 'docs', 'news', 'blog', 'paper'])
    .nullable()
    .describe('内容类型，如果不确定返回 null'),
  domain: z
    .enum(['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai'])
    .nullable()
    .describe('技术领域，如果不确定返回 null'),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .nullable()
    .describe('难度等级，如果不确定返回 null'),
  language: z.enum(['zh', 'en', 'mixed']).nullable().describe('内容语言，如果不确定返回 null'),
  keywords: z
    .array(
      z.object({
        keyword: z.string().describe('关键词'),
        weight: z.number().min(0).max(1).describe('重要性权重，0-1'),
      })
    )
    .min(5)
    .max(10)
    .describe('关键词列表，5-10个，按 weight 降序排列'),
  topics: z
    .array(
      z.object({
        topic: z.string().describe('主题名称，2-5个词'),
        confidence: z.number().min(0).max(1).describe('置信度，0-1'),
      })
    )
    .min(1)
    .max(3)
    .describe('主题列表，1-3个，按 confidence 降序排列'),
})

export const processContentUnified = async (content: string, title: string): Promise<AiMetadata> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `${ARTICLE_PROMPT}

标题：${title}

内容：
${content.substring(0, 4000)}

请分析以上内容并生成元数据。`

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: UnifiedAnalysisSchema,
      }),
      prompt,
      temperature: 0.3,
    })

    // 转换结果格式，添加 id 字段
    const keywords = output.keywords
      .filter((k) => k.weight > 0.3)
      .map((k) => ({
        id: crypto.randomUUID(),
        keyword: k.keyword.trim(),
        weight: Math.min(1, Math.max(0, k.weight)),
        extractionMethod: 'ai' as const,
      }))

    const topics = output.topics
      .filter((t) => t.confidence > 0.5)
      .map((t) => ({
        id: crypto.randomUUID(),
        topic: t.topic.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
      }))

    // 验证摘要长度
    let summary = output.summary
    if (summary) {
      summary = summary.trim()
      if (summary.length > 200) {
        summary = `${summary.substring(0, 200)}...`
      }
      if (summary.length < 50) {
        // 如果摘要太短，可能质量不高，设为 null
        summary = null
      }
    }

    const result: AiMetadata = {
      summary,
      summaryType: summary ? 'auto' : null,
      contentType: output.contentType,
      domain: output.domain,
      difficulty: output.difficulty,
      language: output.language,
      qualityScore: null,
      processedAt: Date.now(),
      keywords,
      topics,
    }

    return result
  } catch (error) {
    console.error('Unified AI processing failed:', error)
    // 返回默认值
    return {
      summary: null,
      summaryType: null,
      contentType: null,
      domain: null,
      difficulty: null,
      language: null,
      qualityScore: null,
      processedAt: Date.now(),
      keywords: [],
      topics: [],
    }
  }
}
