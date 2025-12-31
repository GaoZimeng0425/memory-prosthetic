/**
 * Create Favorite Dialog
 *
 * Dialog for creating a new favorite (folder).
 */

import { useState } from 'react'
import { toast } from 'sonner'

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
import { useFavorites } from '@/hooks/use-favorites'

interface CreateFavoriteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateFavoriteDialog({ open, onOpenChange }: CreateFavoriteDialogProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { createFavorite, refresh } = useFavorites()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('请输入收藏夹名称')
      return
    }

    setIsCreating(true)
    try {
      await createFavorite({ name: name.trim() })
      setName('')
      onOpenChange(false)
      await refresh()
      toast.success('收藏夹已创建')
    } catch (error) {
      console.error('Failed to create favorite:', error)
      toast.error(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
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
            <DialogTitle>创建收藏夹</DialogTitle>
            <DialogDescription>创建一个新的收藏夹来组织您的内容</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="favorite-name">名称</Label>
            <Input
              autoFocus
              id="favorite-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：工作、学习、兴趣"
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
