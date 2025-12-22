// API types for the desktop app

export interface SearchRequest {
  query: string
  limit?: number
}

export interface SearchResultItem {
  id: number
  url: string
  title: string
  similarity: number
  createdAt: string
}

export interface SearchResponse {
  results: SearchResultItem[]
  query: string
}

export interface CommandResult<T> {
  data: T
}

export interface CollectionListItem {
  id: number
  url: string
  title: string
  domain: string
  createdAt: string
}

export interface CollectionStats {
  total: number
  thisWeek: number
  lastCollectedAt: string | null
}
