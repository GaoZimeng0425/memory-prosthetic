import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import { useCollect } from '@/hooks/use-collect'
import { useConnection } from '@/hooks/use-connection'

function App() {
  const { status: connectionStatus, healthData, checkConnection, isConnected, isChecking } = useConnection()
  const { status: collectStatus, error: collectError, collect, reset } = useCollect()

  const isCollecting = collectStatus === 'extracting' || collectStatus === 'collecting'
  const isSuccess = collectStatus === 'success'
  const isError = collectStatus === 'error'

  return (
    <div className="w-80 bg-linear-to-br from-slate-900 to-slate-800 p-4 text-slate-100">
      {/* Header */}
      <header className="mb-5 text-center">
        <h1 className="m-0 font-semibold text-white text-xl">记忆外挂</h1>
        <p className="mt-1 text-slate-400 text-xs">Memory Prosthetic</p>
      </header>

      {/* Status Section */}
      <div className="mb-4 rounded-xl bg-white/5 p-4">
        <div className="flex items-center gap-2.5">
          {/* Status Dot */}
          <span
            className={`size-2.5 shrink-0 rounded-full ${
              isChecking
                ? 'animate-pulse bg-amber-400'
                : isConnected
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  : 'bg-red-500'
            }`}
          />
          {/* Status Text */}
          <span className="font-medium text-sm">
            {isChecking && '检查连接中...'}
            {isConnected && `已连接 v${healthData?.version}`}
            {connectionStatus === 'disconnected' && '未连接'}
          </span>
        </div>

        {connectionStatus === 'disconnected' && (
          <div className="mt-3 border-white/10 border-t pt-3 text-center">
            <p className="m-0 text-[13px]">桌面应用未运行</p>
            <p className="mt-1 text-slate-400 text-xs">请先启动「记忆外挂」应用</p>
          </div>
        )}
      </div>

      {/* Collection Feedback */}
      {isSuccess && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-green-500/20 p-3 text-green-400">
          <CheckCircle2 className="size-5" />
          <span className="font-medium text-sm">已收集 ✓</span>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-red-400">
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
      <div className="mb-4">
        {isConnected ? (
          <Button className="w-full" disabled={isCollecting || isSuccess} onClick={collect}>
            {isCollecting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {collectStatus === 'extracting' && '提取内容中...'}
            {collectStatus === 'collecting' && '保存中...'}
            {collectStatus === 'idle' && '收集此页面'}
            {isSuccess && '已收集 ✓'}
            {isError && '重新收集'}
          </Button>
        ) : (
          <Button className="w-full" disabled={isChecking} onClick={checkConnection} variant="outline">
            {isChecking ? '检查中...' : '重新检查'}
          </Button>
        )}
      </div>

      {/* Footer */}
      <footer className="border-white/10 border-t pt-3 text-center">
        <a
          className="text-slate-400 text-xs no-underline hover:text-slate-300 hover:underline"
          href="https://github.com/user/memory-prosthetic"
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
