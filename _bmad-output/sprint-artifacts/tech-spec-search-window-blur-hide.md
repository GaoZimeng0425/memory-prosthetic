# Tech-Spec: SearchWindow 失焦自动隐藏

**Created:** 2025-12-24
**Status:** Completed

## Overview

### Problem Statement

当前 SearchWindow 使用 Web `window.blur` 事件监听失焦，但在 Tauri 桌面应用中不可靠。用户希望实现类似 Raycast 的行为：窗口失焦时自动隐藏。

**根本原因分析：**

- Web `window` 对象代表 WebView 内部窗口，不是操作系统级窗口
- 用户点击桌面/其他应用时，OS 级别窗口失焦，但 WebView 可能不触发 `blur` 事件
- 当前实现在错误的抽象层监听事件

### Solution

使用 Tauri 原生窗口事件系统监听 `blur` 事件，替代 Web API。当 search 窗口失去焦点时自动隐藏。

### Scope

**In:**

- 监听 Tauri 窗口 blur 事件
- 失焦时自动隐藏 SearchWindow

**Out:**

- 主窗口行为不变
- 不修改快捷键逻辑

## Context for Development

### Codebase Patterns

```typescript
// Tauri 事件监听模式
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

// 在 useEffect 中设置监听器并返回清理函数
useEffect(() => {
  const unlisten = listen('event-name', handler)
  return () => { unlisten.then(fn => fn()) }
}, [])
```

### Files to Reference

| 文件 | 用途 |
|------|------|
| `apps/desktop/src/pages/SearchWindow.tsx` | 需要修改 - 替换 blur 监听逻辑 |
| `apps/desktop/src-tauri/src/lib.rs` | 参考 - `hide_search_window` 命令已存在 |
| `apps/desktop/src-tauri/tauri.conf.json` | 参考 - 窗口配置 |

### Technical Decisions

1. **使用 `@tauri-apps/api/window` 的 `onFocusChanged`** - Tauri 窗口 API 提供的原生失焦事件
2. **保留 Escape 键关闭** - 作为备用关闭方式
3. **移除 Web blur 事件** - 不再需要，避免重复

## Implementation Plan

### Tasks

- [x] Task 1: 导入 `getCurrentWindow` from `@tauri-apps/api/window`
- [x] Task 2: 移除现有的 Web `window.blur` 事件监听（第 56-63 行）
- [x] Task 3: 添加 `onFocusChanged` 监听，失焦时隐藏
- [x] Task 4: 添加防抖逻辑 - 窗口显示后 100ms 内忽略 blur 事件（防止快速 toggle 闪烁）
- [x] Task 5: 确保 cleanup 正确移除监听器
- [x] Task 6: 测试快速 toggle 场景和正常失焦场景

### Acceptance Criteria

- [x] AC 1: Given SearchWindow 可见，When 点击窗口外部或切换到其他应用，Then 窗口自动隐藏
- [x] AC 2: Given SearchWindow 可见，When 按 Escape 键，Then 窗口隐藏（现有行为保持）
- [x] AC 3: Given SearchWindow 隐藏，When 按全局快捷键，Then 窗口显示并获得焦点
- [x] AC 4: Given 快速连续按快捷键（间隔 < 100ms），When toggle 触发，Then 不会出现闪烁或意外隐藏

## Additional Context

### Dependencies

- `@tauri-apps/api` (已安装)

### Testing Strategy

⚠️ **重要：必须在 Tauri 环境中测试，不要只在浏览器中验证！**

Web 行为与 Tauri 桌面行为不同。`window.blur` 在浏览器中可能工作，但在 Tauri WebView 中不触发。

**测试步骤：**

1. 运行 `bun tauri dev` 启动完整 Tauri 应用
2. 按快捷键（⌘⇧Space）打开 SearchWindow
3. 点击桌面或其他应用 → 验证窗口隐藏 ✓
4. 再次按快捷键 → 验证窗口显示并获得焦点 ✓
5. 按 Escape → 验证窗口隐藏 ✓
6. 快速连续按快捷键 3 次 → 验证无闪烁 ✓

### Notes

- Tauri 2.x 使用 `getCurrentWindow().onFocusChanged()` API，与 Tauri 1.x 有所不同
- **防抖值 100ms 需实测调整**：合理范围 50-200ms，根据实际体验微调
- 使用 `isMounted` flag 防止组件卸载后的异步回调执行

### 代码示例

```typescript
import { getCurrentWindow } from '@tauri-apps/api/window'

// 使用 ref 追踪窗口显示时间，实现防抖
const showTimeRef = useRef<number>(0)

// 监听窗口显示事件，记录时间戳
useEffect(() => {
  showTimeRef.current = Date.now()
}, []) // 组件挂载时记录

// 监听 Tauri 原生窗口失焦事件
useEffect(() => {
  let isMounted = true
  const currentWindow = getCurrentWindow()

  const unlisten = currentWindow.onFocusChanged(({ payload: focused }) => {
    // 组件已卸载则忽略
    if (!isMounted) return

    // 防抖：窗口显示后 100ms 内忽略失焦事件
    const timeSinceShow = Date.now() - showTimeRef.current
    if (!focused && timeSinceShow > 100) {
      void invoke('hide_search_window')
    }
  })

  return () => {
    isMounted = false
    unlisten.then(fn => fn())
  }
}, [])
```

### 边缘情况处理

| 场景 | 处理方式 |
|------|---------|
| 快速 toggle | 100ms 防抖，忽略瞬间的 blur 事件 |
| 窗口已隐藏时收到 blur | Tauri 不会对隐藏窗口触发 focus 事件 |
| 组件卸载后异步回调 | `isMounted` flag 阻止执行 |
| cleanup 竞态条件 | 先设 `isMounted = false`，再清理监听器 |
