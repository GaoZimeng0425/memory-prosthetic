import { useEffect, useState } from 'react'
import { FilePlus } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'

const STORAGE_KEY = 'note-creation-tip-dismissed'

export function NoteCreationTip() {
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
            <FilePlus className="h-5 w-5" />
            欢迎使用笔记功能
          </DialogTitle>
          <DialogDescription>快速了解如何创建笔记</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">创建笔记的方式：</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  点击主界面左侧的<strong className="text-foreground">"新建笔记"</strong>按钮
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  在搜索界面点击底部的<strong className="text-foreground">"新建笔记"</strong>按钮
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  使用快捷键<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">⌘N</kbd>
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-muted-foreground text-sm">
              💡 <strong className="text-foreground">提示：</strong>
              笔记支持富文本编辑，您可以格式化文本、添加标题、列表等。 完整的编辑器功能将在后续版本中提供。
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
