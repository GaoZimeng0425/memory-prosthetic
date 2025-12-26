import { useCallback, useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { openUrl } from '@tauri-apps/plugin-opener'

import type { GraphFilters } from '@memory-prosthetic/shared'
import { isWithinDays } from '@memory-prosthetic/shared/utils/date'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { AppSidebar, type SidebarState } from '@/components/AppSidebar'
import { ArticleReader } from '@/components/ArticleReader'
import { ArticleList } from '@/components/article-list'
import { DragRegion } from '@/components/DragRegion'
import { CreateFavoriteDialog } from '@/components/features/CreateFavoriteDialog'
import { DeleteConfirmDialog } from '@/components/features/DeleteConfirmDialog'
import { SelectFavoriteDialog } from '@/components/features/SelectFavoriteDialog'
import { TagDialog } from '@/components/features/TagDialog'
import { GraphPage } from '@/components/pages/GraphPage'
import { SearchOverlay } from '@/components/SearchOverlay'
import { SettingsPanel } from '@/components/SettingsPanel'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useCollections } from '@/hooks/use-collections'
import { useFavorites } from '@/hooks/use-favorites'
import { useTags } from '@/hooks/use-tags'
import type { Collection, CommandResult, SearchResult } from '@/types/api'

function App() {
  // Layout state
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [activeNav, setActiveNav] = useState('all')
  console.log('🚀 : App : activeNav:', activeNav)
  const [activeFavoriteId, setActiveFavoriteId] = useState<number | null>(null)
  const [activeTagId, setActiveTagId] = useState<number | null>(null)
  const [isReaderMaximized, setIsReaderMaximized] = useState(false)

  // Search overlay state
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Selected article state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Collection | null>(null)
  const [isArticleLoading, setIsArticleLoading] = useState(false)

  // Tag dialog state
  const [tagDialogCollectionId, setTagDialogCollectionId] = useState<number | null>(null)

  // Favorite dialog state
  const [favoriteDialogState, setFavoriteDialogState] = useState<{
    open: boolean
    collectionId: number | null
  }>({ open: false, collectionId: null })

  // Create favorite dialog state
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)

  // Delete dialog state
  const [deleteDialogState, setDeleteDialogState] = useState<{
    open: boolean
    id: number | null
    isPermanent: boolean
  }>({ open: false, id: null, isPermanent: false })

  // Graph view state
  const [graphFilters, setGraphFilters] = useState<GraphFilters>({
    minWeight: 0.3,
    maxNodes: 100,
  })

  // Collections data - filter by favorite, tags, or status if active
  const collectionParams = useMemo(() => {
    if (activeNav === 'favorite') {
      if (activeFavoriteId !== null) {
        return { favoriteId: activeFavoriteId, status: 'active' as const }
      }
      // 未分类：使用 uncategorized 参数
      return { uncategorized: true, status: 'active' as const }
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
    if (activeNav === 'graph') {
      // 图谱视图不需要加载集合列表
      return { status: 'active' as const, limit: 0 }
    }
    return { status: 'active' as const }
  }, [activeNav, activeFavoriteId, activeTagId])

  console.log('🚀 : App : collectionParams:', collectionParams)
  const { collections, stats, isLoading: collectionsLoading, refresh } = useCollections(collectionParams)
  console.log('🚀 : App : collections, stats:', collections, stats)
  console.log('🚀 : App : collections:', collections)
  const { favorites } = useFavorites()
  const { tags } = useTags()

  // Load article when selected
  const handleSelectArticle = useCallback(async (id: number) => {
    setSelectedId(id)
    setIsArticleLoading(true)
    try {
      const result = await invoke<CommandResult<Collection | null>>('get_collection', { id })
      setSelectedArticle(result.data)
    } catch (err) {
      console.error('Failed to load article:', err)
      setSelectedArticle(null)
    } finally {
      setIsArticleLoading(false)
    }
  }, [])

  // Listen for navigation events from tray menu
  useEffect(() => {
    const unlisten = listen<string>('navigate', (event) => {
      if (event.payload === 'settings') {
        setIsSettingsOpen(true)
      } else if (event.payload === 'search') {
        setIsSearchOpen(true)
      }
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [])

  // Listen for search result selection from SearchWindow
  useEffect(() => {
    const unlisten = listen<{ id: number }>('search:select', async (event) => {
      console.log('[App] Received search:select event:', event.payload)
      const { id } = event.payload
      // 显示并聚焦主窗口（处理隐藏和最小化状态）
      try {
        await invoke('show_main_window')
        console.log('[App] Main window shown and focused')
      } catch (error) {
        console.error('[App] Failed to show main window:', error)
        // 如果命令失败，尝试直接操作窗口（备用方案）
        try {
          const mainWindow = await WebviewWindow.getByLabel('main')
          if (mainWindow) {
            await mainWindow.show()
            await mainWindow.unminimize()
            await mainWindow.setFocus()
          }
        } catch (fallbackError) {
          console.error('[App] Fallback window show also failed:', fallbackError)
        }
      }
      // 打开对应的文章
      console.log('[App] Opening article with id:', id)
      void handleSelectArticle(id)
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [handleSelectArticle])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Cmd+Space: Open search
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === ' ')) {
        e.preventDefault()
        setIsSearchOpen(true)
      }

      // Cmd+\: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setSidebarState((s) => (s === 'expanded' ? 'collapsed' : 'expanded'))
      }

      // Cmd+M: Toggle maximize reader
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault()
        if (selectedArticle) {
          setIsReaderMaximized((m) => !m)
        }
      }

      // Escape: Close maximized reader
      if (e.key === 'Escape' && isReaderMaximized) {
        setIsReaderMaximized(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedArticle, isReaderMaximized])

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
      void handleSelectArticle(result.id)
      setIsSearchOpen(false)
    },
    [handleSelectArticle]
  )

  // Handle delete (soft delete)
  const handleDelete = useCallback((id: number) => {
    setDeleteDialogState({ open: true, id, isPermanent: false })
  }, [])

  // Handle permanent delete
  const handlePermanentDelete = useCallback((id: number) => {
    setDeleteDialogState({ open: true, id, isPermanent: true })
  }, [])

  // Confirm delete
  const confirmDelete = useCallback(
    (id: number, isPermanent: boolean) => {
      void (async () => {
        try {
          if (isPermanent) {
            await invoke('permanently_delete_collection', { id })
          } else {
            await invoke('delete_collection', { id })
          }
          if (selectedId === id) {
            setSelectedId(null)
            setSelectedArticle(null)
          }
          void refresh()
        } catch (error) {
          console.error('Failed to delete:', error)
          alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      })()
    },
    [selectedId, refresh]
  )

  // Handle open URL in default browser
  const handleOpenUrl = useCallback((url: string) => {
    void openUrl(url)
  }, [])

  // Handle toggle star
  const handleToggleStar = useCallback(
    (id: number) => {
      void (async () => {
        try {
          await invoke('toggle_collection_star', { id })
          void refresh()
        } catch (error) {
          console.error('Failed to toggle star:', error)
        }
      })()
    },
    [refresh]
  )

  // Handle set favorite
  const handleSetFavorite = useCallback(
    (id: number, favoriteId: number | null) => {
      void (async () => {
        try {
          await invoke('set_collection_favorite', { id, favoriteId })
          void refresh()
        } catch (error) {
          console.error('Failed to set favorite:', error)
        }
      })()
    },
    [refresh]
  )

  // Handle archive
  const handleArchive = useCallback(
    (id: number) => {
      void (async () => {
        try {
          await invoke('archive_collection', { id })
          void refresh()
        } catch (error) {
          console.error('Failed to archive:', error)
        }
      })()
    },
    [refresh]
  )

  // Handle restore
  const handleRestore = useCallback(
    (id: number) => {
      void (async () => {
        try {
          await invoke('restore_collection', { id })
          void refresh()
        } catch (error) {
          console.error('Failed to restore:', error)
        }
      })()
    },
    [refresh]
  )

  // Filter collections based on active nav
  const filteredCollections = useMemo(() => {
    switch (activeNav) {
      case 'starred':
        return collections.filter((c) => c.starred)
      case 'recent':
        return collections.filter((c) => isWithinDays(c.createdAt, 7))
      case 'archived':
      case 'deleted':
        // Status filtering is handled by backend query
        return collections
      default:
        return collections
    }
  }, [collections, activeNav])
  console.log('🚀 : App : filteredCollections:', filteredCollections)

  // Calculate sidebar stats
  const starredCount = collections.filter((c) => c.starred).length
  const sidebarStats = {
    total: stats?.total ?? collections.length,
    starred: starredCount,
    recent: stats?.thisWeek ?? 0,
    archived: stats?.archived ?? 0,
    deleted: stats?.deleted ?? 0,
  }

  // Calculate filter hint
  const filterHint = useMemo(() => {
    if (activeNav === 'favorite' && activeFavoriteId !== null) {
      const favorite = favorites.find((f) => f.id === activeFavoriteId)
      return {
        type: 'favorite' as const,
        label: favorite ? `收藏夹: ${favorite.name}` : '收藏夹',
        count: filteredCollections.length,
        onClear: () => {
          setActiveNav('all')
          setActiveFavoriteId(null)
        },
      }
    }
    if (activeNav === 'favorite' && activeFavoriteId === null) {
      return {
        type: 'favorite' as const,
        label: '未分类',
        count: filteredCollections.length,
        onClear: () => {
          setActiveNav('all')
          setActiveFavoriteId(null)
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
          setActiveNav('all')
          setActiveTagId(null)
        },
      }
    }
    if (activeNav === 'archived') {
      return {
        type: 'archived' as const,
        label: '已归档',
        count: filteredCollections.length,
        onClear: () => {
          setActiveNav('all')
        },
      }
    }
    if (activeNav === 'deleted') {
      return {
        type: 'deleted' as const,
        label: '最近删除',
        count: filteredCollections.length,
        onClear: () => {
          setActiveNav('all')
        },
      }
    }
    return null
  }, [activeNav, activeFavoriteId, activeTagId, favorites, tags, filteredCollections.length])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <DragRegion className="h-8 shrink-0 cursor-move" />
      {/* Sidebar */}
      <AppSidebar
        activeFavoriteId={activeFavoriteId}
        activeNav={activeNav}
        activeTagId={activeTagId}
        className="pt-4"
        onFavoriteChange={(favoriteId) => {
          setActiveFavoriteId(favoriteId)
          if (favoriteId !== null) {
            setActiveNav('favorite')
            setActiveTagId(null)
          }
        }}
        onNavChange={(nav) => {
          setActiveNav(nav)
          if (nav !== 'favorite') {
            setActiveFavoriteId(null)
          }
          if (nav !== 'tag') {
            setActiveTagId(null)
          }
        }}
        onSearchClick={() => setIsSearchOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onStateChange={setSidebarState}
        onTagChange={(tagId) => {
          setActiveTagId(tagId)
          if (tagId !== null) {
            setActiveNav('tag')
            setActiveFavoriteId(null)
          }
        }}
        state={sidebarState}
        stats={sidebarStats}
      />

      {/* Graph View or Article List */}
      {activeNav === 'graph' ? (
        <GraphPage
          filters={graphFilters}
          onFiltersChange={setGraphFilters}
          onNodeSelect={(nodeId) => {
            // 点击节点时，切换到文章列表并选中该文章
            setActiveNav('all')
            void handleSelectArticle(nodeId)
          }}
        />
      ) : (
        <>
          {/* Article List */}
          <ArticleList
            className="pt-4"
            collections={filteredCollections}
            filterHint={filterHint ?? undefined}
            isLoading={collectionsLoading}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onManageTags={(id) => setTagDialogCollectionId(id)}
            onOpenFavoriteDialog={(id) => setFavoriteDialogState({ open: true, collectionId: id })}
            onOpenUrl={handleOpenUrl}
            onSelect={handleSelectArticle}
            onSetFavorite={handleSetFavorite}
            onToggleStar={handleToggleStar}
            selectedId={selectedId}
          />

          {/* Article Reader */}
        </>
      )}

      {/* Article Reader (only show when not in graph view) */}
      {activeNav !== 'graph' && (
        <ArticleReader
          article={selectedArticle}
          className="pt-4"
          isLoading={isArticleLoading}
          isMaximized={isReaderMaximized}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onOpenUrl={handleOpenUrl}
          onPermanentDelete={handlePermanentDelete}
          onRestore={handleRestore}
          onSetFavorite={handleSetFavorite}
          onToggleMaximize={() => setIsReaderMaximized((m) => !m)}
          onToggleStar={handleToggleStar}
        />
      )}

      {/* Select Favorite Dialog */}
      {favoriteDialogState.collectionId !== null && (
        <SelectFavoriteDialog
          currentFavoriteId={collections.find((c) => c.id === favoriteDialogState.collectionId)?.favoriteId ?? null}
          onCreateNew={() => {
            setIsCreateFavoriteOpen(true)
          }}
          onOpenChange={(open) => {
            if (!open) {
              setFavoriteDialogState({ open: false, collectionId: null })
            }
          }}
          onSelect={(favoriteId) => {
            if (favoriteDialogState.collectionId !== null) {
              handleSetFavorite(favoriteDialogState.collectionId, favoriteId)
            }
          }}
          open={favoriteDialogState.open}
        />
      )}

      {/* Create Favorite Dialog */}
      <CreateFavoriteDialog
        onOpenChange={(open) => {
          setIsCreateFavoriteOpen(open)
          if (!open && favoriteDialogState.open) {
            // If create dialog closes and favorite dialog is still open, keep it open
          }
        }}
        open={isCreateFavoriteOpen}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isPermanent={deleteDialogState.isPermanent}
        onConfirm={() => {
          if (deleteDialogState.id !== null) {
            confirmDelete(deleteDialogState.id, deleteDialogState.isPermanent)
          }
        }}
        onOpenChange={(open) => setDeleteDialogState({ ...deleteDialogState, open })}
        open={deleteDialogState.open}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenUrl={handleOpenUrl}
        onSelectResult={handleSearchResultSelect}
      />

      {/* Settings Dialog */}
      <Dialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto md:max-w-xl lg:max-w-2xl xl:max-w-5xl">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>管理应用程序设置和偏好</DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>

      {/* Tag Dialog for list items */}
      {tagDialogCollectionId !== null && (
        <TagDialogWrapper collectionId={tagDialogCollectionId} onClose={() => setTagDialogCollectionId(null)} />
      )}
    </div>
  )
}

// Wrapper component for TagDialog to manage its own state
function TagDialogWrapper({ collectionId, onClose }: { collectionId: number; onClose: () => void }) {
  const { tags: collectionTags, addTags, removeTag } = useCollectionTags(collectionId)
  const { createTag } = useTags()

  return (
    <TagDialog
      onCreateTag={async (name: string) => {
        const newTagId = await createTag({ name })
        await addTags([newTagId])
        return newTagId
      }}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose()
        }
      }}
      onSelectionChange={async (tagIds: number[]) => {
        try {
          const currentTagIds = collectionTags.map((t) => t.id)
          const toAdd = tagIds.filter((id: number) => !currentTagIds.includes(id))
          const toRemove = currentTagIds.filter((id: number) => !tagIds.includes(id))

          if (toAdd.length > 0) {
            await addTags(toAdd)
          }
          for (const tagId of toRemove) {
            await removeTag(tagId)
          }
        } catch (error) {
          console.error('Failed to update tags:', error)
          alert(`更新标签失败: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }}
      open={true}
      selectedTagIds={collectionTags.map((t) => t.id)}
    />
  )
}

export default App
