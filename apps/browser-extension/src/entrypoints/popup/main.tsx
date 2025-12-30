import React from 'react'
import ReactDOM from 'react-dom/client'

import { QueryProvider } from '@memory-prosthetic/shared/request'
import { ThemeProvider } from '@memory-prosthetic/ui/hooks/use-theme'
import App from './App.tsx'

import './style.css'

// Browser extension storage adapter using browser.storage API
// browser is globally available in WXT extensions
const browserStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const result = await browser.storage.local.get(key)
      const value = result[key]
      return typeof value === 'string' ? value : null
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await browser.storage.local.set({ [key]: value })
    } catch (e) {
      console.error('Failed to save to browser storage:', e)
    }
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider defaultTheme="dark" storageAdapter={browserStorage} storageKey="mp-theme">
        <App />
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
)
