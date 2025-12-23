export type Theme = 'light' | 'dark' | 'system'

export interface ShortcutConfig {
  useSuper: boolean
  useCtrl: boolean
  useShift: boolean
  useAlt: boolean
  key: string
}

export interface AppSettings {
  searchShortcut: ShortcutConfig
  serverPort: number
  autoStart: boolean
  theme: Theme
}

export function formatShortcut(config: ShortcutConfig): string {
  const parts: string[] = []

  // macOS style symbols
  if (config.useCtrl) parts.push('⌃')
  if (config.useSuper) parts.push('⌘')
  if (config.useAlt) parts.push('⌥')
  if (config.useShift) parts.push('⇧')

  parts.push(config.key)

  return parts.join('')
}
