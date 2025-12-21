---
stepsCompleted: [1, 2]
inputDocuments:
  - docs/prd.md
  - docs/index.md
  - docs/project-overview.md
  - docs/analysis/product-brief-tauri-app-2025-12-21.md
workflowType: 'architecture'
lastStep: 2
project_name: 'tauri-app'
user_name: 'Gao'
date: '2025-12-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

项目包含 30 个功能需求，覆盖 6 个核心领域：

| 领域 | 需求 | MVP 优先级 |
|------|------|-----------|
| 内容收集 | FR1-FR5 | P0 |
| 内容搜索 | FR6-FR12 | P0 |
| 内容存储 | FR13-FR16 | P0 |
| 系统集成 | FR17-FR20 | P0-P1 |
| 应用通信 | FR21-FR23 | P0 |
| 用户设置 | FR24-FR26 | P1 |

**Non-Functional Requirements:**

| 类别 | 关键指标 | 架构影响 |
|------|----------|----------|
| 性能 | 唤起 < 300ms, 搜索 < 500ms | IPC 优化，常驻进程 |
| 离线 | 100% 核心功能离线 | 本地 AI，SQLite |
| 安全 | 本地存储，无遥测 | localhost HTTP，token 验证 |
| 可靠性 | 80% 搜索成功率 | 高质量 Embedding |

**Scale & Complexity:**

- Primary domain: **Hybrid Desktop Application** (Tauri + Browser Extension)
- Complexity level: **Medium**
- Estimated architectural components: **15-20**

### Technical Constraints & Dependencies

| 约束 | 说明 |
|------|------|
| Tauri 2.x | Rust 后端，跨平台桌面框架 |
| React 19 | 现代 React 特性（Hooks, Concurrent） |
| WXT | 浏览器插件框架，Manifest V3 |
| 本地 AI | Embedding 模型本地推理 |
| macOS First | MVP 仅支持 macOS |
| Monorepo | Bun Workspaces 管理 |

### Cross-Cutting Concerns Identified

1. **Error Handling** — 跨应用统一错误处理和用户反馈
2. **Logging & Debugging** — 分布式日志（插件 + 应用）
3. **Type Safety** — 共享类型定义（API、数据模型）
4. **Configuration** — 统一配置管理（端口、快捷键）
5. **State Sync** — 插件与应用状态一致性
