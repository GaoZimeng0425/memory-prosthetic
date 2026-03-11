import type { CollectionListItem } from '@/types/api'
import { useState } from 'react'
import { ArticleListItem } from './ArticleListItem'
import { SelectFavoriteDialog } from '@/components/features/SelectFavoriteDialog'
import { CreateFavoriteDialog } from '@/components/features/CreateFavoriteDialog'
import { TagDialogWrapper } from '@/routes/__root'
import type { ArticleGroup } from './utils'

interface ArticleGroupSectionProps {
  group: ArticleGroup<CollectionListItem>
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onPermanentDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onArchive?: (id: number) => void
}

export function ArticleGroupSection({
  group,
  selectedId,
  onSelect,
  onDelete,
  onPermanentDelete,
  onOpenUrl,
  onToggleStar,
  onArchive,
}: ArticleGroupSectionProps) {
  // Dialog states managed at section level (not per item)
  const [tagDialogCollectionId, setTagDialogCollectionId] = useState<number | null>(null)
  const [favoriteDialogCollectionId, setFavoriteDialogCollectionId] = useState<number | null>(null)
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)

  const handleCloseTagDialog = () => {
    setTagDialogCollectionId(null)
  }

  const handleCloseFavoriteDialog = () => {
    setFavoriteDialogCollectionId(null)
  }

  return (
    <>
      <div className="mb-4">
        {/* Group Header */}
        <div className="mb-2 flex items-center gap-2 px-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{group.label}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
            {group.items.length}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-2 divide-y divide-border pb-2">
          {group.items.map((item) => (
            <ArticleListItem
              isSelected={selectedId === item.id}
              item={item}
              key={item.id}
              onArchive={onArchive}
              onDelete={onDelete}
              onPermanentDelete={onPermanentDelete}
              onOpenUrl={onOpenUrl}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              onManageTags={setTagDialogCollectionId}
              onSelectFavorite={setFavoriteDialogCollectionId}
            />
          ))}
        </div>
      </div>

      {/* Tag Dialog - rendered once for the section */}
      {tagDialogCollectionId !== null && (
        <TagDialogWrapper collectionId={tagDialogCollectionId} onClose={handleCloseTagDialog} />
      )}

      {/* Favorite Dialog - rendered once for the section */}
      {favoriteDialogCollectionId !== null && (
        <SelectFavoriteDialog
          collectionId={favoriteDialogCollectionId}
          onCreateNew={() => setIsCreateFavoriteOpen(true)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseFavoriteDialog()
            }
          }}
          open={true}
        />
      )}

      {/* Create Favorite Dialog */}
      <CreateFavoriteDialog
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateFavoriteOpen(false)
          }
        }}
        open={isCreateFavoriteOpen}
      />
    </>
  )
}
