import { CheckCircle2, Clock, FileText, Loader2, XCircle } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { useCollect } from '@/hooks/use-collect'
import { useConnection } from '@/hooks/use-connection'

function App() {
  const { status: connectionStatus, healthData, checkConnection, isConnected, isChecking } = useConnection()
  const {
    status: collectStatus,
    error: collectError,
    preview,
    collect,
    confirmCollect,
    cancelPreview,
    reset,
  } = useCollect()

  const isExtracting = collectStatus === 'extracting'
  const isPreviewing = collectStatus === 'previewing'
  const isCollecting = collectStatus === 'collecting'
  const isSuccess = collectStatus === 'success'
  const isError = collectStatus === 'error'

  // Calculate reading time (rough estimate: 200 chars per minute for Chinese)
  const readingTime = preview ? Math.max(1, Math.ceil(preview.content.length / 400)) : 0

  // Truncate content for preview
  const previewText = preview?.content.slice(0, 200) || ''

  return (
    <div className="w-80 bg-background p-4 text-foreground">
      {/* Header */}
      <header className="mb-4 text-center">
        <h1 className="m-0 font-semibold text-foreground text-xl">记忆外挂</h1>
        <p className="mt-1 text-muted-foreground text-xs">Memory Prosthetic</p>
      </header>

      {/* Status Section */}
      <div className="mb-4 rounded-xl bg-muted/50 p-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`size-2.5 shrink-0 rounded-full ${
              isChecking
                ? 'animate-pulse bg-amber-400'
                : isConnected
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  : 'bg-red-500'
            }`}
          />
          <span className="font-medium text-sm">
            {isChecking && '检查连接中...'}
            {isConnected && `已连接 v${healthData?.version}`}
            {connectionStatus === 'disconnected' && '未连接'}
          </span>
        </div>

        {connectionStatus === 'disconnected' && (
          <div className="mt-3 border-border border-t pt-3 text-center">
            <p className="m-0 text-[13px]">桌面应用未运行</p>
            <p className="mt-1 text-muted-foreground text-xs">请先启动「记忆外挂」应用</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {isPreviewing && preview && (
        <div className="mb-4 rounded-xl bg-muted/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <FileText className="size-4" />
            <span className="font-medium text-sm">预览</span>
          </div>

          <h3 className="mb-2 line-clamp-2 font-medium text-foreground text-sm">{preview.title}</h3>

          <p className="mb-2 line-clamp-3 text-muted-foreground text-xs leading-relaxed">
            {previewText}
            {preview.content.length > 200 && '...'}
          </p>

          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />约 {readingTime} 分钟
            </span>
            <span>{preview.content.length} 字</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isExtracting && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-muted/50 p-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">提取页面内容...</span>
        </div>
      )}

      {/* Collection Feedback */}
      {isSuccess && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-500/20 p-3 text-green-500">
          <CheckCircle2 className="size-5" />
          <span className="font-medium text-sm">已收集 ✓</span>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-lg bg-destructive/20 p-3 text-destructive">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="size-5" />
            <span className="font-medium text-sm">收集失败</span>
          </div>
          {collectError && <p className="mt-1 text-center text-xs opacity-80">{collectError}</p>}
          <Button className="mt-2 w-full" onClick={reset} size="sm" variant="ghost">
            重试
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="mb-4 space-y-2">
        {isConnected ? (
          isPreviewing ? (
            <>
              <Button className="w-full" disabled={isCollecting} onClick={confirmCollect}>
                {isCollecting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isCollecting ? '保存中...' : '确认收集'}
              </Button>
              <Button
                className="w-full"
                onClick={() => {
                  cancelPreview()
                  window.close()
                }}
                variant="ghost"
              >
                取消
              </Button>
            </>
          ) : (
            <Button className="w-full" disabled={isExtracting || isSuccess} onClick={collect}>
              {isExtracting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isExtracting ? '提取内容中...' : isSuccess ? '已收集 ✓' : '收集此页面'}
            </Button>
          )
        ) : (
          <Button className="w-full" disabled={isChecking} onClick={checkConnection} variant="outline">
            {isChecking ? '检查中...' : '重新检查'}
          </Button>
        )}
      </div>

      {/* Footer */}
      <footer className="border-border border-t pt-3 text-center">
        <a
          className="text-muted-foreground text-xs no-underline hover:text-foreground hover:underline"
          href="https://github.com/memory-prosthetic"
          rel="noopener noreferrer"
          target="_blank"
        >
          帮助 & 文档
        </a>
      </footer>
    </div>
  )
}

export default App
