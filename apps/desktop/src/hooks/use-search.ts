import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

import type { CommandResult, SearchRequest, SearchResponse, SearchResultItem } from '@/types/api'

interface UseSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResultItem[]
  isLoading: boolean
  error: string | null
  search: () => Promise<void>
  clearResults: () => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    if (!query.trim()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const request: SearchRequest = {
        query: query.trim(),
        limit: 20,
      }

      const response = await invoke<CommandResult<SearchResponse>>('search', {
        request,
      })

      setResults(response.data.results)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(errorMessage)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => {
    setResults([])
    setQuery('')
    setError(null)
  }

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
    clearResults,
  }
}
