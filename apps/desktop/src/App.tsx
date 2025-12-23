import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import { AppSidebar, type SidebarState } from '@/components/AppSidebar'
import { ArticleReader } from '@/components/ArticleReader'
import { ArticleList } from '@/components/article-list'
import { SearchOverlay } from '@/components/SearchOverlay'
import { SettingsPanel } from '@/components/SettingsPanel'
import { useCollections } from '@/hooks/use-collections'
import type { Collection, CommandResult, SearchResult } from '@/types/api'

function App() {
  // Layout state
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [activeNav, setActiveNav] = useState('all')
  const [isReaderMaximized, setIsReaderMaximized] = useState(false)

  // Search overlay state
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Settings dialog state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Selected article state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Collection | null>(null)
  const [isArticleLoading, setIsArticleLoading] = useState(false)

  // Collections data
  const { collections, stats, isLoading: collectionsLoading, refresh } = useCollections()

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

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    (result: SearchResult) => {
      void handleSelectArticle(result.id)
      setIsSearchOpen(false)
    },
    [handleSelectArticle]
  )

  // Handle delete
  const handleDelete = useCallback(
    (id: number) => {
      void (async () => {
        try {
          await invoke('delete_collection', { id })
          if (selectedId === id) {
            setSelectedId(null)
            setSelectedArticle(null)
          }
          void refresh()
        } catch (error) {
          console.error('Failed to delete:', error)
        }
      })()
    },
    [selectedId, refresh]
  )

  // Handle open URL
  const handleOpenUrl = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  // Calculate sidebar stats
  const sidebarStats = {
    total: stats?.total ?? collections.length,
    starred: 0, // TODO: Implement starred count
    recent: stats?.thisWeek ?? 0,
    archived: 0, // TODO: Implement archived count
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <AppSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onSearchClick={() => setIsSearchOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onStateChange={setSidebarState}
        state={sidebarState}
        stats={sidebarStats}
      />

      {/* Article List */}
      <ArticleList
        collections={collections}
        isLoading={collectionsLoading}
        onDelete={handleDelete}
        onOpenUrl={handleOpenUrl}
        onSelect={handleSelectArticle}
        selectedId={selectedId}
      />

      {/* Article Reader */}
      <ArticleReader
        article={selectedArticle}
        isLoading={isArticleLoading}
        isMaximized={isReaderMaximized}
        onDelete={handleDelete}
        onOpenUrl={handleOpenUrl}
        onToggleMaximize={() => setIsReaderMaximized((m) => !m)}
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
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>管理应用程序设置和偏好</DialogDescription>
          </DialogHeader>
          <SettingsPanel />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
