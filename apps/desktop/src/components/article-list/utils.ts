import { groupByTime as groupByTimeBase, type TimeGroup } from '@memory-prosthetic/shared/utils'

import type { CollectionListItem } from '@/types/api'

export type { TimeGroup as ArticleGroup }

export { formatRelativeTime as formatTime, getDomain } from '@memory-prosthetic/shared/utils'

export function groupByTime(collections: CollectionListItem[]): TimeGroup<CollectionListItem>[] {
  return groupByTimeBase(collections, {
    getDate: (item) => item.createdAt,
  })
}
