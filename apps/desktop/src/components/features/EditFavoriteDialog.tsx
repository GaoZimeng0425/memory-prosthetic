/**
 * Edit Favorite Dialog
 *
 * Dialog for editing an existing favorite (folder).
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { Favorite } from '@memory-prosthetic/shared'
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

interface EditFavoriteDialogProps {
  favorite: Favorite | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditFavoriteDialog({ favorite, open, onOpenChange }: EditFavoriteDialogProps) {
  const [name, setName] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateFavorite, refresh } = useFavorites()

  useEffect(() => {
    if (favorite) {
      setName(favorite.name)
    }
  }, [favorite])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!favorite) return

    if (!name.trim()) {
      toast.error('请输入收藏夹名称')
      return
    }

    setIsUpdating(true)
    try {
      await updateFavorite(favorite.id, { name: name.trim() })
      setName('')
      onOpenChange(false)
      await refresh()
      toast.success('收藏夹已更新')
    } catch (error) {
      console.error('Failed to update favorite:', error)
      toast.error(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`)
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

  if (!favorite) return null

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑收藏夹</DialogTitle>
            <DialogDescription>修改收藏夹的名称</DialogDescription>
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
