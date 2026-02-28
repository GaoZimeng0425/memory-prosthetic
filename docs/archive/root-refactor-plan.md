# __root.tsx 拆分方案

## 问题分析

### 当前文件结构

```typescript
// ❌ 400+ 行的根组件
// routes/__root.tsx

function RootLayout() {
  // ─── 窗口管理 (40 行) ───
  const [isSearchWindow, setIsSearchWindow] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  useEffect(() => { /* 检测窗口类型 */ }, [])
  useEffect(() => { /* 重定向路由 */ }, [])

  // ─── 数据获取 (20 行) ───
  const { stats: syncStats } = useSidebarSync()
  const sidebarStats = { /* 计算统计数据 */ }

  // ─── 事件监听 (60 行) ───
  useEffect(() => { /* 监听搜索结果选择 */ }, [])
  useEffect(() => { /* 监听托盘菜单导航 */ }, [])

  // ─── 全局快捷键 (30 行) ───
  useHotkey({ key: 'b', metaKey: true, /* ... */ })
  useHotkey({ key: 'n', metaKey: true, /* ... */ })

  // ─── 回调函数 (40 行) ───
  const handleSearchResultSelect = useCallback(/* ... */, [])
  const handleOpenUrl = useCallback(/* ... */, [])
  const handleSearchClick = () => { /* ... */ }

  // ─── 渲染逻辑 (40 行) ───
  if (isSearchWindow) return <Outlet />
  return (
    <DialogProvider>
      <RootLayoutContent {...props} />
    </DialogProvider>
  )

  // ─── DialogComponents (120 行) ───
  function DialogComponents() { /* ... */ }
}
```

**问题：**
- 违反单一职责原则（至少 6 个职责）
- 难以测试（无法单独测试窗口管理、快捷键等）
- 难以复用（窗口管理逻辑可能在其他地方需要）
- 认知负担高（新开发者需要理解 400 行代码）

---

## 修复方案

### 目标结构

```
components/
├── app/
│   ├── MainWindowProvider.tsx      # 窗口类型检测和状态
│   ├── RouteRedirector.tsx         # 路由重定向逻辑
│   ├── GlobalHotkeys.tsx           # 全局快捷键
│   ├── EventListener.tsx           # Tauri 事件监听
│   └── SearchOverlay.tsx           # 搜索相关（已存在）
│
routes/
└── __root.tsx                      # 简化为组合组件
```

---

### 第一步：提取窗口类型检测

```typescript
// components/app/MainWindowProvider.tsx
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

type WindowType = 'main' | 'search' | 'webview'

interface WindowContextValue {
  windowType: WindowType
  isMainWindow: boolean
  isSearchWindow: boolean
}

const WindowContext = createContext<WindowContextValue | undefined>(undefined)

export function useWindow() {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindow must be used within WindowProvider')
  }
  return context
}

export function MainWindowProvider({ children }: { children: ReactNode }) {
  const [windowType, setWindowType] = useState<WindowType>('main')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const detectWindowType = async () => {
      try {
        const currentWindow = getCurrentWindow()
        const label = currentWindow.label

        if (label === 'search') {
          setWindowType('search')
        } else if (label.startsWith('webview')) {
          setWindowType('webview')
        } else {
          setWindowType('main')
        }
      } catch (error) {
        console.error('[WindowProvider] Failed to detect window type:', error)
        setWindowType('main')
      } finally {
        setIsLoading(false)
      }
    }

    detectWindowType()
  }, [])

  if (isLoading) {
    return null // 或显示加载状态
  }

  const value: WindowContextValue = {
    windowType,
    isMainWindow: windowType === 'main',
    isSearchWindow: windowType === 'search',
  }

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>
}
```

---

### 第二步：提取路由重定向

```typescript
// components/app/RouteRedirector.tsx
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useWindow } from './MainWindowProvider'

/**
 * 处理初始路由重定向
 * - 搜索窗口 → /search
 * - 主窗口 → /all
 * - 旧路由 → 新路由
 */
export function RouteRedirector() {
  const navigate = useNavigate()
  const { windowType, isSearchWindow } = useWindow()

  // 重定向根路径
  useEffect(() => {
    if (window.location.pathname === '/') {
      const target = isSearchWindow ? '/search' : '/all'
      void navigate({ to: target, replace: true })
    }
  }, [navigate, isSearchWindow])

  // 重定向搜索窗口到正确路由
  useEffect(() => {
    if (isSearchWindow && window.location.pathname !== '/search') {
      void navigate({ to: '/search', replace: true })
    }
  }, [navigate, isSearchWindow])

  // 重定向旧的文章路由
  useEffect(() => {
    if (isSearchWindow) return

    const pathname = window.location.pathname
    const articleMatch = pathname.match(/^\/article\/(\d+)$/)

    if (articleMatch) {
      const articleId = articleMatch[1]
      console.log('[RouteRedirector] Redirecting old article route:', pathname)
      void navigate({
        to: '/all/article/$articleId',
        params: { articleId },
        replace: true,
      })
    }
  }, [navigate, isSearchWindow])

  return null // 不渲染任何内容
}
```

---

### 第三步：提取全局快捷键

```typescript
// components/app/GlobalHotkeys.tsx
import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useHotkey } from '@/hooks/use-hotkey'
import { useWindow } from './MainWindowProvider'
import { useDialog } from '@/contexts/DialogContext'

/**
 * 全局快捷键处理
 *
 * 快捷键：
 * - Cmd+B: 切换侧边栏
 * - Cmd+N: 新建笔记
 * - Cmd+,: 打开设置
 */
export function GlobalHotkeys({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void
}) {
  const navigate = useNavigate()
  const { isSearchWindow } = useWindow()
  const { openSettingsDialog } = useDialog()

  // Cmd+B: 切换侧边栏（仅主窗口）
  useHotkey({
    key: 'b',
    metaKey: true,
    enabled: !isSearchWindow,
    onPress: onToggleSidebar,
  })

  // Cmd+N: 新建笔记（仅主窗口）
  useHotkey({
    key: 'n',
    metaKey: true,
    enabled: !isSearchWindow,
    onPress: () => {
      void navigate({ to: '/note/new' })
    },
  })

  // Cmd+,: 打开设置（仅主窗口）
  useHotkey({
    key: ',',
    metaKey: true,
    enabled: !isSearchWindow,
    onPress: openSettingsDialog,
  })

  // Cmd+K: 打开搜索（所有窗口）
  useHotkey({
    key: 'k',
    metaKey: true,
    onPress: () => {
      // TODO: 实现全局搜索快捷键
    },
  })

  return null
}
```

---

### 第四步：提取事件监听器

```typescript
// components/app/EventListeners.tsx
import { useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useWindow } from './MainWindowProvider'
import type { SearchResult } from '@/types/api'

interface EventListenersProps {
  onSearchResultSelect?: (result: SearchResult) => void
  onNavigateToSettings?: () => void
}

/**
 * Tauri 事件监听器
 *
 * 监听事件：
 * - search:select - 搜索结果选择
 * - navigate - 导航指令（来自托盘菜单）
 */
export function EventListeners({
  onSearchResultSelect,
  onNavigateToSettings,
}: EventListenersProps) {
  const navigate = useNavigate()
  const { isSearchWindow } = useWindow()

  // 监听搜索结果选择（仅主窗口）
  useEffect(() => {
    if (isSearchWindow) return

    const unlistenPromise = listen<{ id: number }>('search:select', async (event) => {
      console.log('[EventListeners] search:select:', event.payload)
      const { id } = event.payload

      try {
        // 显示主窗口
        await invoke('show_main_window')
      } catch (error) {
        console.error('[EventListeners] Failed to show main window:', error)
        // 备用方案
        try {
          const mainWindow = await WebviewWindow.getByLabel('main')
          if (mainWindow) {
            await mainWindow.show()
            await mainWindow.unminimize()
            await mainWindow.setFocus()
          }
        } catch (fallbackError) {
          console.error('[EventListeners] Fallback also failed:', fallbackError)
        }
      }

      // 导航到文章
      void navigate({
        to: '/all/article/$articleId',
        params: { articleId: String(id) },
        resetScroll: false,
      })

      // 调用回调
      onSearchResultSelect?.({ id } as SearchResult)
    })

    return () => {
      unlistenPromise.then((unlisten: UnlistenFn) => unlisten())
    }
  }, [navigate, isSearchWindow, onSearchResultSelect])

  // 监听导航指令（仅主窗口）
  useEffect(() => {
    if (isSearchWindow) return

    const unlistenPromise = listen<string>('navigate', async (event) => {
      console.log('[EventListeners] navigate:', event.payload)
      const target = event.payload

      if (target === 'settings') {
        try {
          await invoke('show_main_window')
        } catch (error) {
          console.error('[EventListeners] Failed to show main window:', error)
        }
        onNavigateToSettings?.()
      }
    })

    return () => {
      unlistenPromise.then((unlisten: UnlistenFn) => unlisten())
    }
  }, [isSearchWindow, onNavigateToSettings])

  return null
}
```

---

### 第五步：简化 `__root.tsx`

```typescript
// routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { DialogProvider } from '@/contexts/DialogContext'
import { MainWindowProvider, useWindow } from '@/components/app/MainWindowProvider'
import { RouteRedirector } from '@/components/app/RouteRedirector'
import { GlobalHotkeys } from '@/components/app/GlobalHotkeys'
import { EventListeners } from '@/components/app/EventListeners'
import { AppSidebar } from '@/components/AppSidebar'
import { DragRegion } from '@/components/DragRegion'
import { SearchOverlay } from '@/components/SearchOverlay'
import { useSidebarSync } from '@/hooks/use-sidebar-sync'
import { useDialog } from '@/contexts/DialogContext'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <MainWindowProvider>
      <RouteRedirector />
      <RootLayoutContent />
    </MainWindowProvider>
  )
}

function RootLayoutContent() {
  const { isSearchWindow } = useWindow()
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const navigate = useNavigate()
  const { openSettingsDialog } = useDialog()

  // 获取侧边栏数据（仅主窗口）
  const { stats: syncStats } = useSidebarSync()

  const sidebarStats = {
    total: syncStats?.total ?? 0,
    starred: syncStats?.starred ?? 0,
    recent: syncStats?.thisWeek ?? 0,
    archived: syncStats?.archived ?? 0,
    deleted: 0,
  }

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    void navigate({
      to: '/all/article/$articleId',
      params: { articleId: String(result.id) },
    })
    setIsSearchOpen(false)
  }, [navigate])

  // 搜索窗口只渲染内容
  if (isSearchWindow) {
    return <Outlet />
  }

  // 主窗口渲染完整布局
  return (
    <DialogProvider>
      <GlobalHotkeys onToggleSidebar={() => setSidebarState(
        s => s === 'expanded' ? 'collapsed' : 'expanded'
      )} />
      <EventListeners
        onSearchResultSelect={handleSearchResultSelect}
        onNavigateToSettings={openSettingsDialog}
      />

      <div className="flex h-screen overflow-hidden bg-secondary text-foreground">
        <DragRegion className="h-8 shrink-0 cursor-move" />

        <AppSidebar
          className="shrink-0 pt-4"
          state={sidebarState}
          onStateChange={setSidebarState}
          onSearchClick={() => setIsSearchOpen(true)}
          onSettingsClick={openSettingsDialog}
          stats={sidebarStats}
        />

        <Outlet />
      </div>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSearchResultSelect}
      />
    </DialogProvider>
  )
}
```

**结果：从 400+ 行减少到约 100 行！**

---

## 测试策略

### 单元测试

```typescript
// components/app/__tests__/MainWindowProvider.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useWindow } from '../MainWindowProvider'

describe('MainWindowProvider', () => {
  it('should detect main window', async () => {
    const { result } = renderHook(() => useWindow(), {
      wrapper: MainWindowProvider,
    })

    await waitFor(() => {
      expect(result.current.isMainWindow).toBe(true)
    })
  })
})

// components/app/__tests__/GlobalHotkeys.test.tsx
import { render } from '@testing-library/react'
import { GlobalHotkeys } from '../GlobalHotkeys'
import { useHotkeyMock } from '@/hooks/use-hotkey.mock'

describe('GlobalHotkeys', () => {
  it('should register Cmd+B shortcut', () => {
    const onToggleSidebar = jest.fn()
    render(<GlobalHotkeys onToggleSidebar={onToggleSidebar} />)

    // 模拟快捷键
    useHotkeyMock.press('Cmd+B')

    expect(onToggleSidebar).toHaveBeenCalled()
  })
})
```

### 集成测试

```typescript
// routes/__root.test.tsx
import { render, screen } from '@testing-library/react'
import { RootLayout } from './__root'

describe('RootLayout', () => {
  it('should render sidebar in main window', () => {
    render(<RootLayout />)

    expect(screen.getByRole('complementary', { name: /sidebar/i })).toBeInTheDocument()
  })

  it('should not render sidebar in search window', () => {
    render(<RootLayout windowType="search" />)

    expect(screen.queryByRole('complementary', { name: /sidebar/i })).not.toBeInTheDocument()
  })
})
```

---

## 迁移步骤

### 第一步：创建新组件（不破坏现有代码）

```bash
mkdir -p apps/desktop/src/components/app
```

1. 创建 `MainWindowProvider.tsx`
2. 创建 `RouteRedirector.tsx`
3. 创建 `GlobalHotkeys.tsx`
4. 创建 `EventListeners.tsx`

### 第二步：逐步迁移

```typescript
// routes/__root.tsx

// 阶段 1: 添加新组件（保留旧代码）
function RootLayout() {
  // 旧代码
  const [isSearchWindow, setIsSearchWindow] = useState(false)

  // 新代码（并行运行）
  return (
    <MainWindowProvider>
      <RouteRedirector />
      {/* 旧代码继续运行 */}
    </MainWindowProvider>
  )
}

// 阶段 2: 切换到新代码
function RootLayout() {
  return (
    <MainWindowProvider>
      <RouteRedirector />
      <GlobalHotkeys onToggleSidebar={/*...*/} />
      <EventListeners />
      {/* ... */}
    </MainWindowProvider>
  )
}

// 阶段 3: 删除旧代码
```

### 第三步：测试

```bash
# 运行所有测试
npm run test

# 手动测试
npm run dev
```

测试清单：
- [ ] 主窗口侧边栏显示
- [ ] 搜索窗口无侧边栏
- [ ] Cmd+B 切换侧边栏
- [ ] Cmd+N 新建笔记
- [ ] Cmd+, 打开设置
- [ ] 搜索结果选择
- [ ] 托盘菜单导航

### 第四步：清理

```bash
# 确认测试通过后，删除临时文件
rm -rf apps/desktop/src/components/app/temp
```

---

## 对比总结

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 文件行数 | 400+ 行 | ~100 行 |
| 组件数量 | 1 个 | 5 个 |
| 可测试性 | ❌ 困难 | ✅ 简单 |
| 可复用性 | ❌ 无 | ✅ 高 |
| 职责数量 | 6+ 个 | 1 个 |
| 依赖关系 | 紧耦合 | 松耦合 |

---

## 建议

✅ **立即实施**

**工作量：**
- 提取组件：2 小时
- 编写测试：1 小时
- 迁移和测试：1 小时
- **总计：4 小时**

**优先级：高**
- 提高代码可维护性
- 便于新开发者理解
- 为未来功能（如多窗口）打好基础
