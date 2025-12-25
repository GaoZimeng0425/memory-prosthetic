/**
 * Desktop App API Types
 *
 * Re-exports shared types and defines desktop-specific types.
 */

// Re-export shared types
// Alias for backward compatibility
export type {
  Collection,
  CollectionListItem,
  CollectionStats,
  CollectionWithStatus,
  CommandResult,
  SearchResultItem,
  SearchResultItem as SearchResult,
} from '@memory-prosthetic/shared'

// Desktop-specific settings types
export type Theme = 'light' | 'dark' | 'system'

export interface ShortcutConfig {
  useSuper: boolean
  useCtrl: boolean
  useShift: boolean
  useAlt: boolean
  key: string
}

export type AutoCleanupDeleted = 'disabled' | 'oneDay' | 'sevenDays' | 'thirtyDays'

export interface AppSettings {
  searchShortcut: ShortcutConfig
  serverPort: number
  autoStart: boolean
  theme: Theme
  autoCleanupDeleted?: AutoCleanupDeleted
}
