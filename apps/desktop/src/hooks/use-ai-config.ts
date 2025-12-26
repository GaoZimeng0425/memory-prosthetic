/**
 * AI Configuration Hook
 *
 * Provides convenient access to AI store with computed values
 */

import { useEffect } from 'react'

import { useAiStore } from '@/store/ai-store'

export function useAiConfig() {
  const store = useAiStore()

  // Load config on mount
  useEffect(() => {
    void store.loadConfig()
  }, [store.loadConfig])

  return {
    // State
    provider: store.provider,
    apiKey: store.apiKey,
    baseURL: store.baseURL,
    model: store.model,
    enabled: store.enabled,
    isLoading: store.isLoading,
    error: store.error,
    isValidating: store.isValidating,
    isSaving: store.isSaving,

    // Computed
    isConfigured: Boolean(store.apiKey && store.provider),
    canValidate: Boolean(store.apiKey && store.model),
    canSave: Boolean(store.apiKey),

    // Actions
    setProvider: store.setProvider,
    setApiKey: store.setApiKey,
    setBaseURL: store.setBaseURL,
    setModel: store.setModel,
    setEnabled: store.setEnabled,
    loadConfig: store.loadConfig,
    saveConfig: store.saveConfig,
    validateApiKey: store.validateApiKey,
    reset: store.reset,
  }
}
