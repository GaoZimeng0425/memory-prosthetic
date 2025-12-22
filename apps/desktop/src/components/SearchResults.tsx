import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { ExternalLink } from 'lucide-react'

import type { SearchResultItem } from '@/types/api'

interface SearchResultsProps {
  results: SearchResultItem[]
  query: string
}

export function SearchResults({ results, query }: SearchResultsProps) {
  if (results.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500'
    if (similarity >= 0.6) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const extractDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Found {results.length} results for "{query}"
      </p>

      <div className="space-y-3">
        {results.map((result) => (
          <Card className="transition-colors hover:bg-accent/50" key={result.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate font-medium text-base">{result.title}</CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2">
                    <span className="truncate">{extractDomain(result.url)}</span>
                    <span className="text-xs">•</span>
                    <span className="text-xs">{formatDate(result.createdAt)}</span>
                  </CardDescription>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Badge className={`${getSimilarityColor(result.similarity)} text-white`} variant="secondary">
                    {formatSimilarity(result.similarity)}
                  </Badge>
                  <a
                    className="text-muted-foreground hover:text-foreground"
                    href={result.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    title="Open in browser"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="truncate text-muted-foreground text-sm">{result.url}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
