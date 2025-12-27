import React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { emit } from '@tauri-apps/api/event'
import ReactDOM from 'react-dom/client'

import { getQueryClient, QueryProvider } from '@memory-prosthetic/shared/request'
import { Toaster } from '@memory-prosthetic/ui/components/ui/sonner'
import { type Theme, ThemeProvider } from '@memory-prosthetic/ui/hooks/use-theme'
import { AppRouterProvider } from '@/lib/router'
import { AiConfigProvider } from '@/providers/AiConfigProvider'
import type { AppSettings, CommandResult } from './types/api'
import '@/styles/index.css'

// Tauri storage adapter - syncs theme with Rust backend
const tauriStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (key !== 'theme') return null
    try {
      const result = await invoke<CommandResult<AppSettings>>('get_settings')
      return result.data.theme
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (key !== 'theme') return
    try {
      await invoke<CommandResult<Theme>>('update_theme', { theme: value })
    } catch (e) {
      console.error('Failed to save theme:', e)
    }
  },
}

// Broadcast theme change to all windows
const handleThemeChange = async (theme: Theme) => {
  await emit('theme-changed', theme)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider defaultTheme="dark" onThemeChange={handleThemeChange} storage={tauriStorage} storageKey="theme">
        <AiConfigProvider>
          <AppRouterProvider queryClient={getQueryClient()} />
          <Toaster />
        </AiConfigProvider>
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
)
