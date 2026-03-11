import type { CollectionListItem } from '@memory-prosthetic/shared'
import { ArticleList } from '@/components/article-list'
import { ArticleReader } from '@/components/article-reader'
import { DeleteConfirmDialog } from '@/components/features/DeleteConfirmDialog'
import type { Collection } from '@/types/api'

type FilterHint = {
  type: 'favorite' | 'tag' | 'archived' | 'deleted'
  label: string
  count: number
  onClear?: () => void
}

type ArticlesLayoutProps = {
  // Article List props
  collections: CollectionListItem[]
  selectedId: number | null
  filterHint?: FilterHint
  isLoading: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onArchive?: (id: number) => void

  // Article Reader props
  article: Collection | null
  isArticleLoading: boolean
  isReaderMaximized: boolean
  onToggleMaximize: () => void
  onSetFavorite: (id: number, favoriteId: number | null) => void
  onPermanentDelete: (id: number) => void
  onRestore?: (id: number) => void

  // Delete Dialog props
  deleteDialogState: {
    open: boolean
    id: number | null
    isPermanent: boolean
  }
  onConfirmDelete: () => void
  onCloseDeleteDialog: () => void
}

export function ArticlesLayout({
  collections,
  selectedId,
  filterHint,
  isLoading,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
  onArchive,
  article,
  isArticleLoading,
  isReaderMaximized,
  onToggleMaximize,
  onSetFavorite,
  onPermanentDelete,
  onRestore,
  deleteDialogState,
  onConfirmDelete,
  onCloseDeleteDialog,
}: ArticlesLayoutProps) {
  return (
    <>
      {/* Article List */}
      <ArticleList
        className="shrink-0 pt-4"
        collections={collections}
        filterHint={filterHint}
        isLoading={isLoading}
        onArchive={onArchive}
        onDelete={onDelete}
        onPermanentDelete={onPermanentDelete}
        onOpenUrl={onOpenUrl}
        onSelect={onSelect}
        onToggleStar={onToggleStar}
        selectedId={selectedId}
      />

      {/* Article Reader */}
      <ArticleReader
        article={article ?? null}
        className="shrink-0 grow pt-4"
        isLoading={isArticleLoading}
        isMaximized={isReaderMaximized}
        onArchive={onArchive}
        onDelete={onDelete}
        onOpenUrl={onOpenUrl}
        onPermanentDelete={onPermanentDelete}
        onRestore={onRestore}
        onSetFavorite={onSetFavorite}
        onToggleMaximize={onToggleMaximize}
        onToggleStar={onToggleStar}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isPermanent={deleteDialogState.isPermanent}
        onConfirm={onConfirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            onCloseDeleteDialog()
          }
        }}
        open={deleteDialogState.open}
      />
    </>
  )
}
