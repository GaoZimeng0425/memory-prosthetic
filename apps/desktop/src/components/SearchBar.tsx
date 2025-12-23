import { useEffect, useRef, useState } from 'react'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { invoke } from '@tauri-apps/api/core'
import { FileText, Search, X } from 'lucide-react'

import type { CommandResult } from '@/types/api'

interface SearchSuggestion {
  text: string
  suggestionType: 'title' | 'recent'
}

interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  onSearch: () => void
  onClear: () => void
  isLoading?: boolean
  placeholder?: string
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  onClear,
  isLoading = false,
  placeholder = '搜索你的记忆...',
}: SearchBarProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch suggestions when query changes
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const result = await invoke<CommandResult<SearchSuggestion[]>>('get_search_suggestions', {
          query,
          limit: 5,
        })
        setSuggestions(result.data)
        setShowSuggestions(result.data.length > 0)
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    onSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false)
      } else {
        onClear()
      }
      return
    }

    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, -1))
        break
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          selectSuggestion(suggestions[selectedIndex])
        }
        break
    }
  }

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    onQueryChange(suggestion.text)
    setShowSuggestions(false)
    setSuggestions([])
    // Trigger search after a short delay
    setTimeout(() => onSearch(), 100)
  }

  return (
    <div className="relative" ref={containerRef}>
      <form className="relative flex gap-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-10 pl-10"
            disabled={isLoading}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            value={query}
          />
          {query && (
            <button
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onClear()
                setSuggestions([])
                setShowSuggestions(false)
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button disabled={isLoading || !query.trim()} type="submit">
          {isLoading ? '搜索中...' : '搜索'}
        </Button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg">
          {suggestions.map((suggestion, index) => (
            <button
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent ${
                index === selectedIndex ? 'bg-accent' : ''
              }`}
              key={`${suggestion.suggestionType}-${suggestion.text}`}
              onClick={() => selectSuggestion(suggestion)}
              type="button"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{suggestion.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
