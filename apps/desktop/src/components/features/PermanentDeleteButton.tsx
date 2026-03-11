import { Trash } from 'lucide-react'

import { ContextMenuItem } from '@memory-prosthetic/ui/components/ui/context-menu'

type PermanentDeleteButtonProps = {
  articleId: number
  onPermanentDelete: (id: number) => void
}

export const PermanentDeleteButton = ({ articleId, onPermanentDelete }: PermanentDeleteButtonProps) => {
  return (
    <ContextMenuItem className="text-destructive" onClick={() => onPermanentDelete(articleId)}>
      <Trash className="mr-2 h-4 w-4" />
      永久删除
    </ContextMenuItem>
  )
}
