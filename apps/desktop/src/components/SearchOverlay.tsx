import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from 'es-toolkit'
import { ArrowRight, Clock, FilePlus, FileText, Search, X } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import { search } from '@/apis'
import { useHotkey } from '@/hooks/use-hotkey'
import type { CommandResult, SearchResult } from '@/types/api'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
  onSelectResult: (result: SearchResult) => void
  onOpenUrl: (url: string) => void
}

interface RecentItem {
  id: number
  title: string
  url?: string // Optional: undefined for user-created notes
  domain: string
}

const DEBOUNCE_DELAY = 150
const MIN_QUERY_LENGTH = 2
const SEARCH_LIMIT = 10
const RECENT_LIMIT = 5

const SPECIAL_KEYS = ['Escape', 'ArrowDown', 'ArrowUp', 'Enter'] as const

const getDomain = (url?: string): string => {
  if (!url) return '笔记'
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Custom hook for debounced value
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedValue(value)
    }, delay)

    handler()
    return () => handler.cancel()
  }, [value, delay])

  return debouncedValue
}

// Custom hook for search overlay logic
const useSearchOverlay = (isOpen: boolean) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(query.trim(), DEBOUNCE_DELAY)

  const { data: results = [], isFetching: isLoading } = useQuery({
    ...search.queries.results(debouncedQuery, SEARCH_LIMIT),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    select: (data) => data.results,
  })

  const loadRecentItems = useCallback(async () => {
    try {
      const result = await invoke<CommandResult<RecentItem[]>>('get_recent_collections', {
        limit: RECENT_LIMIT,
      })
      setRecentItems(result.data || [])
    } catch {
      setRecentItems([])
    }
  }, [])

  // Reset when overlay opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      void loadRecentItems()
      requestAnimationFrame(() => {
        setTimeout(() => {
          inputRef.current?.focus()
          if (inputRef.current?.value) {
            inputRef.current.select()
          }
        }, 0)
      })
    }
  }, [isOpen, loadRecentItems])

  const showResults = query.length >= MIN_QUERY_LENGTH
  const displayItems = showResults ? results : recentItems

  // Reset selected index when displayItems change
  useEffect(() => {
    if (displayItems.length > 0) {
      setSelectedIndex(0)
    } else {
      setSelectedIndex(-1)
    }
  }, [displayItems.length])

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    recentItems,
    displayItems,
    showResults,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    inputRef,
  }
}

// Keyboard navigation handler
const useKeyboardNavigation = (
  displayItems: (SearchResult | RecentItem)[],
  selectedIndex: number,
  onSelectResult: (result: SearchResult) => void,
  onOpenUrl: (url: string) => void,
  onClose: () => void,
  setSelectedIndex: (index: number | ((prev: number) => number)) => void
) => {
  return useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Only handle special keys, let normal typing pass through
      if (!SPECIAL_KEYS.includes(e.key as (typeof SPECIAL_KEYS)[number])) return

      const maxIndex = displayItems.length - 1

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, maxIndex))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (displayItems[selectedIndex]) {
            const item = displayItems[selectedIndex]
            if (e.metaKey || e.ctrlKey) {
              if (item.url) {
                onOpenUrl(item.url)
              }
            } else {
              if ('score' in item) {
                onSelectResult(item)
              } else {
                onSelectResult({ id: item.id, title: item.title, url: item.url } as SearchResult)
              }
            }
            onClose()
          }
          break
      }
    },
    [displayItems, selectedIndex, onSelectResult, onOpenUrl, onClose, setSelectedIndex]
  )
}

// Global shortcut handler
const useGlobalShortcut = (isOpen: boolean, onOpen: () => void) => {
  // Cmd+K to open search
  useHotkey({
    key: 'k',
    metaKey: true,
    enabled: !isOpen,
    onPress: onOpen,
  })

  // Cmd+Space to open search
  useHotkey({
    key: ' ',
    metaKey: true,
    enabled: !isOpen,
    onPress: onOpen,
  })
}

// Click outside handler
const useClickOutside = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onClose: () => void
) => {
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose, containerRef])
}

// Search Input Component
type SearchInputProps = {
  query: string
  isLoading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onQueryChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onClear: () => void
}

const SearchInput = ({ query, isLoading, inputRef, onQueryChange, onKeyDown, onClear }: SearchInputProps) => (
  <div className="relative flex items-center border-border border-b px-4">
    <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
    <Input
      autoComplete="off"
      className="flex-1 border-0 bg-transparent px-3 py-4 text-lg shadow-none focus-visible:ring-0"
      onChange={(e) => onQueryChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="搜索你的记忆..."
      ref={inputRef}
      spellCheck={false}
      type="text"
      value={query}
    />
    {isLoading && <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
    {query && !isLoading && (
      <button
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onClear}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
)

// Search Results Component
type SearchResultsProps = {
  showResults: boolean
  displayItems: (SearchResult | RecentItem)[]
  selectedIndex: number
  onSelect: (item: SearchResult | RecentItem) => void
  onSelectIndex: (index: number) => void
}

const SearchResults = ({ showResults, displayItems, selectedIndex, onSelect, onSelectIndex }: SearchResultsProps) => {
  if (displayItems.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        {showResults ? (
          <>
            <p className="text-muted-foreground">没有找到匹配的内容</p>
            <p className="mt-2 text-muted-foreground text-sm">试试其他关键词，如同义词或英文术语</p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">输入关键词开始搜索</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-2">
      {!showResults && (
        <div className="mb-2 flex items-center gap-2 px-3 py-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">最近收集</span>
        </div>
      )}

      {displayItems.map((item, index) => {
        const isSelected = index === selectedIndex
        const isSearchResult = 'score' in item

        return (
          <button
            className={cn(
              'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
              isSelected ? 'bg-accent' : 'hover:bg-accent/50'
            )}
            key={item.id}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onSelectIndex(index)}
            type="button"
          >
            <div className="mt-0.5 shrink-0">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="mb-1 truncate font-medium text-sm">{item.title}</h4>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                {isSearchResult && (item as SearchResult).type && (
                  <>
                    <span className="truncate text-xs">{(item as SearchResult).type}</span>
                    <span>·</span>
                  </>
                )}
                <span className="truncate">{getDomain(item.url)}</span>
                {isSearchResult && (item as SearchResult).similarity != null && (
                  <>
                    <span>·</span>
                    <span className="shrink-0 text-primary">
                      {Math.round(((item as SearchResult).similarity || 0) * 100)}% 匹配
                    </span>
                  </>
                )}
              </div>
              {isSearchResult && (item as SearchResult).snippet && (
                <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs">{(item as SearchResult).snippet}</p>
              )}
            </div>

            {isSelected && (
              <div className="mt-0.5 shrink-0">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Footer Component
const SearchFooter = ({ onClose, onCreateNote }: { onClose: () => void; onCreateNote: () => void }) => (
  <div className="flex items-center justify-between border-border border-t px-4 py-2">
    <div className="flex items-center gap-4 text-muted-foreground text-xs">
      <span className="flex items-center gap-1">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd>
        导航
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↵</kbd>
        打开
      </span>
      <span className="flex items-center gap-1">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘↵</kbd>
        原文
      </span>
    </div>
    <div className="flex items-center gap-2">
      <Button className="h-7 gap-1.5 text-muted-foreground text-xs" onClick={onCreateNote} size="sm" variant="ghost">
        <FilePlus className="h-3.5 w-3.5" />
        新建笔记
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">⌘N</kbd>
      </Button>
      <Button className="h-7 gap-1.5 text-muted-foreground text-xs" onClick={onClose} size="sm" variant="ghost">
        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
        关闭
      </Button>
    </div>
  </div>
)

export function SearchOverlay({ isOpen, onClose, onOpen, onSelectResult, onOpenUrl }: SearchOverlayProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const { query, setQuery, displayItems, showResults, isLoading, selectedIndex, setSelectedIndex, inputRef } =
    useSearchOverlay(isOpen)

  const handleKeyDown = useKeyboardNavigation(
    displayItems,
    selectedIndex,
    onSelectResult,
    onOpenUrl,
    onClose,
    setSelectedIndex
  )

  const handleSelectItem = (item: SearchResult | RecentItem) => {
    if ('score' in item) {
      onSelectResult(item)
    } else {
      onSelectResult({ id: item.id, title: item.title, url: item.url } as SearchResult)
    }
    onClose()
  }

  const handleCreateNote = () => {
    onClose()
    void navigate({ to: '/note/new' })
  }

  useGlobalShortcut(isOpen, onOpen)
  useClickOutside(containerRef, isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          'relative w-full max-w-xl overflow-hidden rounded-md',
          'border border-white/10 bg-card/98 shadow-2xl',
          'backdrop-blur-xl'
        )}
        ref={containerRef}
      >
        <SearchInput
          inputRef={inputRef}
          isLoading={isLoading}
          onClear={() => setQuery('')}
          onKeyDown={handleKeyDown}
          onQueryChange={setQuery}
          query={query}
        />
        <div className="max-h-96 overflow-y-auto">
          <SearchResults
            displayItems={displayItems}
            onSelect={handleSelectItem}
            onSelectIndex={setSelectedIndex}
            selectedIndex={selectedIndex}
            showResults={showResults}
          />
        </div>
        <SearchFooter onClose={onClose} onCreateNote={handleCreateNote} />
      </div>
    </div>
  )
}
