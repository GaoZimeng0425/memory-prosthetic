import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export type AiProvider = 'openai' | 'anthropic' | 'custom' | 'deepseek'

export type AiConfig = {
  provider: AiProvider
  apiKey: string
  baseURL?: string // 自定义 API 端点（仅 custom 时使用）
  model?: string // 默认模型
  enabled: boolean // 是否启用 AI 功能
}

// 默认配置
const DEFAULT_CONFIG: AiConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  enabled: false,
}

// 从设置存储中获取配置
export const getAiConfig = async (): Promise<AiConfig> => {
  try {
    // 动态导入 Tauri API（避免在非 Tauri 环境中报错）
    const { invoke } = await import('@tauri-apps/api/core')

    // 从普通设置获取配置（不包含 API Key）
    const result = await invoke<{ data: Omit<AiConfig, 'apiKey'> | null }>('get_setting', {
      key: 'ai_config',
    })

    const config = result.data

    // 从安全存储获取 API Key
    const apiKey = await getSecureApiKey()

    return {
      ...(config || DEFAULT_CONFIG),
      apiKey: apiKey || '',
    }
  } catch (error) {
    console.error('Failed to get AI config:', error)
    return DEFAULT_CONFIG
  }
}

// 保存配置到设置存储
export const saveAiConfig = async (config: AiConfig): Promise<void> => {
  try {
    // 动态导入 Tauri API
    const { invoke } = await import('@tauri-apps/api/core')

    // 分离 API Key 和普通配置
    const { apiKey, ...restConfig } = config

    // 保存普通配置
    await invoke('set_setting', {
      key: 'ai_config',
      value: restConfig,
    })

    // 保存 API Key 到安全存储
    if (apiKey) {
      await saveSecureApiKey(apiKey)
    } else {
      await clearSecureApiKey()
    }
  } catch (error) {
    console.error('Failed to save AI config:', error)
    throw error
  }
}

// 安全存储 API Key（使用 Tauri invoke 命令存储到后端）
const getSecureApiKey = async (): Promise<string | null> => {
  try {
    // 使用 Tauri invoke 从后端获取 API Key
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{ data: string | null }>('get_setting', {
      key: 'ai_api_key_secure',
    })
    return result.data
  } catch (error) {
    // 如果 Tauri 不可用，返回 null
    console.error('Failed to get secure API key:', error)
    return null
  }
}

const saveSecureApiKey = async (apiKey: string): Promise<void> => {
  try {
    // 使用 Tauri invoke 保存 API Key 到后端
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_setting', {
      key: 'ai_api_key_secure',
      value: apiKey,
    })
  } catch (error) {
    console.error('Failed to save secure API key:', error)
    throw error
  }
}

const clearSecureApiKey = async (): Promise<void> => {
  try {
    // 使用 Tauri invoke 清除 API Key
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_setting', {
      key: 'ai_api_key_secure',
      value: null,
    })
  } catch (error) {
    console.error('Failed to clear secure API key:', error)
  }
}

// 获取 AI 模型实例
export const getAiModel = (config: AiConfig): LanguageModel => {
  if (!config.enabled || !config.apiKey) {
    throw new Error('AI is not enabled or API key is missing')
  }

  switch (config.provider) {
    case 'deepseek': {
      const deepseekProvider = createDeepSeek({
        apiKey: config.apiKey,
      })
      return deepseekProvider(config.model ?? 'deepseek-chat')
    }
    case 'openai': {
      // OpenAI SDK v3 用法 - openai 是一个 Provider 函数，可以直接调用
      const openaiProvider = createOpenAI({
        apiKey: config.apiKey,
      })
      return openaiProvider(config.model ?? 'gpt-4o-mini')
    }
    case 'anthropic': {
      // Anthropic SDK 用法
      const anthropicProvider = createAnthropic({
        apiKey: config.apiKey,
      })
      return anthropicProvider(config.model ?? 'claude-3-haiku-20240307')
    }
    case 'custom': {
      if (!config.baseURL) {
        throw new Error('Custom provider requires baseURL')
      }
      // 自定义 API 端点（兼容 OpenAI 格式）
      const openaiProvider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })
      return openaiProvider(config.model ?? 'gpt-4o-mini')
    }
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

// 验证 API Key 是否有效
export const validateApiKey = async (
  provider: AiProvider,
  apiKey: string,
  modelName: string,
  baseURL?: string
): Promise<boolean> => {
  try {
    const model = getAiModel({
      model: modelName,
      provider,
      apiKey,
      baseURL,
      enabled: true,
    })

    // 发送一个简单的测试请求
    const { generateText } = await import('ai')
    await generateText({
      model,
      prompt: 'test',
    })

    return true
  } catch (error) {
    console.error('API Key validation failed:', error)
    return false
  }
}
