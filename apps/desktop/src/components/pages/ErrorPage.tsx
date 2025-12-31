import { AlertCircle, FileText, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@memory-prosthetic/ui/components/ui/alert'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@memory-prosthetic/ui/components/ui/card'

type ErrorPageProps = {
  title?: string
  message: string
  details?: string
  onRetry?: () => void
}

export const ErrorPage = ({ title = '应用启动失败', message, details, onRetry }: ErrorPageProps) => {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="mt-1">应用无法正常启动</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误信息</AlertTitle>
            <AlertDescription className="mt-2">{message}</AlertDescription>
          </Alert>

          {details && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                详细信息
              </div>
              <div className="rounded-md border bg-muted/50 p-3">
                <pre className="wrap-break-word whitespace-pre-wrap text-muted-foreground text-xs">{details}</pre>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-4 sm:flex-row">
            {onRetry && (
              <Button className="flex-1" onClick={onRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                重试
              </Button>
            )}
            <Button className="flex-1" onClick={handleReload} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              重新加载应用
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="mb-2 font-medium">可能的解决方案：</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>检查应用数据目录的权限设置</li>
              <li>确认有足够的磁盘空间</li>
              <li>检查系统日志以获取更多信息</li>
              <li>尝试重新安装应用</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
