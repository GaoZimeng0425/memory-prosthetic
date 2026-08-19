import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'

type UseWebviewWindowReturn = {
  isLoading: boolean
  error: boolean
  openWebview: (url: string, title: string, containerElement?: HTMLElement | null) => Promise<void>
  updateWebview: (containerElement?: HTMLElement | null) => Promise<void>
  hideWebview: () => Promise<void>
  showWebview: () => Promise<void>
  closeWebview: () => Promise<void>
}

/**
 * Hook to manage a native Tauri webview window for displaying external URLs
 * This bypasses CSP (Content Security Policy) restrictions that affect iframes
 * The webview window is positioned to overlay the container element, making it appear embedded
 */
export const useWebviewWindow = (enabled: boolean): UseWebviewWindowReturn => {
  const webviewWindowRef = useRef<WebviewWindow | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  const openWebview = useCallback(async (url: string, _title: string, containerElement?: HTMLElement | null) => {
    try {
      setIsLoading(true)
      setError(false)

      // 验证 URL 格式
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        setError(true)
        setIsLoading(false)
        return
      }

      // 先关闭已存在的 webview
      try {
        await invoke('close_webview')
        // 等待 webview 完全关闭
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch {
        // 忽略关闭错误，webview 可能不存在
      }
      // 清除 ref 引用
      webviewWindowRef.current = null

      // 如果有容器元素，使用容器的位置和尺寸
      // 否则使用整个窗口的内容区域
      let x: number
      let y: number
      let width: number
      let height: number

      if (containerElement) {
        // 获取容器元素相对于窗口的位置和尺寸
        const rect = containerElement.getBoundingClientRect()
        x = rect.left
        y = rect.top
        width = rect.width
        height = rect.height
      } else {
        // 使用整个窗口的内容区域（考虑工具栏高度）
        const toolbarHeight = 56
        x = 0
        y = toolbarHeight
        const mainWindow = getCurrentWindow()
        const mainSize = await mainWindow.innerSize()
        width = mainSize.width
        height = mainSize.height - toolbarHeight
      }

      // 通过 Rust 命令在主窗口内嵌入 webview（不是独立窗口）
      await invoke('create_webview', {
        url,
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      })

      setIsLoading(false)
      setError(false)
    } catch (err) {
      console.error('Failed to open webview window:', err)
      setError(true)
      setIsLoading(false)
    }
  }, [])

  const updateWebview = useCallback(async (containerElement?: HTMLElement | null) => {
    try {
      // 计算新的位置和尺寸
      let x: number
      let y: number
      let width: number
      let height: number

      if (containerElement) {
        const rect = containerElement.getBoundingClientRect()
        x = rect.left
        y = rect.top
        width = rect.width
        height = rect.height
      } else {
        const toolbarHeight = 56
        x = 0
        y = toolbarHeight
        const mainWindow = getCurrentWindow()
        const mainSize = await mainWindow.innerSize()
        width = mainSize.width
        height = mainSize.height - toolbarHeight
      }

      // 更新 webview 的位置和大小
      // 如果 webview 不存在，这个调用会失败，我们忽略错误
      await invoke('update_webview', {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      })
    } catch {
      // 忽略错误，webview 可能不存在或已关闭
    }
  }, [])

  const hideWebview = useCallback(async () => {
    try {
      await invoke('hide_webview')
    } catch {
      // 忽略错误，webview 可能不存在
    }
  }, [])

  const showWebview = useCallback(async () => {
    try {
      await invoke('show_webview')
    } catch {
      // 忽略错误，webview 可能不存在
    }
  }, [])

  const closeWebview = useCallback(async () => {
    try {
      await invoke('close_webview')
    } catch {
      // 忽略错误，webview 可能已经关闭或不存在
    }
    // 清除 ref 引用
    webviewWindowRef.current = null
    setIsLoading(false)
    setError(false)
  }, [])

  // 当 enabled 变为 false 时，关闭 webview
  useEffect(() => {
    if (!enabled) {
      void closeWebview()
    }
  }, [enabled, closeWebview])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      void closeWebview()
    }
  }, [closeWebview])

  return {
    isLoading,
    error,
    openWebview,
    updateWebview,
    hideWebview,
    showWebview,
    closeWebview,
  }
}
