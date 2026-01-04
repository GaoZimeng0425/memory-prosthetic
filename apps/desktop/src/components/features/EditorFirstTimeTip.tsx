import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'

const STORAGE_KEY = 'editor-first-time-tip-dismissed'

export function EditorFirstTimeTip() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if tip has been dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setIsOpen(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            欢迎使用富文本编辑器
          </DialogTitle>
          <DialogDescription>了解编辑器的基本功能</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">编辑器功能：</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <strong className="text-foreground">格式化工具栏：</strong>
                  选中文本后，浮动工具栏会自动出现，提供格式化选项
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <strong className="text-foreground">快捷键：</strong>使用{' '}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘?</kbd>{' '}
                  查看所有快捷键，或点击工具栏中的帮助按钮
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <strong className="text-foreground">命令菜单：</strong>在空行输入{' '}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/</kbd> 或按{' '}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Space</kbd> 打开命令菜单
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <strong className="text-foreground">Markdown 支持：</strong>支持 Markdown 语法自动格式化（如{' '}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">#</kbd> 标题、
                  <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">*</kbd> 列表等）
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-muted-foreground text-sm">
              💡 <strong className="text-foreground">提示：</strong>
              编辑器支持标题、粗体、斜体、列表、代码块、表格、链接等丰富的格式化功能。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button onClick={handleDismiss} variant="ghost">
            不再显示
          </Button>
          <Button onClick={handleDismiss}>知道了</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
