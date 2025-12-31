/**
 * AI Configuration Store
 *
 * Manages AI provider configuration state using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AiProvider } from '@memory-prosthetic/ai/config'
import { getAiConfig, saveAiConfig, validateApiKey } from '@memory-prosthetic/ai/config'

export type AiStoreState = {
  // State
  provider: AiProvider
  apiKey: string
  baseURL: string
  model: string
  enabled: boolean
  isLoading: boolean
  error: string | null
  isValidating: boolean
  isSaving: boolean

  // Actions
  setProvider: (provider: AiProvider) => void
  setApiKey: (apiKey: string) => void
  setBaseURL: (baseURL: string) => void
  setModel: (model: string) => void
  setEnabled: (enabled: boolean) => void
  setError: (error: string | null) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
  validateApiKey: () => Promise<boolean>
  reset: () => void
}

// Default models for each provider
const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  deepseek: 'deepseek-chat',
  custom: 'gpt-4o-mini',
}

const initialState: Omit<
  AiStoreState,
  | 'setProvider'
  | 'setApiKey'
  | 'setBaseURL'
  | 'setModel'
  | 'setEnabled'
  | 'setError'
  | 'loadConfig'
  | 'saveConfig'
  | 'validateApiKey'
  | 'reset'
> = {
  provider: 'openai',
  apiKey: '',
  baseURL: '',
  model: DEFAULT_MODELS.openai,
  enabled: false,
  isLoading: false,
  error: null,
  isValidating: false,
  isSaving: false,
}

export const useAiStore = create<AiStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setProvider: (provider: AiProvider) => {
        set({ provider, model: DEFAULT_MODELS[provider] })
      },

      setApiKey: (apiKey: string) => set({ apiKey }),

      setBaseURL: (baseURL: string) => set({ baseURL }),

      setModel: (model: string) => set({ model }),

      setEnabled: (enabled: boolean) => set({ enabled }),

      setError: (error: string | null) => set({ error }),

      loadConfig: async () => {
        set({ isLoading: true, error: null })
        try {
          const config = await getAiConfig()
          const defaultModel = config.model || DEFAULT_MODELS[config.provider]
          set({
            provider: config.provider,
            apiKey: config.apiKey || '',
            baseURL: config.baseURL || '',
            model: defaultModel,
            enabled: config.enabled,
            isLoading: false,
          })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '加载配置失败',
            isLoading: false,
          })
        }
      },

      saveConfig: async () => {
        const { provider, apiKey, baseURL, model, enabled } = get()
        set({ isSaving: true, error: null })
        try {
          await saveAiConfig({
            provider,
            apiKey,
            baseURL: baseURL || undefined,
            model,
            enabled,
          })
          set({ isSaving: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '保存失败',
            isSaving: false,
          })
          throw err
        }
      },

      validateApiKey: async () => {
        const { provider, apiKey, model, baseURL } = get()
        set({ isValidating: true, error: null })
        try {
          const isValid = await validateApiKey(provider, apiKey, model, baseURL || undefined)
          set({ isValidating: false })
          return isValid
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '验证失败',
            isValidating: false,
          })
          return false
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'ai-config-storage',
      partialize: (state: AiStoreState) => ({
        provider: state.provider,
        model: state.model,
        enabled: state.enabled,
        // Don't persist sensitive data like apiKey and baseURL
      }),
    }
  )
)
