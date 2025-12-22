# 项目文档索引 (Project Documentation Index)

**项目:** tauri-app
**版本:** 0.1.0
**文档生成日期:** 2025-12-21
**扫描模式:** Quick Scan (初始扫描)

---

## 📋 项目概览

| 属性 | 值 |
|------|-----|
| **类型** | Tauri Desktop App (混合桌面应用) |
| **仓库结构** | Monolith (单一仓库) |
| **主要语言** | TypeScript + Rust |
| **架构模式** | Hybrid (Web Frontend + Native Backend) |

---

## 🛠️ 技术栈速查

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri | 2.x |
| 前端框架 | React | 19.x |
| 类型系统 | TypeScript | 5.9 |
| 后端语言 | Rust | 2021 Edition |
| 构建工具 | Vite | 7.x |
| UI 组件 | shadcn/ui | 53 个组件 |
| 样式框架 | Tailwind CSS | 4.x |
| 包管理器 | Bun | - |

---

## 📂 入口点

| 层级 | 文件 | 说明 |
|------|------|------|
| 前端入口 | `src/main.tsx` | React 应用挂载 |
| 主组件 | `src/App.tsx` | 应用根组件 |
| 后端入口 | `src-tauri/src/main.rs` | Tauri 进程启动 |
| 命令定义 | `src-tauri/src/lib.rs` | Tauri 命令 |

---

## 📚 生成的文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [项目概览](./project-overview.md) | 项目简介、技术栈、快速开始 |
| [架构文档](./architecture.md) | 系统架构、模块设计、通信模式 |
| [项目上下文](./project-context.md) | AI Agent 实现指南、关键规则 |
| [开发指南](./development-guide.md) | 环境配置、开发流程、调试技巧 |
| [源码树分析](./source-tree-analysis.md) | 目录结构、入口点、数据流 |
| [组件清单](./component-inventory.md) | 53 个 shadcn/ui 组件详情 |

### 状态文件

| 文件 | 说明 |
|------|------|
| [project-scan-report.json](./project-scan-report.json) | 扫描状态和进度 |
| [bmm-workflow-status.yaml](./bmm-workflow-status.yaml) | BMAD 工作流状态 |

---

## 📁 现有文档

| 文档 | 位置 | 说明 |
|------|------|------|
| README | `README.md` | 项目基础说明 |
| 产品简报 | `docs/analysis/product-brief-tauri-app-2025-12-16.md` | 产品简报 (草稿) |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Bun 1.x
- Rust 1.70+
- Xcode (macOS) / Visual Studio Build Tools (Windows)

### 安装和运行

```bash
# 克隆项目
git clone <repository-url>
cd tauri-app

# 安装依赖
bun install

# 开发模式
bun run tauri dev

# 生产构建
bun run tauri build
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `bun run tauri dev` | 启动开发服务器 |
| `bun run tauri build` | 构建生产版本 |
| `bun run format` | 格式化代码 |
| `bunx shadcn@latest add [组件]` | 添加 UI 组件 |

---

## 📊 文档统计

| 指标 | 值 |
|------|-----|
| 核心文档 | 5 个 |
| 扫描模式 | Quick Scan |
| 识别的组件 | 53 个 |
| Tauri 命令 | 1 个 |

---

## 🔗 外部资源

- [Tauri 官方文档](https://tauri.app/v2/)
- [React 文档](https://react.dev/)
- [shadcn/ui 组件](https://ui.shadcn.com/)
- [TanStack Router](https://tanstack.com/router/)
- [TanStack Query](https://tanstack.com/query/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)

---

## 📌 下一步

### 推荐的工作流

1. **完成产品简报** - 运行 `product-brief` 工作流
2. **创建 PRD** - 运行 `prd` 工作流（棕地项目参考本文档）
3. **UX 设计** - 运行 `create-ux-design` 工作流
4. **架构设计** - 运行 `create-architecture` 工作流
5. **创建用户故事** - 运行 `create-epics-and-stories` 工作流

### 检查工作流状态

```bash
# 查看当前工作流状态
cat docs/bmm-workflow-status.yaml
```

---

*本文档由 BMAD Document Project Workflow 自动生成*
