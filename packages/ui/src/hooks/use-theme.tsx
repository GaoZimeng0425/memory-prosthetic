'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeProviderProps {
  children: ReactNode
  /** Default theme if none is stored */
  defaultTheme?: Theme
  /** Storage key for persisting theme */
  storageKey?: string
  /** Custom storage adapter (defaults to localStorage) */
  storage?: {
    getItem: (key: string) => string | null | Promise<string | null>
    setItem: (key: string, value: string) => void | Promise<void>
  }
  /** Callback when theme changes (for syncing with backend) */
  onThemeChange?: (theme: Theme) => void | Promise<void>
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  themes: Theme[]
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyThemeToDOM(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  storage,
  onThemeChange,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (defaultTheme === 'system') {
      return typeof window !== 'undefined' ? getSystemTheme() : 'dark'
    }
    return defaultTheme
  })
  const [mounted, setMounted] = useState(false)

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storageAdapter = storage ?? {
          getItem: (key: string) => localStorage.getItem(key),
          setItem: (key: string, value: string) => localStorage.setItem(key, value),
        }

        const stored = await storageAdapter.getItem(storageKey)
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemeState(stored as Theme)
        }
      } catch (e) {
        console.warn('Failed to load theme from storage:', e)
      } finally {
        setMounted(true)
      }
    }

    void loadTheme()
  }, [storageKey, storage])

  // Update resolved theme and apply to DOM
  useEffect(() => {
    if (!mounted) return

    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    applyThemeToDOM(resolved)
  }, [theme, mounted])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const resolved = getSystemTheme()
      setResolvedTheme(resolved)
      applyThemeToDOM(resolved)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)

    // Persist to storage
    const storageAdapter = storage ?? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
    }

    void storageAdapter.setItem(storageKey, newTheme)

    // Notify callback
    if (onThemeChange) {
      void onThemeChange(newTheme)
    }
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        themes: ['light', 'dark', 'system'],
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Re-export types
export type { ThemeProviderProps, ThemeContextValue }
