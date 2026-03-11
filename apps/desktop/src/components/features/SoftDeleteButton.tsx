import { Trash2 } from 'lucide-react'

import { ContextMenuItem } from '@memory-prosthetic/ui/components/ui/context-menu'

type SoftDeleteButtonProps = {
  articleId: number
  onDelete: (id: number) => void
}

export const SoftDeleteButton = ({ articleId, onDelete }: SoftDeleteButtonProps) => {
  return (
    <ContextMenuItem className="text-destructive" onClick={() => onDelete(articleId)}>
      <Trash2 className="mr-2 h-4 w-4" />
      删除
    </ContextMenuItem>
  )
}
