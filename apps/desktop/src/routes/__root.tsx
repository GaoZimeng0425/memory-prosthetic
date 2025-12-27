import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'

import { collections as collectionsApi } from '@/apis'
import { AppSidebar, type SidebarState } from '@/components/AppSidebar'
import { DragRegion } from '@/components/DragRegion'
import { CreateFavoriteDialog } from '@/components/features/CreateFavoriteDialog'
import { SelectFavoriteDialog } from '@/components/features/SelectFavoriteDialog'
import { SettingsDialog } from '@/components/features/SettingsDialog'
import { TagDialog } from '@/components/features/TagDialog'
import { SearchOverlay } from '@/components/SearchOverlay'
import { DialogProvider, useDialog } from '@/contexts/DialogContext'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useCollections } from '@/hooks/use-collections'
import { useTags } from '@/hooks/use-tags'
import type { SearchResult } from '@/types/api'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [isSearchWindow, setIsSearchWindow] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Detect if current window is search window and ensure correct route
  useEffect(() => {
    const checkWindowType = async () => {
      try {
        const currentWindow = getCurrentWindow()
        const label = currentWindow.label
        const isSearch = label === 'search'
        setIsSearchWindow(isSearch)

        // If this is search window, ensure we're on /search route
        if (isSearch && window.location.pathname !== '/search') {
          console.log('[RootLayout] Search window detected, navigating to /search')
          void navigate({ to: '/search', replace: true })
        }
      } catch (error) {
        console.error('[RootLayout] Failed to get window label:', error)
        // Fallback: check by route path
        const isSearch = window.location.pathname === '/search'
        setIsSearchWindow(isSearch)
        if (isSearch && window.location.pathname !== '/search') {
          void navigate({ to: '/search', replace: true })
        }
      }
    }
    void checkWindowType()
  }, [navigate])

  // Load stats for sidebar (only in main window)
  const { stats } = useCollections({ status: 'active', limit: 0 })
  const { collections } = useCollections({ status: 'active' })

  // Calculate sidebar stats (only used in main window)
  const starredCount = collections.filter((c) => c.starred).length
  const sidebarStats = {
    total: stats?.total ?? collections.length,
    starred: starredCount,
    recent: stats?.thisWeek ?? 0,
    archived: stats?.archived ?? 0,
    deleted: stats?.deleted ?? 0,
  }

  // Listen for search result selection from SearchWindow (only in main window)
  useEffect(() => {
    if (isSearchWindow) return // Don't listen in search window

    const unlisten = listen<{ id: number }>('search:select', async (event) => {
      console.log('[RootLayout] Received search:select event:', event.payload)
      const { id } = event.payload
      // 显示并聚焦主窗口（处理隐藏和最小化状态）
      try {
        await invoke('show_main_window')
      } catch (error) {
        console.error('[RootLayout] Failed to show main window:', error)
        // 如果命令失败，尝试直接操作窗口（备用方案）
        try {
          const mainWindow = await WebviewWindow.getByLabel('main')
          if (mainWindow) {
            await mainWindow.show()
            await mainWindow.unminimize()
            await mainWindow.setFocus()
          }
        } catch (fallbackError) {
          console.error('[RootLayout] Fallback window show also failed:', fallbackError)
        }
      }
      // Navigate to article route
      void navigate({ to: '/article/$articleId', params: { articleId: String(id) } })
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [navigate, isSearchWindow])

  // Global keyboard shortcuts (only in main window)
  useEffect(() => {
    if (isSearchWindow) return // Don't listen in search window

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setSidebarState((s) => (s === 'expanded' ? 'collapsed' : 'expanded'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchWindow])

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
      void navigate({ to: '/article/$articleId', params: { articleId: String(result.id) } })
      setIsSearchOpen(false)
    },
    [navigate]
  )

  const handleOpenUrl = useCallback((url: string) => {
    void openUrl(url)
  }, [])

  // These handlers will be passed via context or events
  const handleSearchClick = () => {
    setIsSearchOpen(true)
  }

  const handleSettingsClick = () => {
    setIsSettingsOpen(true)
  }

  // For search window, render only the content without sidebar and drag region
  if (isSearchWindow) {
    return <Outlet />
  }

  // For main window, render full layout with sidebar
  return (
    <DialogProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <DragRegion className="h-8 shrink-0 cursor-move" />
        {/* Sidebar */}
        <AppSidebar
          className="pt-4"
          onSearchClick={handleSearchClick}
          onSettingsClick={handleSettingsClick}
          onStateChange={setSidebarState}
          state={sidebarState}
          stats={sidebarStats}
        />

        {/* Main content area - renders child routes via Outlet */}
        <Outlet />
      </div>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpen={() => setIsSearchOpen(true)}
        onOpenUrl={handleOpenUrl}
        onSelectResult={handleSearchResultSelect}
      />

      {/* Settings Dialog */}
      <SettingsDialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen} />

      {/* Dialog components managed by DialogContext */}
      <DialogComponents />
    </DialogProvider>
  )
}

// Component to render dialogs managed by DialogContext
function DialogComponents() {
  const {
    tagDialogCollectionId,
    closeTagDialog,
    favoriteDialogState,
    closeFavoriteDialog,
    isCreateFavoriteOpen,
    closeCreateFavoriteDialog,
    openCreateFavoriteDialog,
  } = useDialog()
  const { collections, setFavorite } = useCollections({ status: 'active' })

  // Get current article's favoriteId for SelectFavoriteDialog
  // This ensures we get the correct favoriteId even if the article is not in the filtered collections list
  const { data: currentArticle } = useQuery({
    ...collectionsApi.queries.detail(favoriteDialogState.collectionId ?? 0),
    enabled: favoriteDialogState.collectionId !== null && favoriteDialogState.collectionId > 0,
  })

  // Fallback to collections list if article query fails or is not available
  const currentFavoriteId =
    currentArticle?.favoriteId ?? collections.find((c) => c.id === favoriteDialogState.collectionId)?.favoriteId ?? null

  return (
    <>
      {/* Tag Dialog for list items and ArticleReader */}
      {tagDialogCollectionId !== null && (
        <TagDialogWrapper collectionId={tagDialogCollectionId} onClose={closeTagDialog} />
      )}

      {/* Select Favorite Dialog */}
      {favoriteDialogState.collectionId !== null && (
        <SelectFavoriteDialog
          currentFavoriteId={currentFavoriteId}
          onCreateNew={openCreateFavoriteDialog}
          onOpenChange={(open) => {
            if (!open) {
              closeFavoriteDialog()
            }
          }}
          onSelect={async (favoriteId) => {
            if (favoriteDialogState.collectionId !== null) {
              try {
                await setFavorite(favoriteDialogState.collectionId, favoriteId)
              } catch (error) {
                console.error('[DialogComponents] Failed to set favorite:', error)
                alert(`设置收藏夹失败: ${error instanceof Error ? error.message : '未知错误'}`)
              }
            }
          }}
          open={favoriteDialogState.open}
        />
      )}

      {/* Create Favorite Dialog */}
      <CreateFavoriteDialog
        onOpenChange={(open) => {
          if (!open) {
            closeCreateFavoriteDialog()
          }
        }}
        open={isCreateFavoriteOpen}
      />
    </>
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
