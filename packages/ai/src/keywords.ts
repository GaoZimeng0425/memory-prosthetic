import { generateText, Output } from 'ai'
import { z } from 'zod'

// 使用 shared 包的类型定义
import type { Keyword } from '@memory-prosthetic/shared'
import { getAiConfig, getAiModel } from './config'

// 定义关键词 Schema
const KeywordSchema = z.object({
  keyword: z.string().min(1).max(100),
  weight: z.number().min(0).max(1),
})

const KeywordsResponseSchema = z.object({
  keywords: z.array(KeywordSchema).min(5).max(10),
})

// 重新导出以保持兼容性
export type { Keyword }

export const extractKeywords = async (content: string, title: string): Promise<Keyword[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请从以下文章中提取5-10个关键词：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. 关键词应准确反映文章的核心概念
2. 优先选择技术术语、概念名称
3. weight 范围：0-1，表示关键词的重要性
4. 按 weight 降序排列`

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: KeywordsResponseSchema,
      }),
      prompt,
      temperature: 0.4,
    })

    return output.keywords
      .filter((k) => k.weight > 0.3)
      .map((k) => ({
        id: crypto.randomUUID(),
        keyword: k.keyword.trim(),
        weight: Math.min(1, Math.max(0, k.weight)),
        extractionMethod: 'ai' as const,
      }))
  } catch (error) {
    console.error('Keyword extraction failed:', error)
    return []
  }
}
