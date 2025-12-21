# 项目概览 (Project Overview)

**项目名称:** tauri-app
**版本:** 0.1.0
**生成日期:** 2025-12-21

---

## 📋 执行摘要

**tauri-app** 是一个基于 Tauri 2.x 框架的现代桌面应用程序模板，采用混合架构设计：

- **前端:** React 19 + TypeScript 5.9 + Vite 7
- **后端:** Rust (Tauri Native)
- **UI:** shadcn/ui 组件库 (53 个组件)
- **特点:** 轻量级、跨平台、高性能

---

## 🎯 项目目的

这是一个 Tauri + React + TypeScript 的起始模板，为开发跨平台桌面应用提供现代化的技术栈和开发体验。

---

## 🏗️ 技术栈概览

### 核心技术

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **桌面框架** | Tauri | 2.x | Rust 原生桌面运行时 |
| **前端框架** | React | 19.x | UI 组件库 |
| **语言** | TypeScript | 5.9.x | 前端类型系统 |
| **语言** | Rust | 2021 | 后端/原生 |
| **构建** | Vite | 7.x | 快速构建工具 |
| **样式** | Tailwind CSS | 4.x | 实用优先 CSS |

### 关键依赖

| 类别 | 依赖 | 用途 |
|------|------|------|
| UI 组件 | shadcn/ui + Radix UI | 可访问的 UI 原语 |
| 路由 | TanStack Router | 类型安全路由 |
| 数据获取 | TanStack Query | 服务端状态管理 |
| 表单 | React Hook Form + Zod | 表单处理和验证 |
| 图表 | Recharts | 数据可视化 |
| 代码规范 | Biome | Linting + Formatting |

---

## 📁 仓库结构

```
tauri-app/                  # 项目根目录
├── src/                    # 前端源码 (React + TypeScript)
│   ├── components/ui/     # UI 组件 (53 个 shadcn 组件)
│   ├── hooks/             # 自定义 Hooks
│   ├── lib/               # 工具函数
│   └── styles/            # 全局样式
├── src-tauri/             # 后端源码 (Rust + Tauri)
│   ├── src/               # Rust 源码
│   ├── capabilities/      # 权限配置
│   └── icons/             # 应用图标
├── public/                # 静态资源
├── docs/                  # 项目文档 (本目录)
└── _bmad/                 # BMAD 方法论配置
```

---

## 🔄 架构类型

| 属性 | 值 |
|------|-----|
| **仓库类型** | Monolith |
| **架构模式** | 混合桌面应用 (Hybrid Desktop) |
| **通信模式** | Tauri IPC (invoke/listen) |
| **状态管理** | React Hooks + TanStack Query |

---

## 📊 项目统计

| 指标 | 数量 |
|------|------|
| 前端组件 | 53 个 |
| 生产依赖 | 40 个 |
| 开发依赖 | 8 个 |
| Rust 依赖 | 4 个 |
| Tauri 命令 | 1 个 |

---

## 🚀 快速开始

```bash
# 安装依赖
bun install

# 开发模式
bun run tauri dev

# 生产构建
bun run tauri build
```

---

## 📚 文档链接

| 文档 | 说明 |
|------|------|
| [架构文档](./architecture.md) | 系统架构设计 |
| [开发指南](./development-guide.md) | 开发环境和工作流 |
| [源码树分析](./source-tree-analysis.md) | 目录结构详解 |
| [组件清单](./component-inventory.md) | UI 组件列表 |

---

## 🔗 外部资源

- [Tauri 文档](https://tauri.app/v2/)
- [React 文档](https://react.dev/)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [TanStack 文档](https://tanstack.com/)
