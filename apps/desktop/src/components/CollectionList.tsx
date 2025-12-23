import { useState } from 'react'
import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'
import { invoke } from '@tauri-apps/api/core'
import { ExternalLink, Trash2 } from 'lucide-react'

import { CollectionDetail } from '@/components/CollectionDetail'
import type { Collection, CollectionListItem, CollectionStats, CommandResult } from '@/types/api'

interface CollectionListProps {
  collections: CollectionListItem[]
  stats: CollectionStats | null
  onRefresh: () => void
}

export function CollectionList({ collections, stats, onRefresh }: CollectionListProps) {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<number | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleItemClick = async (id: number) => {
    setLoadingId(id)
    try {
      const result = await invoke<CommandResult<Collection | null>>('get_collection', { id })
      if (result.data) {
        setSelectedCollection(result.data)
        setDetailOpen(true)
      }
    } catch (err) {
      console.error('Failed to get collection:', err)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    try {
      await invoke('delete_collection', { id })
      onRefresh()
    } catch (err) {
      console.error('Failed to delete collection:', err)
    }
  }

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <ExternalLink className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-medium text-lg">没有收集的内容</h3>
        <p className="max-w-sm text-muted-foreground text-sm">使用浏览器扩展收集网页内容，它们将在这里显示。</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span>共 {stats.total} 条收集</span>
            <span>本周 {stats.thisWeek} 条</span>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {collections.map((item) => (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent/50"
              key={item.id}
              onClick={() => handleItemClick(item.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate font-medium text-base">
                      {loadingId === item.id ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          {item.title}
                        </span>
                      ) : (
                        item.title
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <Badge className="text-xs" variant="outline">
                        {item.domain}
                      </Badge>
                      <span className="text-xs">{formatDate(item.createdAt)}</span>
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <a
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      href={item.url}
                      onClick={handleOpenUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                      title="在浏览器中打开"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Button
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => handleDelete(e, item.id)}
                      size="icon"
                      title="删除"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="truncate text-muted-foreground text-sm">{item.url}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CollectionDetail
        collection={selectedCollection}
        onDeleted={onRefresh}
        onOpenChange={setDetailOpen}
        open={detailOpen}
      />
    </>
  )
}
