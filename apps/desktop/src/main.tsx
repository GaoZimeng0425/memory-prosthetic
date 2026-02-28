import React, { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import ReactDOM from 'react-dom/client'

import { getQueryClient, QueryProvider } from '@memory-prosthetic/shared/request'
import { Toaster } from '@memory-prosthetic/ui/components/ui/sonner'
import { TooltipProvider } from '@memory-prosthetic/ui/components/ui/tooltip'
import { type Theme, ThemeProvider } from '@memory-prosthetic/ui/hooks/use-theme'
import { ErrorPage } from '@/components/pages/ErrorPage'
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

// Main App component with error handling
function App() {
  const [startupError, setStartupError] = useState<{
    title: string
    message: string
    details?: string
  } | null>(null)

  useEffect(() => {
    // Listen for startup errors from backend
    let unlistenFn: (() => void) | null = null

    const setupErrorListener = async () => {
      try {
        const unlisten = await listen<{
          title: string
          message: string
          details?: string
        }>('startup:error', (event) => {
          console.error('[App] Startup error received:', event.payload)
          setStartupError(event.payload)
        })
        unlistenFn = unlisten
      } catch (error) {
        console.error('[App] Failed to setup error listener:', error)
      }
    }

    void setupErrorListener()

    // Cleanup on unmount
    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [])

  // Show error page if startup error occurred
  if (startupError) {
    return (
      <ErrorPage
        details={startupError.details}
        message={startupError.message}
        onRetry={() => {
          setStartupError(null)
          window.location.reload()
        }}
        title={startupError.title}
      />
    )
  }

  // Normal app rendering
  return (
    <QueryProvider>
      <TooltipProvider delayDuration={200}>
        <ThemeProvider
          defaultTheme="dark"
          onThemeChange={handleThemeChange}
          storageAdapter={tauriStorage}
          storageKey="theme"
        >
          <AiConfigProvider>
            <AppRouterProvider queryClient={getQueryClient()} />
            <Toaster />
          </AiConfigProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
