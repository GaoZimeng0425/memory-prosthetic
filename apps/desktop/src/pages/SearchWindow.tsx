/**
 * Search Window Component
 *
 * Spotlight-style search overlay for quick access.
 */

import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { ExternalLink, Search, X } from 'lucide-react'

import type { SearchResultItem } from '@memory-prosthetic/shared/types'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { search } from '@/apis'

export function SearchWindow() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchMutation = useMutation({
    ...search.mutations.search(),
    onSuccess: (data) => {
      setResults(data.results)
      setSelectedIndex(0)
    },
    onError: () => {
      setResults([])
    },
  })

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          void invoke('hide_search_window')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          if (results[selectedIndex]) {
            window.open(results[selectedIndex].url, '_blank')
            void invoke('hide_search_window')
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex])

  // Search when query changes (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      searchMutation.mutate({ query, limit: 8 })
    }, 150)

    return () => clearTimeout(timer)
  }, [query, searchMutation.mutate])

  const handleClose = () => {
    void invoke('hide_search_window')
  }

  const handleResultClick = (url: string) => {
    window.open(url, '_blank')
    void invoke('hide_search_window')
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-xl border bg-background/95 shadow-2xl backdrop-blur-xl">
      {/* Search input */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          className="flex-1 border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索你的记忆..."
          ref={inputRef}
          value={query}
        />
        {searchMutation.isPending && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
        <Button className="h-8 w-8" onClick={handleClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query && !searchMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">没有找到相关内容</p>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result, index) => (
              <button
                className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                key={result.id}
                onClick={() => handleResultClick(result.url)}
                onMouseEnter={() => setSelectedIndex(index)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{result.title}</p>
                  <p className="mt-1 truncate text-muted-foreground text-xs">{result.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className="text-xs" variant="secondary">
                    {Math.round(result.score ?? 0)}%
                  </Badge>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-muted-foreground text-xs">
        <span>↑↓ 导航 · Enter 打开 · Esc 关闭</span>
        <span>⌘⇧Space 快速唤起</span>
      </div>
    </div>
  )
}
