import type { CollectionListItem } from '@/types/api'
import { ArticleListItem } from './ArticleListItem'
import type { ArticleGroup } from './utils'

interface ArticleGroupSectionProps {
  group: ArticleGroup<CollectionListItem>
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onOpenUrl: (url: string) => void
  onToggleStar?: (id: number) => void
  onManageTags?: (id: number) => void
  onSetFavorite?: (id: number, favoriteId: number | null) => void
  onOpenFavoriteDialog?: (id: number) => void
  onArchive?: (id: number) => void
}

export function ArticleGroupSection({
  group,
  selectedId,
  onSelect,
  onDelete,
  onOpenUrl,
  onToggleStar,
  onManageTags,
  onSetFavorite,
  onOpenFavoriteDialog,
  onArchive,
}: ArticleGroupSectionProps) {
  return (
    <div className="mb-4">
      {/* Group Header */}
      <div className="mb-2 flex items-center gap-2 px-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{group.label}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
          {group.items.length}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {group.items.map((item) => (
          <ArticleListItem
            isSelected={selectedId === item.id}
            item={item}
            key={item.id}
            onArchive={onArchive}
            onDelete={onDelete}
            onManageTags={onManageTags}
            onOpenFavoriteDialog={onOpenFavoriteDialog}
            onOpenUrl={onOpenUrl}
            onSelect={onSelect}
            onSetFavorite={onSetFavorite}
            onToggleStar={onToggleStar}
          />
        ))}
      </div>
    </div>
  )
}
