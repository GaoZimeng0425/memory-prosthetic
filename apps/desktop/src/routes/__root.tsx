import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'

import { collections as collectionsApi } from '@/apis'
import { AppSidebar, type SidebarState } from '@/components/AppSidebar'
import { DragRegion } from '@/components/DragRegion'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CreateFavoriteDialog } from '@/components/features/CreateFavoriteDialog'
import { SettingsDialog } from '@/components/features/SettingsDialog'
import { TagDialog } from '@/components/features/TagDialog'
import { SearchOverlay } from '@/components/SearchOverlay'
import { useCollectionTags } from '@/hooks/use-collection-tags'
import { useCollectionEvents } from '@/hooks/use-collection-events'
import { useTags } from '@/hooks/use-tags'
import { useSidebarSync } from '@/hooks/use-sidebar-sync'
import { useHotkey } from '@/hooks/use-hotkey'
import type { SearchResult } from '@/types/api'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const navigate = useNavigate()
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [isSearchWindow, setIsSearchWindow] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  // Dialog states managed locally
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)

  // Redirect root route to /all
  useEffect(() => {
    if (!isSearchWindow && window.location.pathname === '/') {
      void navigate({ to: '/all', replace: true })
    }
  }, [navigate, isSearchWindow])

  // Redirect old /article/$articleId route to /all/article/$articleId
  useEffect(() => {
    if (!isSearchWindow) {
      const pathname = window.location.pathname
      const articleMatch = pathname.match(/^\/article\/(\d+)$/)
      if (articleMatch) {
        const articleId = articleMatch[1]
        console.log('[RootLayout] Redirecting old article route to /all/article/$articleId')
        void navigate({ to: '/all/article/$articleId', params: { articleId }, replace: true })
      }
    }
  }, [navigate, isSearchWindow])

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

  // Load stats for sidebar (only in main window) - use optimized useSidebarSync
  // No need for useCollections here - all sidebar stats come from useSidebarSync
  const { stats: syncStats } = useSidebarSync()

  // Enable event-driven updates (replaces polling with real-time cache updates via Tauri events)
  useCollectionEvents()

  // Calculate sidebar stats (only used in main window)
  // All stats now come from sync API, no dual polling needed
  const sidebarStats = {
    total: syncStats?.total ?? 0,
    starred: syncStats?.starred ?? 0,
    recent: syncStats?.thisWeek ?? 0,
    archived: syncStats?.archived ?? 0,
    deleted: 0, // syncStats doesn't include deleted, use 0 for now
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
      void navigate({ to: '/all/article/$articleId', params: { articleId: String(id) }, resetScroll: false })
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [navigate, isSearchWindow])

  // Listen for navigate event from tray menu (only in main window)
  useEffect(() => {
    if (isSearchWindow) return // Don't listen in search window

    const unlisten = listen<string>('navigate', async (event) => {
      console.log('[RootLayout] Received navigate event:', event.payload)
      const target = event.payload
      if (target === 'settings') {
        // Show main window first
        try {
          await invoke('show_main_window')
        } catch (error) {
          console.error('[RootLayout] Failed to show main window:', error)
        }
        // SettingsDialog will be opened via DialogContext in RootLayoutContent
      }
    })
    return () => {
      void unlisten.then((fn) => fn())
    }
  }, [isSearchWindow])

  // Global keyboard shortcuts (only in main window)
  // Cmd+B: Toggle sidebar
  useHotkey({
    key: 'b',
    metaKey: true,
    enabled: !isSearchWindow,
    onPress: () => setSidebarState((s) => (s === 'expanded' ? 'collapsed' : 'expanded')),
  })

  // Cmd+N: Create new note
  useHotkey({
    key: 'n',
    metaKey: true,
    enabled: !isSearchWindow,
    onPress: () => {
      void navigate({ to: '/note/new' })
    },
  })

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
      void navigate({ to: '/all/article/$articleId', params: { articleId: String(result.id) } })
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

  // For search window, render only the content without sidebar and drag region
  if (isSearchWindow) {
    return <Outlet />
  }

  // For main window, render full layout with sidebar
  return (
    <ErrorBoundary>
      <RootLayoutContent
        handleOpenUrl={handleOpenUrl}
        handleSearchClick={handleSearchClick}
        handleSearchResultSelect={handleSearchResultSelect}
        isCreateFavoriteOpen={isCreateFavoriteOpen}
        isSearchOpen={isSearchOpen}
        isSettingsOpen={isSettingsOpen}
        setIsCreateFavoriteOpen={setIsCreateFavoriteOpen}
        setIsSearchOpen={setIsSearchOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        setSidebarState={setSidebarState}
        sidebarState={sidebarState}
        sidebarStats={sidebarStats}
      />
    </ErrorBoundary>
  )
}

function RootLayoutContent({
  handleSearchClick,
  isSearchOpen,
  setIsSearchOpen,
  sidebarState,
  setSidebarState,
  sidebarStats,
  handleOpenUrl,
  handleSearchResultSelect,
  isSettingsOpen,
  setIsSettingsOpen,
  isCreateFavoriteOpen,
  setIsCreateFavoriteOpen,
}: {
  handleSearchClick: () => void
  isSearchOpen: boolean
  setIsSearchOpen: (open: boolean) => void
  sidebarState: SidebarState
  setSidebarState: (state: SidebarState) => void
  sidebarStats: {
    total: number
    starred: number
    recent: number
    archived: number
    deleted: number
  }
  handleOpenUrl: (url: string) => void
  handleSearchResultSelect: (result: SearchResult) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  isCreateFavoriteOpen: boolean
  setIsCreateFavoriteOpen: (open: boolean) => void
}) {
  const handleSettingsClick = () => {
    setIsSettingsOpen(true)
  }

  // CMD + , to open settings
  useHotkey({
    key: ',',
    metaKey: true,
    onPress: handleSettingsClick,
  })

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-secondary text-foreground">
        <DragRegion className="h-8 shrink-0 cursor-move" />
        {/* Sidebar */}
        <AppSidebar
          className="shrink-0 pt-4"
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

      {/* Create Favorite Dialog */}
      <CreateFavoriteDialog
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateFavoriteOpen(false)
          }
        }}
        open={isCreateFavoriteOpen}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        onOpenChange={(open) => {
          if (!open) {
            setIsSettingsOpen(false)
          }
        }}
        open={isSettingsOpen}
      />
    </>
  )
}

// TagDialogWrapper is now in ArticleGroupSection.tsx
// Legacy wrapper kept for ArticleReader which imports it
export function TagDialogWrapper({ collectionId, onClose }: { collectionId: number; onClose: () => void }) {
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
