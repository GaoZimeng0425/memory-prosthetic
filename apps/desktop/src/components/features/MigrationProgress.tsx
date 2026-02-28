/**
 * Migration Progress Component
 *
 * Displays progress of association weight migration with real-time updates
 * Monitors `association_migration:progress` events
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listen } from '@tauri-apps/api/event'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Progress } from '@memory-prosthetic/ui/components/ui/progress'

export interface MigrationProgressProps {
  current: number
  total: number
  onCancel: () => void
  isComplete?: boolean
}

interface MigrationProgressEvent {
  current: number
  total: number
  isComplete?: boolean
}

export function MigrationProgress({ current, total, onCancel, isComplete = false }: MigrationProgressProps) {
  const [progress, setProgress] = useState({ current, total })
  const [complete, setComplete] = useState(isComplete)

  useEffect(() => {
    setProgress({ current, total })
    setComplete(isComplete)
  }, [current, total, isComplete])

  useEffect(() => {
    const unlistenPromise = listen<MigrationProgressEvent>('association_migration:progress', (event) => {
      const payload = event.payload as MigrationProgressEvent
      setProgress({
        current: payload.current,
        total: payload.total,
      })
      setComplete(payload.isComplete ?? false)
    })

    return () => {
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [])

  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0
  const isFinished = complete || progress.current >= progress.total

  return (
    <div className="border-border bg-background flex items-center gap-4 rounded-lg border p-4">
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">{isFinished ? 'Migration Complete' : 'Migrating Associations...'}</p>
          <p className="text-muted-foreground text-sm">
            {progress.current} / {progress.total}
          </p>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>

      {!isFinished && (
        <Button size="icon" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      )}
    </div>
  )
}
