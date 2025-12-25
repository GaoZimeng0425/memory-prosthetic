/**
 * Search Window Component
 *
 * Spotlight-style search overlay for quick access.
 */

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { emitTo } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ExternalLink, Search, X } from 'lucide-react'

import { Badge } from '@memory-prosthetic/ui/components/ui/badge'
import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { Input } from '@memory-prosthetic/ui/components/ui/input'
import { search } from '@/apis'
import { Link } from '@/components/Link'

export function SearchWindow() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const showTimeRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const unlistenFnRef = useRef<(() => void) | null>(null)

  // 防抖处理查询
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 150)

    return () => clearTimeout(timer)
  }, [query])

  // 使用 react-query 执行搜索
  const { data: results = [], isFetching: isSearching } = useQuery({
    ...search.queries.results(debouncedQuery, 8),
    enabled: debouncedQuery.length > 0,
    select: (data) => data.results,
  })

  // 当搜索结果更新时，重置选中索引
  useEffect(() => {
    if (results.length > 0) {
      setSelectedIndex(0)
    }
  }, [results.length])

  // Auto-focus on mount and record show time for debounce
  useEffect(() => {
    inputRef.current?.focus()
    showTimeRef.current = Date.now()

    // Setup window (rounded corners are set in Rust)
    // No need to modify shadow or background - let macOS handle it naturally
  }, [])

  // Hide window when it loses focus using Tauri native window events
  useEffect(() => {
    isMountedRef.current = true

    const setupListener = async () => {
      try {
        const currentWindow = getCurrentWindow()
        const unlisten = await currentWindow.onFocusChanged(({ payload: focused }) => {
          // 组件已卸载则忽略
          if (!isMountedRef.current) return

          console.log('[SearchWindow] Focus changed:', focused)

          if (focused) {
            // 窗口获得焦点时，更新显示时间戳（用于防抖）
            showTimeRef.current = Date.now()
            // 自动聚焦搜索框
            // 使用 setTimeout 确保窗口完全激活后再聚焦
            setTimeout(() => {
              if (isMountedRef.current && inputRef.current) {
                inputRef.current.focus()
                console.log('[SearchWindow] Input focused on window activation')
              }
            }, 50)
          } else {
            // 防抖：窗口显示后 100ms 内忽略失焦事件
            const timeSinceShow = Date.now() - showTimeRef.current
            console.log('[SearchWindow] Lost focus, time since show:', timeSinceShow)
            if (timeSinceShow > 100) {
              console.log('[SearchWindow] Hiding window due to focus loss')
              void invoke('hide_search_window')
            }
          }
        })
        unlistenFnRef.current = unlisten
      } catch (error) {
        console.error('[SearchWindow] Failed to setup focus listener:', error)
      }
    }

    void setupListener()

    return () => {
      isMountedRef.current = false
      if (unlistenFnRef.current) {
        unlistenFnRef.current()
        unlistenFnRef.current = null
      }
    }
  }, [])

  const handleResultClick = async (id: number) => {
    try {
      console.log('[SearchWindow] Clicking result with id:', id)
      // 发送事件到主窗口，让它打开对应的文章
      await emitTo('main', 'search:select', { id })
      console.log('[SearchWindow] Event emitted successfully to main window')
      // 先激活主窗口，再隐藏搜索窗口
      // 顺序很重要：hide_search_window 会检查主窗口是否已聚焦来决定是否阻止自动聚焦
      await invoke('show_main_window')
      await invoke('hide_search_window')
    } catch (error) {
      console.error('[SearchWindow] Failed to handle result click:', error)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          void invoke('hide_search_window')
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          if (results[selectedIndex]) {
            void handleResultClick(results[selectedIndex].id)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, handleResultClick])

  const handleClose = () => {
    void invoke('hide_search_window')
  }

  // 处理按钮点击时的焦点问题
  // 当 input 聚焦时，点击按钮的第一下会先让 input 失去焦点
  // 通过阻止 mousedown 的默认行为来解决这个问题
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    // 让 input 失去焦点，这样点击事件可以正常触发
    inputRef.current?.blur()
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-2xl backdrop-blur-xl">
      {/* Search input */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          className="flex-1 border-0 bg-transparent px-0 text-lg shadow-none focus-visible:ring-0"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索你的记忆..."
          ref={inputRef}
          value={query}
        />
        {isSearching && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
        <Button
          className="h-8 w-8"
          onClick={handleClose}
          onMouseDown={handleButtonMouseDown}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query && !isSearching ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">没有找到相关内容</p>
          </div>
        ) : (
          <div className="divide-y">
            {results.map((result, index) => (
              <button
                className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                key={result.id}
                onClick={() => handleResultClick(result.id)}
                onMouseDown={handleButtonMouseDown}
                onMouseEnter={() => setSelectedIndex(index)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{result.title}</p>
                  <p className="mt-1 truncate text-muted-foreground text-xs">{result.url}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {result.similarity != null && (
                    <Badge className="text-xs" variant="secondary">
                      {Math.round((result.similarity ?? 0) * 100)}%
                    </Badge>
                  )}
                  <Link
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    href={result.url}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      handleButtonMouseDown(e)
                    }}
                    title="在浏览器中打开"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-muted-foreground text-xs">
        <span>↑↓ 导航 · Enter 打开 · Esc 关闭</span>
        <span>⌘⇧Space 快速唤起</span>
      </div>
    </div>
  )
}
