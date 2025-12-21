# 源码树分析 (Source Tree Analysis)

**项目:** tauri-app
**类型:** Tauri Desktop App (Hybrid: React + TypeScript + Rust)
**生成日期:** 2025-12-21

---

## 📁 完整目录结构

```
tauri-app/
├── 📄 index.html                    # Vite HTML 入口
├── 📄 package.json                  # Node.js 依赖和脚本
├── 📄 bun.lock                      # Bun 锁文件
├── 📄 vite.config.ts                # Vite 构建配置
├── 📄 tsconfig.json                 # TypeScript 配置
├── 📄 tsconfig.node.json            # Node.js TypeScript 配置
├── 📄 biome.json                    # Biome Linter/Formatter 配置
├── 📄 components.json               # shadcn/ui 配置
├── 📄 README.md                     # 项目说明
│
├── 📂 src/                          # 🎯 前端源码 (React + TypeScript)
│   ├── 📄 main.tsx                  # ⭐ 前端入口点 - React 挂载
│   ├── 📄 App.tsx                   # ⭐ 主应用组件 - Tauri IPC 示例
│   ├── 📄 App.css                   # 应用样式
│   ├── 📄 vite-env.d.ts             # Vite 类型声明
│   │
│   ├── 📂 components/               # React 组件
│   │   └── 📂 ui/                   # 🎨 shadcn/ui 组件库 (53 个组件)
│   │       ├── 📄 accordion.tsx     # 手风琴
│   │       ├── 📄 alert-dialog.tsx  # 警告对话框
│   │       ├── 📄 alert.tsx         # 警告提示
│   │       ├── 📄 button.tsx        # 按钮
│   │       ├── 📄 card.tsx          # 卡片
│   │       ├── 📄 dialog.tsx        # 对话框
│   │       ├── 📄 form.tsx          # 表单 (React Hook Form 集成)
│   │       ├── 📄 input.tsx         # 输入框
│   │       ├── 📄 select.tsx        # 选择器
│   │       ├── 📄 sidebar.tsx       # 侧边栏
│   │       ├── 📄 table.tsx         # 表格
│   │       ├── 📄 tabs.tsx          # 标签页
│   │       └── ... (更多组件)       # 共 53 个 UI 组件
│   │
│   ├── 📂 hooks/                    # 自定义 React Hooks
│   │   └── 📄 use-mobile.ts         # 移动端检测 Hook
│   │
│   ├── 📂 lib/                      # 工具库
│   │   └── 📄 utils.ts              # 工具函数 (cn, clsx)
│   │
│   ├── 📂 styles/                   # 样式文件
│   │   └── 📄 global.css            # 全局样式 (Tailwind CSS)
│   │
│   └── 📂 assets/                   # 静态资源
│       └── 📄 react.svg             # React Logo
│
├── 📂 src-tauri/                    # 🦀 后端源码 (Rust + Tauri)
│   ├── 📄 Cargo.toml                # Rust 依赖配置
│   ├── 📄 Cargo.lock                # Rust 锁文件
│   ├── 📄 build.rs                  # Tauri 构建脚本
│   ├── 📄 tauri.conf.json           # ⭐ Tauri 应用配置
│   │
│   ├── 📂 src/                      # Rust 源码
│   │   ├── 📄 main.rs               # ⭐ 后端入口点 - Tauri 启动
│   │   └── 📄 lib.rs                # ⭐ Tauri 命令定义
│   │
│   ├── 📂 capabilities/             # Tauri 能力/权限配置
│   │   └── 📄 default.json          # 默认权限
│   │
│   ├── 📂 icons/                    # 应用图标 (各平台)
│   │   ├── 📄 icon.icns             # macOS 图标
│   │   ├── 📄 icon.ico              # Windows 图标
│   │   ├── 📄 icon.png              # 通用图标
│   │   └── 📄 Square*.png           # Windows Store 图标 (多尺寸)
│   │
│   ├── 📂 gen/                      # 生成的文件 (自动)
│   │   └── 📂 schemas/              # Tauri 配置 JSON Schema
│   │
│   └── 📂 target/                   # 构建输出 (gitignore)
│
├── 📂 public/                       # 公共静态资源
│   ├── 📄 tauri.svg                 # Tauri Logo
│   └── 📄 vite.svg                  # Vite Logo
│
├── 📂 docs/                         # 📚 项目文档
│   ├── 📄 index.md                  # 文档索引 (待生成)
│   ├── 📄 project-scan-report.json  # 扫描状态文件
│   ├── 📄 bmm-workflow-status.yaml  # BMAD 工作流状态
│   ├── 📂 analysis/                 # 分析文档
│   ├── 📂 workflows/                # 工作流文档
│   └── 📂 sprint-artifacts/         # Sprint 产出物
│
├── 📂 _bmad/                        # BMAD 方法论配置
│   ├── 📂 bmm/                      # BMM 模块
│   └── 📂 core/                     # 核心模块
│
└── 📂 node_modules/                 # Node.js 依赖 (gitignore)
```

---

## 🎯 关键目录说明

### 前端 (`src/`)

| 目录/文件 | 用途 | 重要性 |
|-----------|------|--------|
| `main.tsx` | React 应用入口，创建 Root 并渲染 App | ⭐ 核心 |
| `App.tsx` | 主应用组件，包含 Tauri IPC 调用示例 | ⭐ 核心 |
| `components/ui/` | shadcn/ui 组件库，53 个预构建组件 | 🎨 UI 基础 |
| `hooks/` | 自定义 React Hooks | 🔧 工具 |
| `lib/utils.ts` | 工具函数 (`cn` 类名合并) | 🔧 工具 |
| `styles/global.css` | Tailwind CSS 全局样式 | 🎨 样式 |

### 后端 (`src-tauri/`)

| 目录/文件 | 用途 | 重要性 |
|-----------|------|--------|
| `src/main.rs` | Tauri 应用启动入口 | ⭐ 核心 |
| `src/lib.rs` | Tauri 命令定义（前端可调用的 Rust 函数） | ⭐ 核心 |
| `tauri.conf.json` | 应用配置（窗口、构建、打包） | ⚙️ 配置 |
| `capabilities/` | 权限和安全策略 | 🔒 安全 |
| `icons/` | 各平台应用图标 | 📦 打包 |

---

## 🔗 数据流与通信

```
┌─────────────────────────────────────────────────────────────────┐
│                        Tauri Desktop App                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  前端 (Webview)                          │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │   React     │───▶│   State     │───▶│    View     │  │   │
│  │  │ Components  │    │  (useState) │    │  (Render)   │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  │         │                                      ▲         │   │
│  │         │ invoke()                             │         │   │
│  │         ▼                                      │         │   │
│  │  ┌─────────────────────────────────────────────┐        │   │
│  │  │           Tauri IPC Bridge                  │        │   │
│  │  │  @tauri-apps/api/core                       │        │   │
│  │  └─────────────────────────────────────────────┘        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                  后端 (Rust Native)                      │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │   Tauri     │───▶│  Commands   │───▶│   System    │  │   │
│  │  │  Handler    │    │  (lib.rs)   │    │    APIs     │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  │                                                          │   │
│  │  插件: tauri-plugin-opener (打开链接/文件)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📌 入口点总结

| 层级 | 文件 | 函数/组件 | 说明 |
|------|------|-----------|------|
| HTML | `index.html` | `<div id="root">` | DOM 挂载点 |
| 前端 | `src/main.tsx` | `ReactDOM.createRoot()` | React 应用初始化 |
| 前端 | `src/App.tsx` | `App()` | 主应用组件 |
| 后端 | `src-tauri/src/main.rs` | `main()` | Tauri 进程入口 |
| 后端 | `src-tauri/src/lib.rs` | `run()` | Tauri 应用构建和运行 |

---

## 📊 文件统计

| 类型 | 数量 | 说明 |
|------|------|------|
| TypeScript/TSX | 57 | 53 UI 组件 + 4 核心文件 |
| Rust | 2 | main.rs, lib.rs |
| JSON 配置 | 5 | package.json, tsconfig.json, etc. |
| 样式文件 | 2 | global.css, App.css |
| 图标文件 | 16 | 各平台应用图标 |
| SVG 资源 | 3 | Logo 文件 |
