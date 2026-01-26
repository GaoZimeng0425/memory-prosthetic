# 源码树分析 (Source Tree Analysis)

**项目:** Memory Prosthetic
**仓库类型:** Monorepo (Bun Workspaces)
**生成日期:** 2025-12-22
**扫描模式:** Quick Scan (完整重新扫描)

---

## 📁 项目结构概览

```
memory-prosthetic/                    # 项目根目录
├── apps/                             # 🎯 应用目录 (可部署单元)
│   ├── desktop/                      # Tauri 桌面应用
│   │   ├── src/                      # React 前端源码
│   │   │   ├── main.tsx              # ⭐ 前端入口
│   │   │   ├── App.tsx               # 根组件
│   │   │   ├── components/           # 功能组件
│   │   │   │   ├── CollectionDetail.tsx
│   │   │   │   ├── CollectionList.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── SearchBar.tsx     # 搜索核心组件
│   │   │   │   ├── SearchResults.tsx
│   │   │   │   └── SettingsPanel.tsx
│   │   │   ├── hooks/                # React Hooks
│   │   │   │   ├── use-collections.ts
│   │   │   │   └── use-search.ts
│   │   │   ├── pages/
│   │   │   │   └── SearchWindow.tsx  # 全局搜索窗口
│   │   │   └── types/
│   │   │       ├── api.ts
│   │   │       └── settings.ts
│   │   ├── src-tauri/                # Rust 后端
│   │   │   ├── src/
│   │   │   │   ├── main.rs           # ⭐ Rust 入口
│   │   │   │   ├── lib.rs            # Tauri 命令定义 (596 行)
│   │   │   │   ├── tray.rs           # 系统托盘
│   │   │   │   ├── settings.rs       # 设置管理
│   │   │   │   ├── db/               # 数据库层
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── connection.rs # SQLite 连接
│   │   │   │   │   ├── collections.rs# 内容 CRUD
│   │   │   │   │   └── embeddings.rs # 向量存储
│   │   │   │   ├── embedding/        # AI 推理层
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── model.rs      # ONNX 模型加载
│   │   │   │   │   └── service.rs    # Embedding 服务
│   │   │   │   └── server/           # HTTP Server
│   │   │   │       ├── mod.rs
│   │   │   │       ├── routes.rs     # Axum 路由
│   │   │   │       └── handlers.rs   # 请求处理
│   │   │   ├── Cargo.toml            # Rust 依赖
│   │   │   ├── tauri.conf.json       # Tauri 配置
│   │   │   └── icons/                # 应用图标
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   └── browser-extension/            # WXT 浏览器插件
│       ├── src/
│       │   ├── entrypoints/          # WXT 入口点
│       │   │   ├── popup/            # 弹窗 UI
│       │   │   │   ├── App.tsx       # ⭐ 弹窗主组件
│       │   │   │   ├── main.tsx
│       │   │   │   └── index.html
│       │   │   ├── background.ts     # ⭐ Service Worker
│       │   │   └── content.ts        # ⭐ 内容脚本
│       │   ├── hooks/
│       │   │   ├── use-collect.ts    # 收集逻辑
│       │   │   └── use-connection.ts # 连接检测
│       │   ├── utils/
│       │   │   ├── api.ts            # HTTP 客户端
│       │   │   └── content-extractor.ts
│       │   ├── types/
│       │   │   ├── api.ts
│       │   │   └── messages.ts       # 消息类型
│       │   └── constants/
│       │       └── api.ts            # API 常量
│       ├── wxt.config.ts             # WXT 配置
│       ├── package.json
│       └── public/icon/              # 插件图标
│
├── packages/                         # 📦 共享包
│   ├── shared/                       # 共享类型和工具
│   │   ├── src/
│   │   │   ├── index.ts              # 包入口
│   │   │   ├── types/
│   │   │   │   ├── index.ts          # 类型导出
│   │   │   │   ├── api.ts            # API 类型
│   │   │   │   ├── collection.ts     # Collection 实体
│   │   │   │   └── tauri.ts          # Tauri IPC 类型
│   │   │   └── utils/
│   │   │       ├── index.ts
│   │   │       └── typed.ts          # 类型工具
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                           # UI 组件库
│       ├── src/
│       │   ├── components/ui/        # 56 个 shadcn/ui 组件
│       │   │   ├── button.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── input.tsx
│       │   │   ├── command.tsx       # 命令面板
│       │   │   ├── scroll-area.tsx
│       │   │   ├── card.tsx
│       │   │   ├── ... (53 更多组件)
│       │   ├── hooks/
│       │   │   └── use-mobile.ts
│       │   ├── styles/
│       │   │   └── globals.css       # 全局样式
│       │   └── utils/
│       │       └── tw.ts             # tailwind-merge
│       ├── components.json           # shadcn 配置
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                             # 📚 项目文档
│   ├── index.md                      # 文档入口
│   ├── prd.md                        # 产品需求文档
│   ├── architecture.md               # 架构决策文档
│   ├── epics.md                      # Epic 和 Story 分解
│   ├── ux-design-specification.md    # UX 设计规范
│   ├── project-overview.md           # 项目概览
│   ├── development-guide.md          # 开发指南
│   ├── source-tree-analysis.md       # 本文档
│   ├── component-inventory.md        # 组件清单
│   └── analysis/                     # 分析文档
│
├── package.json                      # Workspace 根配置
├── biome.json                        # 代码格式化配置
├── tsconfig.json                     # 根 TypeScript 配置
└── README.md
```

---

## ⭐ 关键入口点

### Desktop 应用

| 入口 | 文件 | 说明 |
|------|------|------|
| **前端入口** | `apps/desktop/src/main.tsx` | React 应用挂载 |
| **根组件** | `apps/desktop/src/App.tsx` | 应用根组件 |
| **Rust 入口** | `apps/desktop/src-tauri/src/main.rs` | Tauri 进程启动 |
| **命令定义** | `apps/desktop/src-tauri/src/lib.rs` | Tauri Commands |
| **搜索窗口** | `apps/desktop/src/pages/SearchWindow.tsx` | 全局搜索 UI |

### Browser Extension

| 入口 | 文件 | 说明 |
|------|------|------|
| **弹窗入口** | `apps/browser-extension/src/entrypoints/popup/App.tsx` | 弹窗 UI |
| **后台脚本** | `apps/browser-extension/src/entrypoints/background.ts` | Service Worker |
| **内容脚本** | `apps/browser-extension/src/entrypoints/content.ts` | 页面内容提取 |

---

## 🔗 数据流

### 内容收集流程

```
浏览器网页
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Browser Extension                                        │
│   content.ts (提取内容) → background.ts (转发请求)       │
└─────────────────────────────────────────────────────────┘
    │
    │ HTTP POST /api/collect
    ▼
┌─────────────────────────────────────────────────────────┐
│ Desktop App - Rust Backend                               │
│   server/handlers.rs → db/collections.rs                │
│                      → embedding/service.rs              │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ SQLite Database                                          │
│   collections 表 + embeddings 表 (sqlite-vec)           │
└─────────────────────────────────────────────────────────┘
```

### 搜索流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Desktop App - React Frontend                             │
│   SearchBar.tsx → use-search.ts → invoke("search")      │
└─────────────────────────────────────────────────────────┘
    │
    │ Tauri IPC
    ▼
┌─────────────────────────────────────────────────────────┐
│ Desktop App - Rust Backend                               │
│   lib.rs (search command)                                │
│     → embedding/service.rs (query → vector)              │
│     → db/embeddings.rs (similarity search)               │
│     → db/collections.rs (fetch results)                  │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ SearchResults.tsx (显示结果)                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 包依赖关系

```
┌─────────────────────────────────────────────────────────┐
│                    Root Workspace                        │
│  (react, tailwindcss, ai-sdk, tanstack, zod, axios)     │
└─────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐
│ @mp/shared      │       │ @mp/ui              │
│ (types, utils)  │       │ (56 shadcn 组件)    │
└─────────────────┘       └─────────────────────┘
         │                           │
         ├───────────┬───────────────┤
         ▼           ▼               ▼
┌─────────────┐  ┌─────────────────────────┐
│ @mp/desktop │  │ @mp/browser-extension   │
│ (Tauri App) │  │ (WXT Extension)         │
└─────────────┘  └─────────────────────────┘
```

---

## 📊 代码统计

| 部分 | TypeScript 文件 | Rust 文件 | 组件数 | 说明 |
|------|----------------|-----------|--------|------|
| `apps/desktop` | ~15 | ~12 | 6 | 桌面应用核心 |
| `apps/browser-extension` | ~12 | 0 | 1 | 浏览器插件 |
| `packages/shared` | ~6 | 0 | 0 | 共享类型 |
| `packages/ui` | ~56 | 0 | 56 | UI 组件库 |

---

## 🔧 关键配置文件

| 文件 | 位置 | 用途 |
|------|------|------|
| `package.json` | `/` | Workspace 配置、根依赖 |
| `biome.json` | `/` | 代码格式化规则 |
| `tsconfig.json` | `/` | 根 TypeScript 配置 |
| `tauri.conf.json` | `apps/desktop/src-tauri/` | Tauri 应用配置 |
| `Cargo.toml` | `apps/desktop/src-tauri/` | Rust 依赖 |
| `wxt.config.ts` | `apps/browser-extension/` | WXT 插件配置 |
| `vite.config.ts` | `apps/desktop/` | Vite 构建配置 |
| `components.json` | 多处 | shadcn/ui 配置 |

---

*本文档由 BMAD Document Project Workflow 自动生成*
