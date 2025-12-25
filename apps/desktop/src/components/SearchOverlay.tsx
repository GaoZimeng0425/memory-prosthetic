import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ArrowRight, Clock, FileText, Search, X } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'
import type { CommandResult, SearchResult } from '@/types/api'

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  onSelectResult: (result: SearchResult) => void
  onOpenUrl: (url: string) => void
}

interface RecentItem {
  id: number
  title: string
  url: string
  domain: string
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function SearchOverlay({ isOpen, onClose, onSelectResult, onOpenUrl }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load recent items
  const loadRecentItems = async () => {
    try {
      const result = await invoke<CommandResult<RecentItem[]>>('get_recent_collections', { limit: 5 })
      setRecentItems(result.data || [])
    } catch {
      setRecentItems([])
    }
  }
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
      void loadRecentItems()
    }
  }, [isOpen, loadRecentItems])

  // Search with debounce
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const result = await invoke<CommandResult<SearchResult[]>>('search_collections', {
          query,
          limit: 10,
        })
        setResults(result.data || [])
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = query.length >= 2 ? results : recentItems
      const maxIndex = items.length - 1

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
          if (items[selectedIndex]) {
            if (e.metaKey || e.ctrlKey) {
              // Cmd+Enter: Open URL directly
              const item = items[selectedIndex]
              onOpenUrl('url' in item ? item.url : '')
            } else {
              // Enter: Select result
              if (query.length >= 2 && results[selectedIndex]) {
                onSelectResult(results[selectedIndex])
              }
            }
            onClose()
          }
          break
      }
    },
    [query, results, recentItems, selectedIndex, onClose, onSelectResult, onOpenUrl]
  )

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const showResults = query.length >= 2
  const displayItems = showResults ? results : recentItems

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Search Container */}
      <div
        className={cn(
          'relative w-full max-w-xl overflow-hidden rounded-2xl',
          'border border-white/10 bg-card/98 shadow-2xl',
          'backdrop-blur-xl'
        )}
        ref={containerRef}
      >
        {/* Search Input */}
        <div className="relative flex items-center border-border border-b px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            autoComplete="off"
            className={cn('flex-1 bg-transparent px-3 py-4 text-lg outline-none', 'placeholder:text-muted-foreground')}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索你的记忆..."
            ref={inputRef}
            spellCheck={false}
            value={query}
          />
          {isLoading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          {query && !isLoading && (
            <button
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setQuery('')}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results / Recent */}
        <div className="max-h-96 overflow-y-auto">
          {displayItems.length === 0 ? (
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
          ) : (
            <div className="p-2">
              {/* Section Header */}
              {!showResults && (
                <div className="mb-2 flex items-center gap-2 px-3 py-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">最近收集</span>
                </div>
              )}

              {/* Items */}
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
                    onClick={() => {
                      if (isSearchResult) {
                        onSelectResult(item as SearchResult)
                      }
                      onClose()
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    type="button"
                  >
                    <div className="mt-0.5 shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 truncate font-medium text-sm">{item.title}</h4>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
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
                        <p className="mt-1.5 line-clamp-2 text-muted-foreground text-xs">
                          {(item as SearchResult).snippet}
                        </p>
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
          )}
        </div>

        {/* Footer */}
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
          <Button className="h-7 gap-1.5 text-muted-foreground text-xs" onClick={onClose} size="sm" variant="ghost">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
            关闭
          </Button>
        </div>
      </div>
    </div>
  )
}
