/**
 * Create Tag Dialog
 *
 * Dialog for creating a new tag.
 */

import { useState } from 'react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { Label } from '@memory-prosthetic/ui/components/ui/label'
import { useTags } from '@/hooks/use-tags'

interface CreateTagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTagDialog({ open, onOpenChange }: CreateTagDialogProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { createTag, refresh } = useTags()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('请输入标签名称')
      return
    }

    setIsCreating(true)
    try {
      await createTag({ name: name.trim() })
      setName('')
      onOpenChange(false)
      await refresh()
    } catch (error) {
      console.error('Failed to create tag:', error)
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>创建标签</DialogTitle>
            <DialogDescription>创建一个新标签来分类您的内容</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="tag-name">名称</Label>
            <Input
              autoFocus
              id="tag-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：React、前端、学习"
              value={name}
            />
          </div>

          <DialogFooter>
            <Button disabled={isCreating} onClick={() => handleOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isCreating || !name.trim()} type="submit">
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
