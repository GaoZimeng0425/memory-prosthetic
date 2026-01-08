import { useCallback, useRef, useState } from 'react'
import { type LanguageModelUsage, streamText } from 'ai'

import type { AiConfig } from '../config'
import { getAiConfig, getAiModel } from '../config'

export type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  usage?: LanguageModelUsage
}

export type ChatOptions = {
  onChunk?: (chunk: string) => void
  onError?: (error: Error) => void
  onMessageStart?: (message: Message) => void
  onMessageEnd?: (message: Message) => void
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageRef = useRef<string>('')

  // 发送消息
  const sendMessage = useCallback(
    async (input: string, options?: ChatOptions) => {
      if (isLoading) return

      setIsLoading(true)

      try {
        // 添加用户消息
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])

        // 获取AI配置
        const config: AiConfig = await getAiConfig()

        if (!config.enabled || !config.apiKey) {
          throw new Error('AI is not enabled or API key is missing')
        }

        // 获取AI模型
        const model = getAiModel(config)

        // 创建新的AbortController用于取消请求
        abortControllerRef.current = new AbortController()

        // 流式获取AI响应
        const { textStream, usage } = await streamText({
          model,
          prompt: input,
          abortSignal: abortControllerRef.current.signal,
        })

        // 创建助手消息对象
        const assistantMessageId = `assistant-${Date.now()}`
        currentMessageRef.current = ''

        const initialAssistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        }

        // 初始添加空助手消息
        setMessages((prev) => [...prev, initialAssistantMessage])

        options?.onMessageStart?.(initialAssistantMessage)

        // 处理流式响应
        for await (const chunk of textStream) {
          if (chunk) {
            currentMessageRef.current += chunk
            // 实时更新最后一条消息
            setMessages((prev) => {
              const newMessages = [...prev]
              const lastMsg = newMessages[newMessages.length - 1]
              if (lastMsg && lastMsg.id === assistantMessageId) {
                return [...newMessages.slice(0, -1), { ...lastMsg, content: currentMessageRef.current }]
              }
              return prev
            })
            options?.onChunk?.(chunk)
          }
        }

        // 流结束后的最终状态确认
        const finalAssistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          content: currentMessageRef.current,
          timestamp: new Date(),
        }

        // 确保最终一致性 (其实上面的循环已经更新了，但为了保险起见或者如果有后续处理)
        // 这里不需要再 append 了，只需要 update 或者什么都不做，因为上面已经 update 了
        // 简单起见，这里可以再次 update 确保完整，或者直接触发 onMessageEnd

        options?.onMessageEnd?.(finalAssistantMessage)
      } catch (error) {
        console.error('Error sending message:', error)
        options?.onError?.(error instanceof Error ? error : new Error(String(error)))

        // 添加错误消息
        if (error instanceof Error && error.name !== 'AbortError') {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `Error: ${error.message}`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorMessage])
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
        currentMessageRef.current = ''
      }
    },
    [isLoading]
  )

  // 重新生成最后一条助手消息
  const regenerateLastMessage = useCallback(
    async (options?: ChatOptions) => {
      if (isLoading) return

      // 获取最后一条用户消息
      const lastUserMessage = [...messages].reverse().find((msg) => msg.role === 'user')

      if (!lastUserMessage) {
        return
      }

      // 移除最后一条助手消息（如果有）
      setMessages((prev) => {
        const lastAssistantIndex = prev.findLastIndex((msg) => msg.role === 'assistant')
        if (lastAssistantIndex !== -1) {
          return prev.slice(0, lastAssistantIndex)
        }
        return prev
      })

      // 重新发送最后一条用户消息
      await sendMessage(lastUserMessage.content, options)
    },
    [isLoading, messages, sendMessage]
  )

  // 取消当前请求
  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // 清空聊天记录
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // 添加消息（外部使用）
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    regenerateLastMessage,
    stopGenerating,
    clearMessages,
    addMessage,
  }
}
