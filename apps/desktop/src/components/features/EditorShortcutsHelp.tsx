import { Keyboard } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'

type EditorShortcutsHelpProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { keys: ['⌘', 'B'], description: '粗体' },
  { keys: ['⌘', 'I'], description: '斜体' },
  { keys: ['⌘', 'U'], description: '下划线' },
  { keys: ['⌘', 'Shift', 'S'], description: '删除线' },
  { keys: ['⌘', 'K'], description: '插入链接' },
  { keys: ['⌘', 'Shift', 'K'], description: '代码' },
  { keys: ['⌘', 'Shift', 'X'], description: '代码块' },
  { keys: ['⌘', 'Shift', '7'], description: '有序列表' },
  { keys: ['⌘', 'Shift', '8'], description: '无序列表' },
  { keys: ['⌘', 'Shift', '9'], description: '引用' },
  { keys: ['⌘', 'Shift', '1'], description: '标题 1' },
  { keys: ['⌘', 'Shift', '2'], description: '标题 2' },
  { keys: ['⌘', 'Shift', '3'], description: '标题 3' },
  { keys: ['/', ' '], description: '打开命令菜单' },
]

export const EditorShortcutsHelp = ({ open, onOpenChange }: EditorShortcutsHelpProps) => {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            编辑器快捷键
          </DialogTitle>
          <DialogDescription>常用格式化快捷键列表</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2">
          {shortcuts.map((shortcut, index) => (
            <div className="flex items-center justify-between rounded-lg border p-3" key={index}>
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" key={keyIndex}>
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-muted p-3">
          <p className="text-muted-foreground text-xs">
            💡 <strong className="text-foreground">提示：</strong>在空行输入{' '}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono text-xs">/</kbd> 或按{' '}
            <kbd className="rounded bg-background px-1 py-0.5 font-mono text-xs">Space</kbd>{' '}
            可打开命令菜单，快速插入各种元素。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
