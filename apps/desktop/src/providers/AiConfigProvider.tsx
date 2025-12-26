/**
 * AI Configuration Provider
 *
 * Provides AI configuration context to the application
 */

import { createContext, type ReactNode, useContext } from 'react'

import { useAiConfig } from '@/hooks/use-ai-config'

export type AiConfigContextValue = ReturnType<typeof useAiConfig>

const AiConfigContext = createContext<AiConfigContextValue | null>(null)

export interface AiConfigProviderProps {
  children: ReactNode
}

export function AiConfigProvider({ children }: AiConfigProviderProps) {
  const config = useAiConfig()

  return <AiConfigContext.Provider value={config}>{children}</AiConfigContext.Provider>
}

export function useAiConfigContext(): AiConfigContextValue {
  const context = useContext(AiConfigContext)
  if (!context) {
    throw new Error('useAiConfigContext must be used within AiConfigProvider')
  }
  return context
}
