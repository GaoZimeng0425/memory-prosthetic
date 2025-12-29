import { generateText, Output } from 'ai'
import { z } from 'zod'

// 使用 shared 包的类型定义
import type { ContentType, Difficulty, Domain, Language } from '@memory-prosthetic/shared'
import { getAiConfig, getAiModel } from './config'

// 重新导出以保持兼容性
export type { ContentType, Domain, Difficulty, Language }

export type ContentClassification = {
  contentType: ContentType | null
  domain: Domain | null
  difficulty: Difficulty | null
  language: Language | null
  techStack: string[] // 技术栈列表
}

// 定义分类 Schema
const ContentClassificationSchema = z.object({
  contentType: z.enum(['article', 'tutorial', 'docs', 'news', 'blog', 'paper']).nullable(),
  domain: z.enum(['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai']).nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).nullable(),
  language: z.enum(['zh', 'en', 'mixed']).nullable(),
  techStack: z.array(z.string()).max(5),
})

export const classifyContent = async (content: string, title: string): Promise<ContentClassification> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请对以下文章进行分类：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. contentType: 文章类型，如果不确定则返回 null
2. domain: 技术领域，如果不确定则返回 null
3. difficulty: 内容难度，如果不确定则返回 null
4. language: 内容语言，如果不确定则返回 null
5. techStack: 涉及的技术栈，按重要性排序，最多5个`

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: ContentClassificationSchema,
      }),
      prompt,
      temperature: 0.3,
    })

    return {
      contentType: output.contentType,
      domain: output.domain,
      difficulty: output.difficulty,
      language: output.language,
      techStack: output.techStack,
    }
  } catch (error) {
    console.error('Classification failed:', error)
    return {
      contentType: null,
      domain: null,
      difficulty: null,
      language: null,
      techStack: [],
    }
  }
}
