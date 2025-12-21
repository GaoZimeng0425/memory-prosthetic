# 开发指南 (Development Guide)

**项目:** tauri-app
**类型:** Tauri Desktop App (React + TypeScript + Rust)
**生成日期:** 2025-12-21

---

## 📋 前置要求

### 系统要求

| 工具 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 18+ | JavaScript 运行时 |
| **Bun** | 1.x | 包管理器 (推荐) |
| **Rust** | 1.70+ | 后端编译 |
| **Xcode** (macOS) | 15+ | macOS 构建工具 |
| **Visual Studio Build Tools** (Windows) | 2022+ | Windows 构建工具 |

### 安装 Rust

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows - 下载并运行 rustup-init.exe
# https://rustup.rs/
```

### 安装 Bun

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

---

## 🚀 快速开始

### 1. 克隆和安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd tauri-app

# 安装前端依赖
bun install
```

### 2. 启动开发服务器

```bash
# 启动 Tauri 开发模式 (同时启动 Vite + Rust)
bun run tauri dev
```

这将:

- 启动 Vite 开发服务器 (<http://localhost:1420>)
- 编译 Rust 后端
- 打开 Tauri 桌面窗口
- 启用热模块替换 (HMR)

### 3. 构建生产版本

```bash
# 构建发布版本
bun run tauri build
```

输出位置: `src-tauri/target/release/bundle/`

---

## 📜 可用脚本

| 命令 | 说明 |
|------|------|
| `bun run dev` | 仅启动 Vite 开发服务器 (无 Tauri) |
| `bun run build` | 构建前端 (TypeScript + Vite) |
| `bun run preview` | 预览构建结果 |
| `bun run tauri dev` | **开发模式** - Vite + Tauri |
| `bun run tauri build` | **生产构建** - 打包桌面应用 |
| `bun run format` | Biome 代码格式化 |

---

## 🏗️ 项目结构

```
tauri-app/
├── src/                    # 前端 (React + TypeScript)
│   ├── main.tsx           # 入口点
│   ├── App.tsx            # 主组件
│   ├── components/ui/     # shadcn/ui 组件
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具函数
│   └── styles/            # 全局样式
├── src-tauri/             # 后端 (Rust)
│   ├── src/main.rs        # Tauri 入口
│   ├── src/lib.rs         # 命令定义
│   └── tauri.conf.json    # 配置
└── public/                # 静态资源
```

---

## 🔧 开发工作流

### 添加新的 Tauri 命令

1. 在 `src-tauri/src/lib.rs` 定义 Rust 函数:

```rust
#[tauri::command]
fn my_command(arg: String) -> Result<String, String> {
    // 实现逻辑
    Ok(format!("Result: {}", arg))
}
```

2. 注册命令:

```rust
.invoke_handler(tauri::generate_handler![greet, my_command])
```

3. 在前端调用:

```typescript
import { invoke } from '@tauri-apps/api/core'

const result = await invoke('my_command', { arg: 'value' })
```

### 添加 shadcn/ui 组件

```bash
# 使用 shadcn CLI 添加组件
bunx shadcn@latest add <component-name>

# 示例
bunx shadcn@latest add button
bunx shadcn@latest add dialog
```

### 代码格式化

```bash
# 格式化所有文件
bun run format

# 或使用 Biome 直接
bunx biome format --write .
```

---

## 🌐 环境配置

### Tauri 开发服务器

Vite 开发服务器配置 (`vite.config.ts`):

- **端口:** 1420 (固定，Tauri 要求)
- **HMR 端口:** 1421
- **路径别名:** `@/` → `./src/`

### TypeScript 配置

- **目标:** ES2020
- **严格模式:** 启用
- **路径别名:** `@/*` → `./src/*`

### Biome 代码规范

- **缩进:** 2 空格
- **行宽:** 120 字符
- **分号:** 按需 (ASI)
- **引号:** 单引号
- **尾逗号:** ES5 兼容

---

## 🐛 调试

### 前端调试

1. 开发模式下，右键点击窗口 → "检查元素"
2. 使用 Chrome DevTools 调试
3. React DevTools 扩展可用

### Rust 后端调试

```bash
# 查看 Rust 日志
RUST_LOG=debug bun run tauri dev

# 或在 lib.rs 中使用
println!("Debug: {:?}", variable);
```

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 端口 1420 被占用 | 关闭占用该端口的进程 |
| Rust 编译失败 | 运行 `rustup update` 更新 Rust |
| 前端热更新不工作 | 检查 `src-tauri` 是否被监听 (应该被忽略) |

---

## 📦 构建和发布

### 开发构建

```bash
bun run tauri build --debug
```

### 生产构建

```bash
bun run tauri build
```

### 构建产物

| 平台 | 格式 | 位置 |
|------|------|------|
| macOS | `.app`, `.dmg` | `src-tauri/target/release/bundle/macos/` |
| Windows | `.exe`, `.msi` | `src-tauri/target/release/bundle/msi/` |
| Linux | `.deb`, `.AppImage` | `src-tauri/target/release/bundle/` |

---

## 🔗 有用资源

- [Tauri 官方文档](https://tauri.app/v2/)
- [Tauri 命令指南](https://tauri.app/develop/calling-rust/)
- [shadcn/ui 组件](https://ui.shadcn.com/)
- [TanStack Router 文档](https://tanstack.com/router/latest)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Biome 文档](https://biomejs.dev/)
