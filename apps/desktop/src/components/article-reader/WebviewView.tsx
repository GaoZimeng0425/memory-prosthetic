import { ExternalLink, Globe } from 'lucide-react'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import type { Collection } from '@/types/api'

type WebviewViewProps = {
  article: Collection
  webviewLoading: boolean
  webviewError: boolean | null
  onOpenUrl: (url: string) => void
  onSwitchToMarkdown: () => void
}

export const WebviewView = ({
  article,
  webviewLoading,
  webviewError,
  onOpenUrl,
  onSwitchToMarkdown,
}: WebviewViewProps) => {
  return (
    <div className="relative h-full w-full">
      {/* 原生 webview 窗口状态显示 */}
      {webviewLoading && !webviewError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">正在打开网页窗口...</p>
        </div>
      )}
      {/* 错误状态覆盖层 */}
      {webviewError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <div className="rounded-full bg-muted p-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg">无法打开网页窗口</h3>
            <p className="mb-4 max-w-md text-muted-foreground text-sm">
              无法创建网页窗口。您可以在外部浏览器中打开此网页。
            </p>
            <div className="flex items-center justify-center gap-2">
              {article.url && (
                <Button
                  onClick={() => {
                    const url = article.url
                    if (url) {
                      onOpenUrl(url)
                    }
                  }}
                  size="sm"
                  variant="default"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  在浏览器中打开
                </Button>
              )}
              <Button onClick={onSwitchToMarkdown} size="sm" variant="outline">
                返回原文视图
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* webview 窗口已打开，显示提示信息（短暂显示后隐藏） */}
      {!webviewLoading && !webviewError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-8 text-center backdrop-blur-sm">
          <div className="rounded-full bg-muted p-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="mb-2 font-medium text-lg">网页正在加载中...</h3>
            <p className="mb-4 max-w-md text-muted-foreground text-sm">网页内容将在上方显示，可以完全绕过跨域限制。</p>
          </div>
        </div>
      )}
    </div>
  )
}
