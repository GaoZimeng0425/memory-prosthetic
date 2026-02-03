# Memory Prosthetic 项目文档索引

**项目名称:** Memory Prosthetic (记忆外挂)
**版本:** 0.1.0
**文档生成日期:** 2025-12-22
**扫描模式:** Full Rescan (完整重新扫描)

---

## 📋 项目概览

| 属性 | 值 |
|------|-----|
| **类型** | Monorepo (Bun Workspaces) |
| **仓库结构** | 2 应用 + 2 共享包 |
| **主要语言** | TypeScript + Rust |
| **架构模式** | Hybrid Desktop + Browser Extension |

### 项目组成

| 部分 | 类型 | 技术栈 | 路径 |
|------|------|--------|------|
| **Desktop** | Tauri 桌面应用 | React 19 + TypeScript + Rust | `apps/desktop/` |
| **Browser Extension** | WXT 浏览器插件 | React + TypeScript + WXT | `apps/browser-extension/` |
| **Shared** | 共享库 | TypeScript | `packages/shared/` |
| **UI** | UI 组件库 | React + shadcn/ui | `packages/ui/` |

---

## 🛠️ 技术栈速查

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | React | 19.x |
| 类型系统 | TypeScript | 5.9 |
| 后端语言 | Rust | 2021 Edition |
| 构建工具 | Vite | 7.x |
| UI 组件 | shadcn/ui | 56 个组件 |
| React Hooks | react-use | 17.x |
| 工具库 | es-toolkit | 1.x |
| 样式框架 | Tailwind CSS | 4.x |
| 包管理器 | Bun | 1.x |
| 插件框架 | WXT | 0.20 |
| 数据库 | SQLite + sqlite-vec | - |
| AI 推理 | ONNX Runtime | 2.x |

---

## 📂 入口点

| 层级 | 文件 | 说明 |
|------|------|------|
| **Desktop 前端入口** | `apps/desktop/src/main.tsx` | React 应用挂载 |
| **Desktop 主组件** | `apps/desktop/src/App.tsx` | 应用根组件 |
| **Desktop 后端入口** | `apps/desktop/src-tauri/src/main.rs` | Tauri 进程启动 |
| **Desktop 命令定义** | `apps/desktop/src-tauri/src/lib.rs` | Tauri Commands |
| **Extension 弹窗** | `apps/browser-extension/src/entrypoints/popup/App.tsx` | 弹窗 UI |
| **Extension 后台** | `apps/browser-extension/src/entrypoints/background.ts` | Service Worker |
| **Extension 内容脚本** | `apps/browser-extension/src/entrypoints/content.ts` | 页面内容提取 |

---

## 📚 生成的文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [项目概览](./project-overview.md) | 项目简介、技术栈、快速开始 |
| [PRD](./prd.md) | 产品需求文档 (30 个 FR) |
| [架构文档](./architecture.md) | 系统架构、ADR、实现模式 |
| [Epic 分解](./epics.md) | 6 个 Epic、用户故事 |
| [UX 设计规范](./ux-design-specification.md) | 用户体验设计 |
| [开发指南](./development-guide.md) | 环境配置、开发流程、调试技巧 |
| [源码树分析](./source-tree-analysis.md) | 目录结构、入口点、数据流 |
| [组件清单](./component-inventory.md) | 56+ 组件详情 |
| [集成架构](./integration-architecture.md) | 多部分通信、数据流 |

### 状态文件

| 文件 | 说明 |
|------|------|
| [project-scan-report.json](./project-scan-report.json) | 扫描状态和进度 |
| [project-parts.json](./project-parts.json) | 项目部分元数据 |
| [bmm-workflow-status.yaml](./bmm-workflow-status.yaml) | BMAD 工作流状态 |

### 技术规范文档

| 文档 | 说明 |
|------|------|
| [知识图谱与 AI 分类技术规范](./tech-spec-knowledge-graph-and-ai.md) | 知识图谱构建和 AI 内容理解功能的完整技术规范 |
| [AI 与图谱架构分离说明](./architecture-ai-graph-separation.md) | AI 处理和图谱算法的职责分离架构决策 |

### Sprint 文档

| 文档 | 说明 |
|------|------|
| [知识图谱与 AI 实施计划](./sprint-artifacts/implementation-plan-ai-graph.md) | 知识图谱与 AI 分类功能的实施计划和步骤 |

### 分析文档

| 文档 | 说明 |
|------|------|
| [产品简报 (2025-12-21)](./analysis/product-brief-tauri-app-2025-21.md) | 最新产品简报 |

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

## 📊 文档统计

| 指标 | 值 |
|------|-----|
| 核心文档 | 9 个 |
| 扫描模式 | Full Rescan |
| 项目部分 | 4 个 |
| UI 组件 | 56 个 |
| Tauri Commands | 6 个 |
| API 端点 | 3 个 |

---

## 🔗 外部资源

- [Tauri 官方文档](https://tauri.app/v2/)
- [WXT 官方文档](https://wxt.dev/)
- [React 文档](https://react.dev/)
- [shadcn/ui 组件](https://ui.shadcn.com/)
- [TanStack Router](https://tanstack.com/router/)
- [TanStack Query](https://tanstack.com/query/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)

---

## 📌 下一步

### 推荐的工作流

1. ✅ **文档项目** - 已完成 (本次扫描)
2. ✅ **产品简报** - 已完成
3. ✅ **PRD** - 已完成 (30 个功能需求)
4. ✅ **架构设计** - 已完成 (8 个 ADR)
5. 🔄 **UX 设计** - 运行 `create-ux-design` 工作流
6. ⏳ **创建用户故事** - 运行 `create-epics-and-stories` 工作流
7. ⏳ **Sprint 规划** - 运行 `sprint-planning` 工作流

### 检查工作流状态

```bash
# 查看当前工作流状态
cat docs/bmm-workflow-status.yaml
```

---

## 🔄 集成架构速览

```
┌────────────────────────────────────────────────────────────┐
│                 Browser Extension (WXT)                     │
│   收集网页内容 → HTTP API → Desktop App                     │
└────────────────────────────────────────────────────────────┘
                         │ HTTP (localhost:21890)
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri)                      │
│  React Frontend ◄── IPC ──► Rust Backend                   │
│       ↓                         ↓                          │
│  搜索 UI              SQLite + 向量嵌入 (ONNX)              │
└────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────────────────────────────────────────┐
│                    Shared Packages                          │
│  @mp/shared (类型 + 工具)    @mp/ui (56 组件)               │
└────────────────────────────────────────────────────────────┘
```

---

*本文档由 BMAD Document Project Workflow 自动生成*
*最后更新: 2025-12-22*
