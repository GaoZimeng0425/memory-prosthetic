/**
 * Search Hook
 *
 * Performs semantic search using react-query mutation.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import type { SearchParams, SearchResult } from '@memory-prosthetic/shared/apis'
import { search } from '@/apis'

interface UseSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResult['results']
  isLoading: boolean
  error: string | null
  search: () => void
  clearResults: () => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult['results']>([])

  const searchMutation = useMutation<SearchResult, Error, SearchParams>({
    ...search.mutations.search(),
    onSuccess: (data) => {
      setResults(data.results)
    },
    onError: () => {
      setResults([])
    },
  })

  const performSearch = () => {
    if (!query.trim()) return
    searchMutation.mutate({ query: query.trim(), limit: 20 })
  }

  const clearResults = () => {
    setResults([])
    setQuery('')
    searchMutation.reset()
  }

  return {
    query,
    setQuery,
    results,
    isLoading: searchMutation.isPending,
    error: searchMutation.error?.message ?? null,
    search: performSearch,
    clearResults,
  }
}
