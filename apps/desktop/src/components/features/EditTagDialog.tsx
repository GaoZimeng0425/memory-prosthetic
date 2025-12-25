/**
 * Edit Tag Dialog
 *
 * Dialog for editing an existing tag.
 */

import { useEffect, useState } from 'react'

import type { Tag } from '@memory-prosthetic/shared'
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

interface EditTagDialogProps {
  tag: Tag | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTagDialog({ tag, open, onOpenChange }: EditTagDialogProps) {
  const [name, setName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateTag, refresh } = useTags()

  useEffect(() => {
    if (tag) {
      setName(tag.name)
    }
  }, [tag])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tag) return

    if (!name.trim()) {
      alert('请输入标签名称')
      return
    }

    setIsUpdating(true)
    try {
      await updateTag(tag.id, { name: name.trim() })
      setName('')
      onOpenChange(false)
      await refresh()
    } catch (error) {
      console.error('Failed to update tag:', error)
      alert(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
    }
    onOpenChange(newOpen)
  }

  if (!tag) return null

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>修改标签的名称</DialogDescription>
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
            <Button disabled={isUpdating} onClick={() => handleOpenChange(false)} type="button" variant="outline">
              取消
            </Button>
            <Button disabled={isUpdating || !name.trim()} type="submit">
              {isUpdating ? '更新中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
