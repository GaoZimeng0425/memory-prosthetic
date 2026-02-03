# 开发指南 (Development Guide)

**项目:** Memory Prosthetic
**更新日期:** 2025-12-22
**仓库类型:** Monorepo (Bun Workspaces)

---

## 📋 环境要求

### 必需工具

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 18.x | 20.x+ | JavaScript 运行时 |
| Bun | 1.0 | 1.x | 包管理器和运行时 |
| Rust | 1.70 | 1.75+ | 后端语言 |
| Xcode | 14.x | 15.x | macOS 构建工具 |

### macOS 特定要求

```bash
# 安装 Xcode Command Line Tools
xcode-select --install

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Bun
curl -fsSL https://bun.sh/install | bash
```

---

## 🚀 快速开始

### 1. 克隆和安装

```bash
# 克隆项目
git clone <repository-url>
cd memory-prosthetic

# 安装所有依赖 (Workspace)
bun install
```

### 2. 开发模式

```bash
# 启动桌面应用 (Tauri + React)
bun run dev:desktop

# 启动浏览器插件 (WXT)
bun run dev:browser-extension
```

### 3. 构建生产版本

```bash
# 构建所有应用
bun run build

# 仅构建桌面应用
cd apps/desktop && bun run tauri build

# 仅构建浏览器插件
cd apps/browser-extension && bun run build
```

---

## 📁 项目结构

```
memory-prosthetic/
├── apps/
│   ├── desktop/              # Tauri 桌面应用
│   │   ├── src/              # React 前端
│   │   ├── src-tauri/        # Rust 后端
│   │   └── package.json
│   └── browser-extension/    # WXT 浏览器插件
│       ├── src/
│       └── package.json
├── packages/
│   ├── shared/               # 共享类型和工具
│   └── ui/                   # 共享 UI 组件
├── docs/                     # 项目文档
├── package.json              # Workspace 根配置
└── biome.json               # 代码格式化配置
```

---

## 🛠️ 常用命令

### Workspace 级别

| 命令 | 说明 |
|------|------|
| `bun install` | 安装所有依赖 |
| `bun run dev:desktop` | 启动桌面应用开发 |
| `bun run dev:browser-extension` | 启动浏览器插件开发 |
| `bun run build` | 构建所有应用 |
| `bun run format` | 格式化所有代码 |

### 桌面应用 (apps/desktop)

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动 Vite 开发服务器 |
| `bun run tauri dev` | 启动 Tauri 开发模式 |
| `bun run tauri build` | 构建生产版本 |
| `bunx shadcn@latest add [组件]` | 添加 shadcn 组件 |

### 浏览器插件 (apps/browser-extension)

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动 WXT 开发服务器 (Chrome) |
| `bun run dev:firefox` | 启动 WXT 开发服务器 (Firefox) |
| `bun run build` | 构建 Chrome 插件 |
| `bun run build:firefox` | 构建 Firefox 插件 |
| `bun run zip` | 打包发布版本 |

### 共享包 (packages/*)

| 命令 | 说明 |
|------|------|
| `bun run typecheck` | 类型检查 |

---

## 🔧 开发工作流

### 添加新的 UI 组件

```bash
# 在 packages/ui 中添加 shadcn 组件
cd packages/ui
bunx shadcn@latest add button dialog input

# 在应用中使用
import { Button, Dialog, Input } from '@memory-prosthetic/ui'
```

### 添加共享类型

```typescript
// packages/shared/src/types/api.ts
export type SearchResult = {
  id: number
  title: string
  url: string
  snippet: string
  score: number
}

// 在应用中使用
import type { SearchResult } from '@memory-prosthetic/shared/types'
```

### 添加 Tauri Command

```rust
// apps/desktop/src-tauri/src/lib.rs
#[tauri::command]
async fn my_command(query: String) -> Result<Vec<MyResult>, String> {
    // 实现
}

// 注册命令
.invoke_handler(tauri::generate_handler![my_command])
```

```typescript
// apps/desktop/src/hooks/use-my-command.ts
import { invoke } from '@tauri-apps/api/core'

export const useMyCommand = () => {
  return useMutation({
    mutationFn: (query: string) => invoke('my_command', { query })
  })
}
```

---

## 🐛 调试

### 桌面应用

```bash
# 启用 Rust 日志
RUST_LOG=debug bun run tauri dev

# 在开发者工具中查看前端日志
# Tauri 窗口中按 Cmd+Option+I
```

### 浏览器插件

1. 打开 Chrome `chrome://extensions/`
2. 启用「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `apps/browser-extension/.output/chrome-mv3`
5. 点击「Service Worker」查看后台日志
6. 右键插件图标 → 检查弹出窗口

### Rust 调试

```bash
# 查看详细的 Cargo 错误
cd apps/desktop/src-tauri
cargo build 2>&1 | less

# 运行单元测试
cargo test
```

---

## 📝 代码规范

### TypeScript/JavaScript

- **格式化:** Biome
- **类型定义:** 使用 `type`，而非 `interface`
- **函数声明:** 使用 `const` 箭头函数

```typescript
// ✅ 正确
type User = {
  id: string
  name: string
}

const handleClick = () => {
  // ...
}

// ❌ 错误
interface User { ... }
function handleClick() { ... }
```

### React

- **React Compiler 已启用**: 禁止使用 `useMemo`, `useCallback`, `memo`
- **组件文件:** PascalCase (如 `SearchBar.tsx`)
- **Hook 文件:** kebab-case (如 `use-search.ts`)

### Rust

- **命名:** snake_case (变量/函数)，PascalCase (结构体)
- **错误处理:** 使用 `Result<T, E>` 和 `thiserror`

### 提交规范

```bash
# 提交前格式化
bun run format

# 提交消息格式
feat: 添加搜索功能
fix: 修复收集失败问题
docs: 更新开发指南
refactor: 重构数据库模块
```

---

## 🔗 外部资源

### 官方文档

- [Tauri 2.x 文档](https://tauri.app/v2/)
- [WXT 文档](https://wxt.dev/)
- [React 19 文档](https://react.dev/)
- [shadcn/ui 组件](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/)
- [TanStack Router](https://tanstack.com/router/)
- [react-use](https://github.com/streamich/react-use)
- [es-toolkit](https://es-toolkit.slash.page/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)

### 相关技术

- [ONNX Runtime (ort)](https://ort.pyke.io/)
- [Axum Web Framework](https://github.com/tokio-rs/axum)
- [SQLite](https://www.sqlite.org/)

---

## ❓ 常见问题

### Bun 安装失败

```bash
# 清理缓存重试
rm -rf node_modules bun.lockb
bun install
```

### Tauri 构建失败

```bash
# 确保 Xcode 工具已安装
xcode-select --install

# 更新 Rust
rustup update

# 清理 Cargo 缓存
cd apps/desktop/src-tauri
cargo clean
```

### WXT 开发模式不工作

```bash
# 重新生成配置
cd apps/browser-extension
bun run wxt prepare

# 检查端口是否被占用
lsof -i :3000
```

### 类型错误

```bash
# 重新构建共享包
cd packages/shared
bun run typecheck

# 重启 TypeScript 服务器 (VS Code)
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

*本文档由 BMAD Document Project Workflow 自动生成*
