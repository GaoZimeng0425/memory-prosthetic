import { generateText } from 'ai'

import { getAiConfig, getAiModel } from './config'

export const generateSummary = async (content: string, title: string): Promise<string> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请为以下文章生成一个简洁的摘要（100-200字）：

标题：${title}

内容：
${content.substring(0, 4000)}  // 限制输入长度

要求：
1. 摘要应准确概括文章的核心内容
2. 语言简洁明了
3. 长度控制在100-200字之间
4. 使用中文输出`

  try {
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.3, // 较低温度，更确定性
    })

    // 确保摘要长度在合理范围内
    const summary = text.trim()
    if (summary.length > 200) {
      return `${summary.substring(0, 200)}...`
    }
    return summary
  } catch (error) {
    console.error('Summary generation failed:', error)
    // 降级到提取式摘要
    return extractSummaryFallback(content)
  }
}

// 提取式摘要降级方案
const extractSummaryFallback = (content: string): string => {
  const paragraphs = content.split('\n\n')
  const firstParagraph = paragraphs[0] || content

  const sentences = content.split(/[。！？.!?]/)
  const keySentences = sentences.filter((s) => s.length > 50 && s.length < 200).slice(0, 2)

  let summary = firstParagraph
  if (keySentences.length > 0) {
    summary += `\n\n${keySentences.join('。')}`
  }

  if (summary.length > 200) {
    return `${summary.substring(0, 200)}...`
  }
  return summary
}
