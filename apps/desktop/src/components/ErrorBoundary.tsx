/**
 * Error Boundary Component
 *
 * Catches React errors to prevent entire app crash.
 * Displays a user-friendly error message with recovery options.
 */

import { Component, type ReactNode } from 'react'
import { Button } from '@memory-prosthetic/ui/components/ui/button'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    // Reload the page to reset state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
          <div className="max-w-md space-y-4 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-destructive">出错了</h1>
              <p className="text-muted-foreground text-sm">应用遇到了一个意外错误</p>
            </div>

            <div className="space-y-2 rounded-lg bg-muted p-4">
              <p className="font-mono text-xs text-muted-foreground">{this.state.error?.message || 'Unknown error'}</p>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <pre className="max-h-40 overflow-auto font-mono text-xs text-muted-foreground">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                重新加载
              </Button>
              <Button onClick={() => (window.location.href = '/')} variant="outline">
                返回首页
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
