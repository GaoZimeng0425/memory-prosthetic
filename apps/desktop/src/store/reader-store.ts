/**
 * Reader Settings Store
 *
 * Manages reader appearance and layout settings using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReaderBackgroundColor = 'snow' | 'latte' | 'mint' | 'sky' | 'graphite' | 'obsidian' | 'glacier' | 'stardust'

export type ReaderLayout = 'narrow-left' | 'narrow-center' | 'wide' | 'full-width'

export type ReaderStoreState = {
  // Appearance
  lightBackgroundColor: ReaderBackgroundColor
  darkBackgroundColor: ReaderBackgroundColor
  fontSize: number
  fontFamily: string

  // Layout
  layout: ReaderLayout

  // Actions
  setBackgroundColor: (color: ReaderBackgroundColor, theme: 'light' | 'dark') => void
  getBackgroundColorClassName: (theme: 'light' | 'dark') => string
  setFontSize: (size: number) => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  setFontFamily: (font: string) => void
  setLayout: (layout: ReaderLayout) => void
  reset: () => void
}

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24
const DEFAULT_FONT_SIZE = 16

export const BACKGROUND_COLOR_OPTIONS: {
  value: ReaderBackgroundColor
  label: string
  className: string
  theme: 'light' | 'dark'
}[] = [
  { value: 'snow', label: '白雪', className: 'bg-white', theme: 'light' },
  { value: 'latte', label: '拿铁', className: 'bg-amber-50', theme: 'light' },
  { value: 'mint', label: '薄荷', className: 'bg-green-50', theme: 'light' },
  { value: 'sky', label: '晴空', className: 'bg-blue-50', theme: 'light' },
  { value: 'graphite', label: '石墨', className: 'bg-zinc-900', theme: 'dark' },
  { value: 'obsidian', label: '黑曜', className: 'bg-black', theme: 'dark' },
  { value: 'glacier', label: '冰川', className: 'bg-slate-900', theme: 'dark' },
  { value: 'stardust', label: '星河', className: 'bg-purple-950', theme: 'dark' },
]

const initialState: Omit<
  ReaderStoreState,
  | 'setBackgroundColor'
  | 'getBackgroundColorClassName'
  | 'setFontSize'
  | 'increaseFontSize'
  | 'decreaseFontSize'
  | 'setFontFamily'
  | 'setLayout'
  | 'reset'
> = {
  lightBackgroundColor: 'snow',
  darkBackgroundColor: 'graphite',
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: 'Helvetica',
  layout: 'narrow-center',
}

export const useReaderStore = create<ReaderStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBackgroundColor: (color: ReaderBackgroundColor, theme: 'light' | 'dark') => {
        if (theme === 'light') {
          set({ lightBackgroundColor: color })
        } else {
          set({ darkBackgroundColor: color })
        }
      },

      getBackgroundColorClassName: (theme: 'light' | 'dark') => {
        const { lightBackgroundColor, darkBackgroundColor } = get()
        const backgroundColor = theme === 'light' ? lightBackgroundColor : darkBackgroundColor
        return BACKGROUND_COLOR_OPTIONS.find((option) => option.value === backgroundColor)?.className || ''
      },

      setFontSize: (size: number) => {
        const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size))
        set({ fontSize: clampedSize })
      },

      increaseFontSize: () => {
        const { fontSize } = get()
        const newSize = Math.min(MAX_FONT_SIZE, fontSize + 2)
        set({ fontSize: newSize })
      },

      decreaseFontSize: () => {
        const { fontSize } = get()
        const newSize = Math.max(MIN_FONT_SIZE, fontSize - 2)
        set({ fontSize: newSize })
      },

      setFontFamily: (font: string) => {
        set({ fontFamily: font })
      },

      setLayout: (layout: ReaderLayout) => {
        set({ layout })
      },

      reset: () => set(initialState),
    }),
    {
      name: 'reader-settings-storage',
    }
  )
)
