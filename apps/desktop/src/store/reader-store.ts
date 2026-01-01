/**
 * Reader Settings Store
 *
 * Manages reader appearance and layout settings using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReaderBackgroundColor = 'snow' | 'latte' | 'mint' | 'sky'

export type ReaderLayout = 'narrow-left' | 'narrow-center' | 'wide' | 'full-width'

export type ReaderStoreState = {
  // Appearance
  backgroundColor: ReaderBackgroundColor
  backgroundColorClassName: string
  fontSize: number
  fontFamily: string

  // Layout
  layout: ReaderLayout

  // Actions
  setBackgroundColor: (color: ReaderBackgroundColor) => void
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
}[] = [
  { value: 'snow', label: '白雪', className: 'bg-white' },
  { value: 'latte', label: '拿铁', className: 'bg-amber-50' },
  { value: 'mint', label: '薄荷', className: 'bg-green-50' },
  { value: 'sky', label: '晴空', className: 'bg-blue-50' },
]

const initialState: Omit<
  ReaderStoreState,
  | 'setBackgroundColor'
  | 'setFontSize'
  | 'increaseFontSize'
  | 'decreaseFontSize'
  | 'setFontFamily'
  | 'setLayout'
  | 'reset'
> = {
  backgroundColorClassName: BACKGROUND_COLOR_OPTIONS.find((option) => option.value === 'snow')?.className || '',
  backgroundColor: 'snow',
  fontSize: DEFAULT_FONT_SIZE,
  fontFamily: 'Helvetica',
  layout: 'narrow-center',
}

export const useReaderStore = create<ReaderStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBackgroundColor: (color: ReaderBackgroundColor) => {
        set({
          backgroundColor: color,
          backgroundColorClassName: BACKGROUND_COLOR_OPTIONS.find((option) => option.value === color)?.className,
        })
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
