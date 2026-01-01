import { FileText } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@memory-prosthetic/ui/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@memory-prosthetic/ui/components/ui/select'
import { Separator } from '@memory-prosthetic/ui/components/ui/separator'
import { Slider } from '@memory-prosthetic/ui/components/ui/slider'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import type { ReaderLayout } from '@/store/reader-store'
import { BACKGROUND_COLOR_OPTIONS, useReaderStore } from '@/store/reader-store'

const LAYOUT_OPTIONS: {
  value: ReaderLayout
  icon: React.ReactNode
  label: string
}[] = [
  {
    value: 'narrow-left',
    icon: (
      <div className="flex items-center gap-1">
        <div className="h-3 w-8 bg-foreground/20" />
        <div className="h-3 w-2 bg-foreground/10" />
      </div>
    ),
    label: '窄屏左对齐',
  },
  {
    value: 'narrow-center',
    icon: (
      <div className="flex items-center justify-center gap-1">
        <div className="h-3 w-2 bg-foreground/10" />
        <div className="h-3 w-8 bg-foreground/20" />
        <div className="h-3 w-2 bg-foreground/10" />
      </div>
    ),
    label: '窄屏居中',
  },
  {
    value: 'wide',
    icon: (
      <div className="flex items-center gap-1">
        <div className="h-3 w-12 bg-foreground/20" />
      </div>
    ),
    label: '宽屏',
  },
  {
    value: 'full-width',
    icon: (
      <div className="flex items-center gap-1">
        <div className="h-3 w-full bg-foreground/20" />
      </div>
    ),
    label: '全宽',
  },
]

const FONT_FAMILIES = ['Helvetica', 'Georgia', 'Times New Roman', 'Arial', 'Inter', 'System']

type ReaderSettingsProps = {
  trigger: React.ReactNode
}

export const ReaderSettings = ({ trigger }: ReaderSettingsProps) => {
  const {
    backgroundColor,
    fontSize,
    fontFamily,
    layout,
    setBackgroundColor,
    increaseFontSize,
    decreaseFontSize,
    setFontSize,
    setFontFamily,
    setLayout,
  } = useReaderStore()

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4">
          <h3 className="mb-4 font-semibold text-sm">阅读器设置</h3>

          {/* Background Color Section */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">阅读器背景色</span>
              <span className="text-muted-foreground text-xs">推荐全屏模式使用</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUND_COLOR_OPTIONS.map((color) => (
                <button
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-md border-2 border-border/20 p-2 transition-colors',
                    color.className,
                    backgroundColor === color.value ? 'border-foreground' : 'border-border/20 hover:border-border'
                  )}
                  key={color.value}
                  onClick={() => setBackgroundColor(color.value)}
                  type="button"
                >
                  <div className={cn('flex h-12 w-full items-center justify-center')}>
                    <FileText className="h-6 w-6 text-foreground/30" />
                  </div>
                  <span className="text-foreground text-xs">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Layout Section */}
          <div className="mb-6">
            <div className="mb-2">
              <span className="text-muted-foreground text-xs">内容布局</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {LAYOUT_OPTIONS.map((option) => (
                <button
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-md border-2 p-2 transition-colors',
                    layout === option.value ? 'border-foreground bg-accent' : 'border-transparent hover:border-border'
                  )}
                  key={option.value}
                  onClick={() => setLayout(option.value)}
                  title={option.label}
                  type="button"
                >
                  {option.icon}
                </button>
              ))}
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Font Size Section */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">字体大小</span>
              <span className="text-foreground text-xs">{fontSize}px</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                aria-label="减小字体"
                className="h-8 w-8 p-0"
                onClick={decreaseFontSize}
                size="sm"
                variant="outline"
              >
                A-
              </Button>
              <Slider
                className="flex-1"
                max={24}
                min={12}
                onValueChange={(values) => setFontSize(values[0])}
                step={1}
                value={[fontSize]}
              />
              <Button
                aria-label="增大字体"
                className="h-8 w-8 p-0"
                onClick={increaseFontSize}
                size="sm"
                variant="outline"
              >
                A+
              </Button>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Font Family Section */}
          <div>
            <div className="mb-2">
              <span className="text-muted-foreground text-xs">阅读器字体</span>
            </div>
            <Select onValueChange={setFontFamily} value={fontFamily}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
