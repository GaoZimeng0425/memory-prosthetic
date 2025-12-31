import { generateText, Output } from 'ai'
import { z } from 'zod'

import { getAiConfig, getAiModel } from './config'

// 定义标签 Schema
const TagSchema = z.object({
  name: z.string().min(1).max(50),
  confidence: z.number().min(0).max(1),
})

const TagsResponseSchema = z.object({
  tags: z.array(TagSchema).min(2).max(5),
})

export type GeneratedTag = {
  id: string
  name: string
  confidence: number
  isAuto: boolean
}

export const generateTags = async (
  content: string,
  title: string,
  existingTags?: string[] // 用户已有标签，用于保持一致性
): Promise<GeneratedTag[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const existingTagsContext = existingTags?.length ? `\n用户已有的标签：${existingTags.join(', ')}` : ''

  const prompt = `请为以下文章生成2-5个相关标签：

标题：${title}
${existingTagsContext}

内容：
${content.substring(0, 3000)}

要求：
1. 标签应准确反映文章的主题和内容
2. 优先使用技术栈、领域、类型等分类标签
3. 标签应简洁（1-3个词）
4. 如果用户已有标签，尽量保持风格一致
5. confidence 范围：0-1，表示标签的置信度`

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: TagsResponseSchema,
      }),
      prompt,
      temperature: 0.5,
    })

    return output.tags
      .filter((t) => t.confidence > 0.3)
      .map((t) => ({
        id: crypto.randomUUID(),
        name: t.name.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
        isAuto: true,
      }))
  } catch (error) {
    console.error('Tag generation failed:', error)
    // 降级到文本生成方式
    return generateTagsFallback(content, title, existingTags)
  }
}

// 降级方案：使用 generateText
const generateTagsFallback = async (
  content: string,
  title: string,
  _existingTags?: string[]
): Promise<GeneratedTag[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const { text } = await generateText({
    model,
    prompt: `提取标签：${title}\n${content.substring(0, 1000)}`,
  })

  // 简单提取
  const matches = text.match(/"([^"]+)"/g) || text.match(/(\w+)/g)
  if (!matches) return []

  return matches.slice(0, 5).map((match) => ({
    id: crypto.randomUUID(),
    name: match.replace(/"/g, '').trim(),
    confidence: 0.6,
    isAuto: true,
  }))
}
