import { generateObject } from 'ai'
import { z } from 'zod'

import { getAiConfig, getAiModel } from './config'

// 定义主题 Schema
const TopicSchema = z.object({
  topic: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
})

const TopicsResponseSchema = z.object({
  topics: z.array(TopicSchema).min(1).max(3),
})

// 使用 shared 包的类型定义
import type { Topic } from '@memory-prosthetic/shared'

// 重新导出以保持兼容性
export type { Topic }

export const identifyTopics = async (content: string, title: string): Promise<Topic[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请识别以下文章的主要主题（1-3个）：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. 主题应概括文章的核心讨论点
2. confidence 范围：0-1，表示主题识别的置信度
3. 按 confidence 降序排列`

  try {
    const { object } = await generateObject({
      model,
      schema: TopicsResponseSchema,
      prompt,
      temperature: 0.4,
    })

    return object.topics
      .filter((t) => t.confidence > 0.5)
      .map((t) => ({
        id: crypto.randomUUID(),
        topic: t.topic.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
      }))
  } catch (error) {
    console.error('Topic identification failed:', error)
    return []
  }
}
