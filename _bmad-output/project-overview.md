# 项目概览 (Project Overview)

**项目名称:** Memory Prosthetic (记忆外挂)
**版本:** 0.1.0
**仓库类型:** Monorepo
**更新日期:** 2025-12-22

---

## 🎯 产品定位

**Memory Prosthetic** 是一款 **「记忆外挂」** 桌面应用 —— 让模糊的记忆变成精确的检索。

通过浏览器插件一键收集网页内容，结合 AI 语义理解和 Spotlight 级快速唤起，解决现代知识工作者 **"我看过但找不到"** 的知识焦虑。

**核心定位：想到即找到，看过不再忘。**

---

## 🏗️ 项目架构

### Monorepo 结构

```
memory-prosthetic/
├── apps/
│   ├── desktop/              # Tauri 桌面应用 (主应用)
│   └── browser-extension/    # Chrome 浏览器插件
└── packages/
    ├── shared/               # 共享类型和工具
    └── ui/                   # 共享 UI 组件库
```

### 应用组件

| 组件 | 技术栈 | 职责 |
|------|--------|------|
| **桌面应用** | Tauri 2.x + React 19 + Rust | 主应用、搜索界面、内容存储、AI 推理 |
| **浏览器插件** | WXT + React + TypeScript | 网页内容收集、一键保存 |
| **共享库** | TypeScript | 类型定义、工具函数 |
| **UI 库** | shadcn/ui + Radix | 56 个可复用组件 |

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.x | UI 框架 |
| TypeScript | 5.9 | 类型安全 |
| Tailwind CSS | 4.x | 样式系统 |
| shadcn/ui | - | UI 组件库 (56 组件) |
| TanStack Query | 5.x | 数据获取和缓存 |
| TanStack Router | 1.x | 路由管理 |
| react-use | 17.x | React Hooks 工具库 |
| es-toolkit | 1.x | 现代 JavaScript 工具库 |
| Lucide React | - | 图标库 |

### 后端 (Rust)

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.x | 桌面框架 |
| Axum | 0.8 | HTTP Server |
| Tokio | 1.x | 异步运行时 |
| SQLite (rusqlite) | 0.34 | 本地数据库 |
| ORT (ONNX Runtime) | 2.0 | AI 推理 |
| Tokenizers | 0.21 | 文本分词 |

### 浏览器插件

| 技术 | 版本 | 用途 |
|------|------|------|
| WXT | 0.20 | 插件开发框架 |
| React | 19.x | UI 框架 |
| Vite | 7.x | 构建工具 |

### 开发工具

| 工具 | 用途 |
|------|------|
| Bun | 包管理器和运行时 |
| Biome | 代码格式化和 Lint |
| Vite | 前端构建 |

---

## 🔌 系统集成

### 通信架构

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                     │
│    收集网页内容 → HTTP API → Desktop App                 │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTP (localhost:21890)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Desktop App                           │
│  ┌──────────────┐          ┌──────────────────────────┐ │
│  │ React 前端   │◄── IPC ──►│ Rust 后端              │ │
│  │ (搜索 UI)    │          │ (SQLite + AI + HTTP)     │ │
│  └──────────────┘          └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/collect` | POST | 收集内容 |
| `/api/search` | GET | 搜索 (可选) |

### Tauri Commands

| 命令 | 说明 |
|------|------|
| `search` | 语义搜索 |
| `get_collections` | 获取收集列表 |
| `delete_collection` | 删除收集 |
| `get_settings` | 获取设置 |
| `set_settings` | 保存设置 |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Bun 1.x
- Rust 1.70+
- Xcode (macOS)

### 安装和运行

```bash
# 克隆项目
git clone <repository-url>
cd memory-prosthetic

# 安装依赖
bun install

# 开发模式 - 桌面应用
bun run dev:desktop

# 开发模式 - 浏览器插件
bun run dev:browser-extension

# 生产构建
bun run build
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `bun run dev:desktop` | 启动桌面应用开发服务器 |
| `bun run dev:browser-extension` | 启动浏览器插件开发服务器 |
| `bun run build` | 构建所有应用 |
| `bun run format` | 格式化代码 |

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [PRD](./prd.md) | 产品需求文档 |
| [架构文档](./architecture.md) | 架构决策和技术设计 |
| [Epic 分解](./epics.md) | 功能需求和用户故事 |
| [UX 设计规范](./ux-design-specification.md) | 用户体验设计 |
| [开发指南](./development-guide.md) | 开发环境和流程 |
| [源码树分析](./source-tree-analysis.md) | 代码结构说明 |
| [组件清单](./component-inventory.md) | UI 组件库 |

---

## 📊 项目状态

| 指标 | 值 |
|------|-----|
| **仓库类型** | Monorepo |
| **应用数量** | 2 (Desktop + Extension) |
| **共享包数量** | 2 (shared + ui) |
| **UI 组件** | 56 个 |
| **主要语言** | TypeScript + Rust |
| **MVP 状态** | 开发中 |

---

*本文档由 BMAD Document Project Workflow 自动生成*
