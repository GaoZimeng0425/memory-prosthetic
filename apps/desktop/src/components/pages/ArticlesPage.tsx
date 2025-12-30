import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'

import { isWithinDays } from '@memory-prosthetic/shared/utils/date'
import { collections as collectionsApi } from '@/apis'
import { ArticlesLayout } from '@/components/layouts/ArticlesLayout'
import { useAppNavigation } from '@/hooks/use-app-navigation'
import { useCollections } from '@/hooks/use-collections'
import { useFavorites } from '@/hooks/use-favorites'
import { useTags } from '@/hooks/use-tags'

export function ArticlesPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const { getActiveNav, navigateToAll } = useAppNavigation()

  // Extract route params - single source of truth
  const activeNav = getActiveNav()
  const activeFavoriteId = params.favoriteId ? Number(params.favoriteId) : null
  const activeTagId = params.tagId ? Number(params.tagId) : null
  const articleId = params.articleId ? Number(params.articleId) : null

  // Article state - loaded from route params
  const [isReaderMaximized, setIsReaderMaximized] = useState(false)
  // Delete dialog state
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean
    id: number | null
    isPermanent: boolean
  }>({
    open: false,
    id: null,
    isPermanent: false,
  })

  // Load article when route params change using React Query
  const { data: selectedArticle, isLoading: isArticleLoading } = useQuery({
    ...collectionsApi.queries.detail(articleId ?? 0),
    enabled: articleId !== null && articleId > 0,
  })
  // Build article route path based on current context
  const getArticleRoute = useCallback(
    (id: number) => {
      if (activeNav === 'starred') {
        return { to: '/starred/article/$articleId' as const, params: { articleId: String(id) } }
      }
      if (activeNav === 'recent') {
        return { to: '/recent/article/$articleId' as const, params: { articleId: String(id) } }
      }
      if (activeNav === 'archived') {
        return { to: '/archived/article/$articleId' as const, params: { articleId: String(id) } }
      }
      if (activeNav === 'deleted') {
        return { to: '/deleted/article/$articleId' as const, params: { articleId: String(id) } }
      }
      if (activeNav === 'favorite' && activeFavoriteId !== null) {
        return {
          to: '/favorite/$favoriteId/article/$articleId' as const,
          params: { favoriteId: String(activeFavoriteId), articleId: String(id) },
        }
      }
      if (activeNav === 'tag' && activeTagId !== null) {
        return {
          to: '/tag/$tagId/article/$articleId' as const,
          params: { tagId: String(activeTagId), articleId: String(id) },
        }
      }
      return { to: '/all/article/$articleId' as const, params: { articleId: String(id) }, resetScroll: false }
    },
    [activeNav, activeFavoriteId, activeTagId]
  )

  // Build parent route path (for navigation back)
  const getParentRoute = useCallback(() => {
    if (activeNav === 'starred') {
      return { to: '/starred' as const }
    }
    if (activeNav === 'recent') {
      return { to: '/recent' as const }
    }
    if (activeNav === 'archived') {
      return { to: '/archived' as const }
    }
    if (activeNav === 'deleted') {
      return { to: '/deleted' as const }
    }
    if (activeNav === 'favorite' && activeFavoriteId !== null) {
      return { to: '/favorite/$favoriteId' as const, params: { favoriteId: String(activeFavoriteId) } }
    }
    if (activeNav === 'tag' && activeTagId !== null) {
      return { to: '/tag/$tagId' as const, params: { tagId: String(activeTagId) } }
    }
    return { to: '/all' as const }
  }, [activeNav, activeFavoriteId, activeTagId])

  // Handle article selection - only navigates, data loading is handled by useEffect
  const handleSelectArticle = useCallback(
    (id: number) => {
      void navigate(getArticleRoute(id))
    },
    [navigate, getArticleRoute]
  )

  // Collections data - filter by favorite, tags, or status if active
  const collectionParams = useMemo(() => {
    if (activeNav === 'favorite' && activeFavoriteId !== null) {
      return { favoriteId: activeFavoriteId, status: 'active' as const }
    }
    if (activeNav === 'tag' && activeTagId !== null) {
      return { tagIds: [activeTagId], status: 'active' as const }
    }
    if (activeNav === 'archived') {
      return { status: 'archived' as const }
    }
    if (activeNav === 'deleted') {
      return { status: 'deleted' as const }
    }
    if (activeNav === 'starred' || activeNav === 'recent' || activeNav === 'all') {
      return { status: 'active' as const }
    }
    return { status: 'active' as const }
  }, [activeNav, activeFavoriteId, activeTagId])

  const {
    collections,
    isLoading: collectionsLoading,
    archive,
    restore,
    setFavorite,
    toggleStar,
    delete: deleteCollection,
    permanentlyDelete,
  } = useCollections(collectionParams)
  const { favorites } = useFavorites()
  const { tags } = useTags()

  // Filter collections based on activeNav
  const filteredCollections = useMemo(() => {
    switch (activeNav) {
      case 'starred':
        return collections.filter((c) => c.starred)
      case 'recent':
        return collections.filter((c) => isWithinDays(c.createdAt, 7))
      default:
        return collections
    }
  }, [collections, activeNav])

  // Calculate filter hint
  const filterHint = useMemo(() => {
    if (activeNav === 'favorite' && activeFavoriteId !== null) {
      const favorite = favorites.find((f) => f.id === activeFavoriteId)
      return {
        type: 'favorite' as const,
        label: favorite ? `收藏夹: ${favorite.name}` : '收藏夹',
        count: filteredCollections.length,
        onClear: () => {
          navigateToAll()
        },
      }
    }
    if (activeNav === 'tag' && activeTagId !== null) {
      const tag = tags.find((t) => t.id === activeTagId)
      return {
        type: 'tag' as const,
        label: tag ? `标签: #${tag.name}` : '标签',
        count: filteredCollections.length,
        onClear: () => {
          navigateToAll()
        },
      }
    }
    if (activeNav === 'archived') {
      return {
        type: 'archived' as const,
        label: '已归档',
        count: filteredCollections.length,
        onClear: () => {
          navigateToAll()
        },
      }
    }
    if (activeNav === 'deleted') {
      return {
        type: 'deleted' as const,
        label: '最近删除',
        count: filteredCollections.length,
        onClear: () => {
          navigateToAll()
        },
      }
    }
    return null
  }, [activeNav, activeFavoriteId, activeTagId, favorites, tags, filteredCollections.length, navigateToAll])

  // Handlers
  const handleArchive = useCallback(
    async (id: number) => {
      try {
        await archive(id)
      } catch (error) {
        console.error('Failed to archive:', error)
      }
    },
    [archive]
  )

  const handleDelete = useCallback((id: number) => {
    setDeleteDialogState({
      open: true,
      id,
      isPermanent: false,
    })
  }, [])

  const handleOpenUrl = useCallback((url: string) => {
    void openUrl(url)
  }, [])

  const handleSetFavorite = useCallback(
    async (id: number, favoriteId: number | null) => {
      try {
        await setFavorite(id, favoriteId)
      } catch (error) {
        console.error('Failed to set favorite:', error)
      }
    },
    [setFavorite]
  )

  const handleToggleStar = useCallback(
    async (id: number) => {
      try {
        await toggleStar(id)
      } catch (error) {
        console.error('Failed to toggle star:', error)
      }
    },
    [toggleStar]
  )

  const handlePermanentDelete = useCallback((id: number) => {
    setDeleteDialogState({
      open: true,
      id,
      isPermanent: true,
    })
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (deleteDialogState.id === null) return

    const deletedId = deleteDialogState.id

    try {
      if (deleteDialogState.isPermanent) {
        await permanentlyDelete(deletedId)
        toast.success('已永久删除')
      } else {
        await deleteCollection(deletedId)
        toast.success('已删除')
      }

      // Navigate back if the deleted article is currently being viewed
      if (articleId === deletedId) {
        void navigate(getParentRoute())
      }

      setDeleteDialogState({ open: false, id: null, isPermanent: false })
    } catch (error) {
      console.error('Failed to delete collection:', error)
      toast.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [deleteDialogState, deleteCollection, permanentlyDelete, articleId, navigate, getParentRoute])

  const handleRestore = useCallback(
    async (id: number) => {
      try {
        await restore(id)
      } catch (error) {
        console.error('Failed to restore:', error)
      }
    },
    [restore]
  )

  return (
    <ArticlesLayout
      article={selectedArticle ?? null}
      collections={filteredCollections}
      deleteDialogState={deleteDialogState}
      filterHint={filterHint ?? undefined}
      isArticleLoading={isArticleLoading}
      isLoading={collectionsLoading}
      isReaderMaximized={isReaderMaximized}
      onArchive={handleArchive}
      onCloseDeleteDialog={() => {
        setDeleteDialogState({ open: false, id: null, isPermanent: false })
      }}
      onConfirmDelete={handleConfirmDelete}
      onDelete={handleDelete}
      onOpenUrl={handleOpenUrl}
      onPermanentDelete={handlePermanentDelete}
      onRestore={handleRestore}
      onSelect={handleSelectArticle}
      onSetFavorite={handleSetFavorite}
      onToggleMaximize={() => setIsReaderMaximized((m) => !m)}
      onToggleStar={handleToggleStar}
      selectedId={articleId}
    />
  )
}
