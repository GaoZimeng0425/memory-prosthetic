import { groupByTime as groupByTimeBase, type TimeGroup } from '@memory-prosthetic/shared/utils'
import type { CollectionListItem } from '@/types/api'

export type { TimeGroup as ArticleGroup }

export { formatRelativeTime as formatTime, getDomain } from '@memory-prosthetic/shared/utils'

export function groupByTime(collections: CollectionListItem[]): TimeGroup<CollectionListItem>[] {
  return groupByTimeBase(collections, {
    getDate: (item) => item.createdAt,
  })
}

/**
 * Extract the first image URL from markdown content
 * Matches markdown image syntax: ![alt](url)
 */
export function extractFirstImageUrl(markdown: string): string | undefined {
  if (!markdown) return undefined

  // Match markdown image syntax: ![alt](url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g
  const match = imageRegex.exec(markdown)

  if (match?.[1]) {
    const url = match[1].trim()
    // Filter out data URIs and invalid URLs
    if (url && !url.startsWith('data:') && (url.startsWith('http://') || url.startsWith('https://'))) {
      return url
    }
  }

  return undefined
}
