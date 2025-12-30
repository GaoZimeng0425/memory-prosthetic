/**
 * Delete Confirm Dialog Component
 *
 * Confirmation dialog for deleting collections.
 */

import { AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@memory-prosthetic/ui/components/ui/alert'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import type { AutoCleanupDeleted } from '@/types/api'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  isPermanent?: boolean
  autoCleanupDeleted?: AutoCleanupDeleted
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  isPermanent = false,
}: DeleteConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const defaultDescription = isPermanent
    ? '此操作不可恢复，确定要永久删除吗？'
    : `内容将被移动到"最近删除"，可以随时恢复。`

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || (isPermanent ? '永久删除内容' : '删除内容')}</DialogTitle>
          <DialogDescription>{description || defaultDescription}</DialogDescription>
        </DialogHeader>

        {isPermanent && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>永久删除后，内容将无法恢复，包括所有关联的标签和向量嵌入。</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button
            className={isPermanent ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            onClick={handleConfirm}
            variant={isPermanent ? 'destructive' : 'default'}
          >
            {isPermanent ? '永久删除' : '删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
