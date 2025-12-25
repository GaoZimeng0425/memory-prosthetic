---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
workflowType: 'epics-and-stories'
lastStep: 7
status: 'complete'
revision: 2
revisionDate: '2025-12-22'
completedAt: '2025-12-22'
project_name: 'Memory Prosthetic'
user_name: 'Gao'
date: '2025-12-22'
---

# Memory Prosthetic - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Memory Prosthetic（记忆外挂），decomposing the requirements from the PRD and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**内容收集 (Content Collection)**

- FR1: 用户可以通过浏览器插件一键收集当前网页
- FR2: 用户可以在收集时看到确认反馈（已收集提示）
- FR3: 系统可以自动提取网页的 URL、标题和正文内容
- FR4: 系统可以在桌面应用未运行时提示用户启动应用
- FR5: 用户可以查看收集内容的预览摘要（P2）

**内容搜索 (Content Search)**

- FR6: 用户可以通过全局快捷键唤起搜索界面
- FR7: 用户可以输入模糊关键词进行语义搜索
- FR8: 系统可以基于语义相似度返回匹配的内容列表
- FR9: 系统可以支持中英文混合搜索
- FR10: 用户可以在搜索结果中看到内容摘要
- FR11: 用户可以点击搜索结果跳转到原文链接
- FR12: 系统可以在无匹配结果时显示空结果提示

**内容存储 (Content Storage)**

- FR13: 系统可以将收集的内容存储在本地数据库
- FR14: 系统可以为每篇内容生成语义向量（Embedding）
- FR15: 系统可以在完全离线状态下正常工作
- FR16: 用户可以查看已收集的内容列表

**系统集成 (System Integration)**

- FR17: 用户可以通过系统托盘图标访问应用
- FR18: 用户可以通过托盘图标右键菜单打开主窗口、设置或退出
- FR19: 用户可以选择应用是否开机自启
- FR20: 用户可以自定义全局唤起快捷键

**应用通信 (App Communication)**

- FR21: 浏览器插件可以通过本地 HTTP Server 与桌面应用同步数据
- FR22: 浏览器插件可以检测桌面应用是否正在运行
- FR23: 系统可以提供健康检查端点供插件验证连接状态

**用户设置 (User Settings)**

- FR24: 用户可以配置本地 HTTP Server 端口
- FR25: 用户可以查看已收集内容的数量统计
- FR26: 用户可以管理（查看/删除）已收集的内容

**内容组织 (Content Organization)**

**收藏夹管理 (Favorites Management)**

- FR31: 用户可以创建、重命名和删除收藏夹（文件夹）
- FR32: 用户可以将收集的内容添加到收藏夹中
- FR33: 用户可以将内容从收藏夹中移除
- FR34: 用户可以查看每个收藏夹中的内容数量和列表
- FR35: 用户可以查看"未分类"收藏夹（默认收藏夹，包含所有未分配到其他收藏夹的内容）
- FR36: 用户可以在侧边栏中折叠/展开收藏夹列表
- FR37: 用户可以在收集内容时选择目标收藏夹（P1）

**标签管理 (Tags Management)**

- FR38: 用户可以创建、重命名和删除标签
- FR39: 用户可以为收集的内容添加一个或多个标签
- FR40: 用户可以移除内容上的标签
- FR41: 用户可以查看"无标签"分类（包含所有未添加标签的内容）
- FR42: 用户可以按标签筛选和查看内容
- FR43: 用户可以在侧边栏中查看所有标签列表
- FR44: 用户可以对标签进行排序（P1）
- FR45: 系统可以为收集的内容自动生成标签（Alpha，与FR29合并）

**归档和删除 (Archive & Delete)**

- FR46: 用户可以将内容归档（移动到归档状态，不显示在正常列表中）
- FR47: 用户可以查看"已归档"分类中的所有归档内容
- FR48: 用户可以将归档的内容恢复（取消归档）
- FR49: 用户可以删除内容（移动到"最近删除"）
- FR50: 用户可以查看"最近删除"分类中的所有已删除内容
- FR51: 用户可以永久删除内容（从"最近删除"中彻底删除）
- FR52: 系统可以自动清理"最近删除"中超过30天的内容（可选，P2）
- FR53: 归档和删除功能统一放置在"其他"分类下（UI组织）

**搜索增强 (Search Enhancement) - 后续版本**

- FR27: 用户可以为收集的内容添加手动备注/标签（Alpha，已整合到FR39）
- FR28: 系统可以为收集的内容自动生成摘要（Alpha）
- FR29: 系统可以为收集的内容自动生成标签（Alpha，已整合到FR45）
- FR30: 系统可以在搜索时提供搜索建议（Beta）

### NonFunctional Requirements

**性能 (Performance)**

- NFR1: 唤起响应 — 全局快捷键到搜索框显示 < 300ms
- NFR2: 搜索延迟 — 从按下回车到结果显示 < 500ms
- NFR3: 收集同步 — 插件点击到应用确认 < 2s
- NFR4: 启动时间 — 应用冷启动 < 3s
- NFR5: Embedding 生成 — 单篇内容向量生成 < 1s（后台处理，不阻塞 UI）

**可靠性 (Reliability)**

- NFR6: 离线可用性 — 100% 核心功能在无网络时正常工作
- NFR7: 数据持久性 — 收集的内容不会因应用崩溃丢失
- NFR8: 搜索准确性 — 语义搜索成功率 ≥ 80%
- NFR9: 同步可靠性 — 插件收集成功率 100%（应用运行时）

**安全 (Security)**

- NFR10: 本地存储 — 所有用户数据存储在本地，不上传云端
- NFR11: HTTP Server 访问 — 仅 localhost 访问，可选 token 验证
- NFR12: 无外部依赖 — 核心功能不依赖外部 API（本地 AI 推理）
- NFR13: 无遥测数据收集，无用户行为追踪

**集成 (Integration)**

- NFR14: HTTP API 稳定性 — 本地 HTTP Server API 版本稳定，向后兼容
- NFR15: CORS 配置 — 正确配置 CORS 允许浏览器插件访问
- NFR16: 健康检查 — 提供 /api/health 端点供插件检测应用状态

**可维护性 (Maintainability)**

- NFR17: 代码质量 — TypeScript 类型安全，Biome 格式化
- NFR18: Monorepo 结构 — 清晰的代码组织，共享类型定义
- NFR19: 日志记录 — 关键操作记录日志，便于调试

### Additional Requirements

**来自架构文档的技术需求：**

**项目类型与约束：**
- 棕地项目（Brownfield）— 基于现有 Tauri 模板扩展，非从零开始
- Monorepo 架构 — Bun Workspaces 管理
- MVP 仅支持 macOS

**技术栈决策 (ADR)：**
- ADR-001: 桌面框架 — Tauri 2.x（性能需求 < 300ms 唤起是硬指标）
- ADR-002: 前端框架 — React 19（shadcn/ui 组件库依赖）
- ADR-003: 浏览器插件框架 — WXT 0.20
- ADR-004: Monorepo 管理 — Bun Workspaces

**数据架构：**
- 数据库: SQLite 3.x + sqlite-vec 向量扩展
- 存储位置: `~/Library/Application Support/memory-prosthetic/`
- Embedding 模型: all-MiniLM-L6-v2 (23MB, 384 维向量)
- 推理框架: candle (Rust) 或 ort (ONNX Runtime)

**HTTP Server（插件通信）：**
- 框架: Axum
- 端口: localhost:21890（可配置）
- 认证: 可选 Bearer Token
- CORS: 允许浏览器插件源

**前端状态管理：**
- UI 状态: Zustand
- 服务端状态: TanStack Query v5
- 路由: TanStack Router

**关键实现顺序（来自架构）：**
1. 创建 `packages/shared` 共享类型定义
2. 实现 Rust 数据层 (`db/`)
3. 实现 Embedding 管道 (`embedding/`)
4. 实现 HTTP Server (`server/`)
5. 创建 Tauri Commands (`commands/`)
6. 构建 React UI (`components/`, `routes/`)
7. 完善浏览器插件 (`browser-extension/`)

**实现模式约束：**
- TypeScript 变量/函数: camelCase
- TypeScript 文件: kebab-case
- React 组件文件: PascalCase
- Rust 变量/函数: snake_case
- API 端点: kebab-case
- JSON 字段: camelCase
- Tauri Events 命名: 领域:动作 格式

**已识别风险：**
- Tauri 2.x 生态不成熟 — 遇到问题可能无现成方案
- Rust 学习曲线 — 后端开发速度可能慢，考虑 Sidecar 方案
- 共享包未创建 — Epic 1 优先创建 packages/shared

### FR Coverage Map

| FR | Epic | 描述 |
|----|------|------|
| FR1 | Epic 1 | 浏览器插件一键收集 |
| FR2 | Epic 1 | 收集确认反馈 |
| FR3 | Epic 1 | 自动提取 URL、标题、正文 |
| FR4 | Epic 6 | 应用未运行时提示启动 |
| FR5 | Epic 6 | 收集预览摘要 |
| FR6 | Epic 3 | 全局快捷键唤起 |
| FR7 | Epic 2 | 模糊关键词语义搜索 |
| FR8 | Epic 2 | 语义相似度匹配 |
| FR9 | Epic 2 | 中英文混合搜索 |
| FR10 | Epic 2 | 搜索结果摘要 |
| FR11 | Epic 2 | 点击跳转原文 |
| FR12 | Epic 2 | 空结果提示 |
| FR13 | Epic 1 | 本地数据库存储 |
| FR14 | Epic 2 | Embedding 向量生成 |
| FR15 | Epic 2 | 完全离线工作 |
| FR16 | Epic 5 | 查看已收集内容列表 |
| FR17 | Epic 4 | 系统托盘图标 |
| FR18 | Epic 4 | 托盘右键菜单 |
| FR19 | Epic 4 | 开机自启选项 |
| FR20 | Epic 3 | 自定义快捷键 |
| FR21 | Epic 1 | HTTP Server 通信 |
| FR22 | Epic 1 | 检测应用是否运行 |
| FR23 | Epic 1 | 健康检查端点 |
| FR24 | Epic 5 | 配置 HTTP Server 端口 |
| FR25 | Epic 5 | 内容数量统计 |
| FR26 | Epic 5 | 管理（查看/删除）内容（已扩展为FR49-FR52） |
| FR27 | Epic 6 | 手动备注/标签（已整合到FR39） |
| FR28 | Epic 6 | 自动生成摘要 |
| FR29 | Epic 6 | 自动生成标签（已整合到FR45） |
| FR30 | Epic 6 | 搜索建议 |
| FR31 | Epic 7 | 创建、重命名、删除收藏夹 |
| FR32 | Epic 7 | 将内容添加到收藏夹 |
| FR33 | Epic 7 | 从收藏夹移除内容 |
| FR34 | Epic 7 | 查看收藏夹内容数量和列表 |
| FR35 | Epic 7 | "未分类"收藏夹 |
| FR36 | Epic 7 | 侧边栏折叠/展开收藏夹列表 |
| FR37 | Epic 7 | 收集时选择目标收藏夹 |
| FR38 | Epic 7 | 创建、重命名、删除标签 |
| FR39 | Epic 7 | 为内容添加一个或多个标签 |
| FR40 | Epic 7 | 移除内容上的标签 |
| FR41 | Epic 7 | "无标签"分类 |
| FR42 | Epic 7 | 按标签筛选和查看内容 |
| FR43 | Epic 7 | 侧边栏查看所有标签列表 |
| FR44 | Epic 7 | 标签排序 |
| FR45 | Epic 7 | AI 自动生成标签 |
| FR46 | Epic 7 | 归档内容 |
| FR47 | Epic 7 | 查看"已归档"分类 |
| FR48 | Epic 7 | 恢复归档内容 |
| FR49 | Epic 7 | 删除内容（移动到"最近删除"） |
| FR50 | Epic 7 | 查看"最近删除"分类 |
| FR51 | Epic 7 | 永久删除内容 |
| FR52 | Epic 7 | 自动清理"最近删除"（可选） |
| FR53 | Epic 7 | 归档和删除功能统一在"其他"分类下 |

## Epic List

### Epic 1: 一键收集核心流程 (MVP P0)

**目标:** 用户可以在浏览网页时通过插件一键保存到本地应用，看到收集确认，内容安全存储在本地。

**FRs covered:** FR1, FR2, FR3, FR13, FR21, FR22, FR23

**技术实现:** packages/shared、SQLite、Axum HTTP Server、WXT 插件

---

### Epic 2: 语义搜索核心能力 (MVP P0)

**目标:** 用户可以通过模糊关键词（如"后台管理"）找到之前收集的 React Admin 文章，支持中英文混合搜索。

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR14, FR15

**技术实现:** sqlite-vec、all-MiniLM-L6-v2、React 搜索 UI

---

### Epic 3: 快速唤起体验 (MVP P0)

**目标:** 用户在任何应用中都可以通过全局快捷键 0.3 秒内唤起搜索框，Spotlight 级别的快速访问体验。

**FRs covered:** FR6, FR20

**技术实现:** Tauri 全局快捷键 API

---

### Epic 4: 系统托盘与常驻 (P1)

**目标:** 应用始终待命，开机自动启动后台运行，用户无需手动启动应用。

**FRs covered:** FR17, FR18, FR19

**技术实现:** Tauri 系统托盘、macOS Login Items API

---

### Epic 5: 内容管理与设置 (P1)

**目标:** 用户对收集的内容有完整的控制权，可以查看、删除、统计已收集的内容，配置应用设置。

**FRs covered:** FR16, FR24, FR25, FR26

**技术实现:** React 设置页面、Tauri Commands

---

### Epic 6: 搜索增强与应用提示 (Alpha/Beta)

**目标:** 更智能的搜索体验，支持备注、标签、自动摘要，应用未运行时友好提示。

**FRs covered:** FR4, FR5, FR28, FR30

**技术实现:** AI 增强、插件 UI 增强

---

### Epic 7: 内容组织与生命周期管理 (Alpha)

**目标:** 用户可以通过收藏夹、标签组织内容，支持归档和删除功能，提供完整的侧边栏导航体验。

**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53

**技术实现:** 数据库 Schema 扩展（favorites, tags, collection_tags 表）、侧边栏 UI、筛选功能、状态管理

---

## Epic 1: 一键收集核心流程

用户可以在浏览网页时通过插件一键保存到本地应用，看到收集确认，内容安全存储在本地。

### Story 1.1: 共享类型包初始化

**As a** 开发者,
**I want** 在 Monorepo 中有一个共享类型包,
**So that** 桌面应用和浏览器插件可以共享 API 类型定义，确保类型安全。

**Acceptance Criteria:**

**Given** 项目 Monorepo 结构已存在
**When** 开发者运行 `bun install`
**Then** `packages/shared` 包被正确链接到 workspace
**And** 可以从 `@memory-prosthetic/shared` 导入类型

**Given** 共享类型包已创建
**When** 定义 API 类型（CollectRequest, CollectResponse, HealthResponse）
**Then** 这些类型可在 `apps/desktop` 和 `apps/browser-extension` 中使用

**技术细节:**

- 创建 `packages/shared/package.json` 配置
- 定义 `types/api.ts`：CollectRequest, CollectResponse, HealthResponse
- 定义 `types/collection.ts`：Collection 实体类型
- 更新根 `package.json` workspace 配置

---

### Story 1.2: 本地数据库与内容存储

**As a** 用户,
**I want** 收集的网页内容被安全存储在本地,
**So that** 我的数据完全由我掌控，无需担心隐私泄露。

**Acceptance Criteria:**

**Given** 桌面应用首次启动
**When** 应用初始化
**Then** SQLite 数据库在 `~/Library/Application Support/memory-prosthetic/` 创建
**And** `collections` 表自动创建

**Given** 数据库已初始化
**When** 调用 `insert_collection(url, title, content)`
**Then** 内容被持久化存储
**And** 返回新创建的 collection ID

**Given** 应用意外崩溃后重启
**When** 检查数据库
**Then** 之前存储的所有内容完好无损（NFR7）

**技术细节:**

- Rust: `db/connection.rs` - SQLite 连接管理
- Rust: `db/collections.rs` - CRUD 操作
- 表结构: id, url, title, content, created_at, updated_at

---

### Story 1.3: HTTP Server 与健康检查

**As a** 浏览器插件,
**I want** 能够检查桌面应用是否正在运行,
**So that** 可以在收集前验证连接状态。

**Acceptance Criteria:**

**Given** 桌面应用已启动
**When** 发送 GET 请求到 `http://localhost:21890/api/health`
**Then** 返回 200 状态码和 `{ "status": "ok", "version": "0.1.0" }`

**Given** 桌面应用未运行
**When** 发送请求到 `http://localhost:21890/api/health`
**Then** 连接被拒绝（Connection Refused）

**Given** HTTP Server 启动
**When** 来自浏览器插件源的请求到达
**Then** CORS 正确配置，允许跨域请求（NFR15）

**技术细节:**

- Rust: `server/mod.rs` - Axum 服务器初始化
- Rust: `server/routes.rs` - 路由定义
- Rust: `server/handlers.rs` - 请求处理
- 端口: localhost:21890（可配置）

---

### Story 1.4: 内容收集 API

**As a** 浏览器插件,
**I want** 能够将网页内容发送到桌面应用,
**So that** 用户收集的内容可以被保存。

**Acceptance Criteria:**

**Given** 桌面应用 HTTP Server 正在运行
**When** 发送 POST 请求到 `/api/collect`，包含 `{ url, title, content }`
**Then** 返回 200 和 `{ "success": true, "id": <collection_id> }`
**And** 内容被存储到 SQLite 数据库

**Given** 请求缺少必要字段（如 url）
**When** 发送不完整的 POST 请求
**Then** 返回 400 和 `{ "success": false, "error": { "code": "INVALID_REQUEST", "message": "..." } }`

**Given** 相同 URL 已存在
**When** 再次收集该 URL
**Then** 更新现有记录而非创建新记录
**And** 返回成功响应

**技术细节:**

- API 路径: `POST /api/collect`
- 请求体: `{ url: string, title: string, content: string }`
- 响应体: `{ success: boolean, id?: number, error?: { code, message } }`

---

### Story 1.5: 浏览器插件 - 应用状态检测

**As a** 用户,
**I want** 在收集前知道桌面应用是否正在运行,
**So that** 不会因为应用未启动而收集失败。

**Acceptance Criteria:**

**Given** 浏览器插件已加载
**When** 用户点击插件图标
**Then** 插件检查 `/api/health` 端点状态
**And** 显示应用连接状态（已连接/未连接）

**Given** 桌面应用未运行
**When** 用户尝试收集
**Then** 显示友好提示"请先启动记忆外挂应用"
**And** 不发送收集请求

**Given** 桌面应用正在运行
**When** 用户点击插件图标
**Then** 显示"已连接"状态
**And** 收集按钮可用

**技术细节:**

- WXT: `lib/api.ts` - 健康检查函数
- WXT: `entrypoints/popup/App.tsx` - 状态 UI
- 轮询间隔: 点击时检查，非持续轮询

---

### Story 1.6: 浏览器插件 - 一键收集

**As a** 用户,
**I want** 通过点击浏览器插件一键收集当前网页,
**So that** 我可以快速保存有价值的内容而不打断阅读。

**Acceptance Criteria:**

**Given** 用户正在浏览一个网页，桌面应用已运行
**When** 用户点击插件图标并点击"收集"按钮
**Then** 插件提取当前页面的 URL、标题和正文内容
**And** 发送到桌面应用 `/api/collect` 端点
**And** 显示"已收集 ✓"确认反馈（FR2）

**Given** 收集请求发送成功
**When** 服务器返回成功响应
**Then** 确认提示在 1 秒后自动消失
**And** 收集完成时间 < 2 秒（NFR3）

**Given** 用户在特殊页面（如 chrome://、扩展页面）
**When** 用户尝试收集
**Then** 显示"无法收集此页面"提示

**Given** 网络或服务器错误
**When** 收集失败
**Then** 显示"收集失败，请重试"错误提示

**技术细节:**

- WXT: `entrypoints/content.ts` - 内容提取（使用 Readability 或类似库）
- WXT: `entrypoints/background.ts` - 消息处理
- WXT: `entrypoints/popup/` - 收集 UI

---

## Epic 2: 语义搜索核心能力

用户可以通过模糊关键词（如"后台管理"）找到之前收集的 React Admin 文章，支持中英文混合搜索。

### Story 2.1: Embedding 模型集成

**As a** 系统,
**I want** 能够将文本转换为语义向量,
**So that** 可以基于含义而非关键词匹配进行搜索。

**Acceptance Criteria:**

**Given** 桌面应用首次启动
**When** Embedding 模块初始化
**Then** all-MiniLM-L6-v2 模型被加载到内存
**And** 模型文件从应用资源目录加载（不需要网络）

**Given** 模型已加载
**When** 调用 `encode("这是一段测试文本")`
**Then** 返回 384 维的 f32 向量
**And** 编码时间 < 100ms（单条）

**Given** 模型加载完成
**When** 对相似文本进行编码
**Then** 生成的向量余弦相似度 > 0.8
**And** 支持中英文文本

**技术细节:**

- Rust: `embedding/mod.rs` - 模块入口
- Rust: `embedding/model.rs` - 模型加载（candle 或 ort）
- 模型: all-MiniLM-L6-v2 (23MB, 384 维)
- 模型存储: `src-tauri/resources/models/`

---

### Story 2.2: 向量存储与索引

**As a** 系统,
**I want** 能够高效存储和检索语义向量,
**So that** 可以快速找到相似内容。

**Acceptance Criteria:**

**Given** 数据库已初始化
**When** sqlite-vec 扩展加载
**Then** 向量存储功能可用
**And** `collection_embeddings` 表自动创建

**Given** 有新的 Embedding 向量
**When** 调用 `insert_embedding(collection_id, vector)`
**Then** 向量被存储并与 collection 关联

**Given** 数据库中有 1000 条向量
**When** 执行相似度搜索
**Then** 搜索时间 < 100ms
**And** 返回按相似度排序的结果

**技术细节:**

- Rust: `db/vectors.rs` - 向量 CRUD
- 表结构: collection_id (FK), embedding (vec_f32)
- 索引: sqlite-vec 向量索引

---

### Story 2.3: 内容收集时自动生成 Embedding

**As a** 用户,
**I want** 收集内容时自动生成语义向量,
**So that** 内容立即可被语义搜索。

**Acceptance Criteria:**

**Given** 用户通过插件收集了一篇文章
**When** 内容存储到数据库后
**Then** 系统后台自动生成该内容的 Embedding
**And** Embedding 存储到向量表

**Given** Embedding 生成正在进行
**When** 用户继续操作应用
**Then** UI 不被阻塞（后台处理）
**And** 生成完成后通过事件通知前端

**Given** Embedding 生成失败
**When** 检查错误日志
**Then** 错误被记录，但内容仍然保存
**And** 可手动触发重新生成

**技术细节:**

- Rust: `embedding/pipeline.rs` - 异步处理管道
- Tauri Event: `embedding:progress`, `embedding:completed`
- 错误处理: 优雅降级，内容不依赖 Embedding 存在

---

### Story 2.4: 语义搜索 API

**As a** 用户,
**I want** 通过模糊关键词搜索收集的内容,
**So that** 即使不记得精确词汇也能找到文章。

**Acceptance Criteria:**

**Given** 数据库中有收集的内容和对应的 Embedding
**When** 用户搜索 "后台管理"
**Then** 系统返回与 "React Admin"、"Dashboard" 等相关的文章
**And** 结果按相似度降序排列

**Given** 用户输入中英文混合查询 "react 状态管理"
**When** 执行搜索
**Then** 返回关于 Redux、Zustand、Jotai 等的相关文章（FR9）

**Given** 用户搜索无匹配内容的词汇
**When** 没有足够相似的结果
**Then** 返回空列表
**And** 响应包含提示信息（FR12）

**Given** 搜索请求发送
**When** 处理搜索
**Then** 响应时间 < 500ms（NFR2）

**技术细节:**

- Tauri Command: `search(query: String) -> Vec<SearchResult>`
- SearchResult: { id, url, title, snippet, score }
- 相似度阈值: 0.3（可配置）

---

### Story 2.5: 搜索结果 UI

**As a** 用户,
**I want** 看到清晰的搜索结果列表,
**So that** 可以快速找到并访问目标文章。

**Acceptance Criteria:**

**Given** 用户在搜索框输入关键词并按回车
**When** 搜索完成
**Then** 显示匹配结果列表，每项包含标题和摘要（FR10）
**And** 高亮显示匹配的关键词

**Given** 用户点击某条搜索结果
**When** 点击事件触发
**Then** 在默认浏览器中打开原文链接（FR11）

**Given** 搜索无结果
**When** 结果列表为空
**Then** 显示"未找到相关内容，尝试其他关键词"提示（FR12）

**Given** 搜索正在进行
**When** 等待响应
**Then** 显示加载状态（Skeleton 或 Spinner）

**技术细节:**

- React: `components/features/SearchBox.tsx`
- React: `components/features/ResultList.tsx`
- Hook: `hooks/use-search.ts` (TanStack Query)
- Store: `stores/use-search-store.ts` (Zustand)

---

## Epic 3: 快速唤起体验

用户在任何应用中都可以通过全局快捷键 0.3 秒内唤起搜索框，Spotlight 级别的快速访问体验。

### Story 3.1: 全局快捷键注册

**As a** 用户,
**I want** 在任何应用中按下快捷键都能触发搜索,
**So that** 无需切换窗口就能快速搜索。

**Acceptance Criteria:**

**Given** 桌面应用已启动（前台或后台）
**When** 用户在任何应用中按下 `Cmd+Shift+Space`（默认）
**Then** 应用接收到全局快捷键事件
**And** 触发搜索窗口显示

**Given** 快捷键与其他应用冲突
**When** 注册失败
**Then** 应用记录警告日志
**And** 用户可在设置中更改快捷键

**Given** 应用正在运行
**When** 应用退出
**Then** 全局快捷键被正确注销
**And** 不影响系统其他应用

**技术细节:**

- Tauri: `tauri-plugin-global-shortcut`
- 默认快捷键: `Cmd+Shift+Space` (macOS)
- Rust: `commands/settings.rs` - 快捷键管理

---

### Story 3.2: 搜索窗口快速唤起

**As a** 用户,
**I want** 快捷键按下后 0.3 秒内看到搜索框,
**So that** 体验如 Spotlight/Raycast 般流畅。

**Acceptance Criteria:**

**Given** 用户按下全局快捷键
**When** 事件被处理
**Then** 搜索窗口在 300ms 内显示（NFR1）
**And** 搜索输入框自动获得焦点

**Given** 搜索窗口已显示
**When** 用户按下 `Escape` 键
**Then** 搜索窗口隐藏
**And** 焦点返回之前的应用

**Given** 搜索窗口已显示
**When** 用户点击窗口外部区域
**Then** 搜索窗口隐藏

**Given** 搜索窗口已显示
**When** 用户再次按下快捷键
**Then** 搜索窗口隐藏（Toggle 行为）

**技术细节:**

- Tauri: 专用搜索窗口（无边框、始终在顶层）
- React: `routes/search.tsx` - 搜索专用页面
- 窗口配置: transparent, decorations: false, always_on_top: true

---

### Story 3.3: 快捷键自定义设置

**As a** 用户,
**I want** 能够自定义唤起快捷键,
**So that** 可以避免与我常用的快捷键冲突。

**Acceptance Criteria:**

**Given** 用户打开设置页面
**When** 点击"快捷键"设置项
**Then** 显示当前配置的快捷键
**And** 提供修改按钮

**Given** 用户点击修改快捷键
**When** 进入录制模式
**Then** 显示"请按下新的快捷键组合..."提示
**And** 捕获用户按下的组合键

**Given** 用户按下新的快捷键组合
**When** 组合键被捕获
**Then** 显示将要设置的快捷键（如 `Cmd+Option+S`）
**And** 用户确认后保存

**Given** 新快捷键已保存
**When** 应用重新注册快捷键
**Then** 新快捷键生效
**And** 旧快捷键不再触发

**技术细节:**

- 设置存储: SQLite 配置表或 JSON 文件
- Tauri Command: `set_shortcut(shortcut: String)`
- React: `components/features/ShortcutPicker.tsx`

---

## Epic 4: 系统托盘与常驻

应用始终待命，开机自动启动后台运行，用户无需手动启动应用。

### Story 4.1: 系统托盘图标

**As a** 用户,
**I want** 在系统托盘看到应用图标,
**So that** 知道应用正在后台运行，随时待命。

**Acceptance Criteria:**

**Given** 桌面应用已启动
**When** 应用初始化完成
**Then** 系统托盘显示应用图标
**And** 图标清晰可辨（支持 Retina 显示）

**Given** 应用正在同步内容
**When** 收集请求进行中
**Then** 托盘图标显示同步状态（可选：旋转动画或颜色变化）

**Given** 应用发生错误
**When** HTTP Server 启动失败等
**Then** 托盘图标显示错误状态
**And** 左键点击显示错误详情

**Given** 用户左键点击托盘图标
**When** 点击事件触发
**Then** 唤起搜索窗口（与快捷键行为一致）

**技术细节:**

- Tauri: `tauri-plugin-system-tray` (Tauri 2.x 内置)
- 图标: 多尺寸 PNG（16x16, 32x32, 64x64）
- 状态图标: normal, syncing, error

---

### Story 4.2: 托盘右键菜单

**As a** 用户,
**I want** 通过托盘图标右键菜单快速访问功能,
**So that** 可以方便地打开主窗口、设置或退出应用。

**Acceptance Criteria:**

**Given** 用户右键点击托盘图标
**When** 右键菜单显示
**Then** 显示以下选项：

- 打开搜索
- 打开主窗口
- 设置
- 分隔线
- 退出

**Given** 用户点击"打开搜索"
**When** 菜单项被选中
**Then** 唤起搜索窗口

**Given** 用户点击"打开主窗口"
**When** 菜单项被选中
**Then** 打开或聚焦主应用窗口

**Given** 用户点击"设置"
**When** 菜单项被选中
**Then** 打开主窗口并导航到设置页面

**Given** 用户点击"退出"
**When** 菜单项被选中
**Then** 应用优雅关闭（保存状态、注销快捷键）
**And** 托盘图标消失

**技术细节:**

- Tauri: 系统托盘菜单 API
- Rust: 菜单事件处理

---

### Story 4.3: 开机自启动

**As a** 用户,
**I want** 应用在电脑开机后自动启动,
**So that** 无需手动打开应用，随时可用。

**Acceptance Criteria:**

**Given** 用户首次安装应用
**When** 应用首次启动
**Then** 询问用户是否启用开机自启
**And** 用户选择后保存设置

**Given** 用户在设置中启用开机自启
**When** 设置保存
**Then** 应用注册到 macOS Login Items
**And** 下次开机时自动启动

**Given** 开机自启已启用
**When** 电脑重启后
**Then** 应用在后台自动启动（托盘模式）
**And** 不显示主窗口，仅显示托盘图标

**Given** 用户在设置中禁用开机自启
**When** 设置保存
**Then** 应用从 Login Items 移除
**And** 下次开机不再自动启动

**技术细节:**

- Tauri: `tauri-plugin-autostart`
- macOS: Login Items API
- 设置存储: SQLite 配置表

---

## Epic 5: 内容管理与设置

用户对收集的内容有完整的控制权，可以查看、删除、统计已收集的内容，配置应用设置。

### Story 5.1: 内容列表浏览

**As a** 用户,
**I want** 查看我收集的所有内容,
**So that** 可以回顾和管理我的知识库。

**Acceptance Criteria:**

**Given** 用户打开主窗口
**When** 导航到"内容库"页面
**Then** 显示已收集内容的列表
**And** 每项显示标题、来源域名、收集时间

**Given** 内容列表加载中
**When** 数据尚未返回
**Then** 显示加载骨架屏（Skeleton）

**Given** 内容库为空
**When** 没有任何收集的内容
**Then** 显示空状态插图和提示"还没有收集任何内容，试试浏览器插件吧"

**Given** 内容数量较多（> 50 条）
**When** 滚动列表
**Then** 使用虚拟滚动优化性能
**And** 滚动流畅，无卡顿

**Given** 用户想要快速查找
**When** 在列表顶部输入关键词
**Then** 列表实时过滤（本地过滤，非语义搜索）

**技术细节:**

- React: `routes/library.tsx` - 内容库页面
- React: `components/features/CollectionList.tsx`
- Tauri Command: `get_collections() -> Vec<Collection>`
- 虚拟滚动: TanStack Virtual 或 react-window

---

### Story 5.2: 内容详情与删除

**As a** 用户,
**I want** 查看内容详情并能删除不需要的内容,
**So that** 保持知识库整洁，释放存储空间。

**Acceptance Criteria:**

**Given** 用户在内容列表点击某项
**When** 点击事件触发
**Then** 显示内容详情面板（侧边或模态框）
**And** 显示完整标题、URL、正文内容、收集时间

**Given** 用户在详情面板
**When** 点击"打开原文"按钮
**Then** 在默认浏览器中打开原文链接

**Given** 用户在详情面板
**When** 点击"删除"按钮
**Then** 显示确认对话框"确定删除这篇内容？"

**Given** 用户确认删除
**When** 点击确认
**Then** 内容从数据库删除（包括 Embedding）
**And** 列表刷新，显示删除成功 Toast

**Given** 用户取消删除
**When** 点击取消
**Then** 对话框关闭，内容保持不变

**技术细节:**

- React: `components/features/CollectionDetail.tsx`
- Tauri Command: `delete_collection(id: i64)`
- UI: shadcn/ui Dialog, Toast

---

### Story 5.3: 内容统计仪表盘

**As a** 用户,
**I want** 看到我的内容收集统计,
**So that** 了解我的知识积累情况。

**Acceptance Criteria:**

**Given** 用户打开主窗口
**When** 查看仪表盘区域
**Then** 显示以下统计信息：

- 总收集数量
- 本周新增数量
- 最近收集时间

**Given** 用户收集了新内容
**When** 回到主窗口
**Then** 统计数据自动更新

**Given** 用户想查看更详细的统计
**When** 点击统计区域
**Then** 显示时间分布图表（可选：按周/月）

**技术细节:**

- React: `components/features/StatsCard.tsx`
- Tauri Command: `get_stats() -> CollectionStats`
- 图表: 简单柱状图（可选 recharts 或 CSS 实现）

---

### Story 5.4: 应用设置页面

**As a** 用户,
**I want** 配置应用的各项设置,
**So that** 可以按我的偏好使用应用。

**Acceptance Criteria:**

**Given** 用户导航到设置页面
**When** 页面加载
**Then** 显示以下设置项：

- 全局快捷键（链接到 Story 3.3）
- HTTP Server 端口
- 开机自启（链接到 Story 4.3）
- 关于/版本信息

**Given** 用户修改 HTTP Server 端口
**When** 输入新端口号（如 21891）
**Then** 验证端口有效性（1024-65535）
**And** 保存后提示"需要重启应用生效"

**Given** 用户输入无效端口
**When** 端口号超出范围或被占用
**Then** 显示错误提示
**And** 不保存设置

**Given** 用户查看"关于"信息
**When** 点击关于选项
**Then** 显示应用版本、构建日期、开源协议、GitHub 链接

**技术细节:**

- React: `routes/settings.tsx`
- React: `components/features/SettingsPanel.tsx`
- Tauri Command: `get_settings()`, `set_settings(settings: Settings)`
- 设置存储: SQLite 配置表

---

## Epic 6: 搜索增强与应用提示

更智能的搜索体验，支持备注、标签、自动摘要，应用未运行时友好提示。

### Story 6.1: 应用未运行提示

**As a** 用户,
**I want** 在桌面应用未运行时收到友好提示,
**So that** 知道需要启动应用才能收集内容。

**Acceptance Criteria:**

**Given** 用户点击浏览器插件图标
**When** 桌面应用未运行（健康检查失败）
**Then** 显示"记忆外挂应用未运行"提示
**And** 提供"如何启动"帮助链接

**Given** 用户看到应用未运行提示
**When** 点击帮助链接
**Then** 在新标签页打开快速入门指南

**Given** 用户启动了桌面应用
**When** 再次点击插件图标
**Then** 显示正常的收集界面
**And** 状态显示"已连接"

**技术细节:**

- WXT: `entrypoints/popup/App.tsx` - 状态判断与提示
- 帮助页面: GitHub README 或本地 HTML

---

### Story 6.2: 收集预览摘要

**As a** 用户,
**I want** 在收集前预览将要保存的内容,
**So that** 确认内容正确，避免收集无关页面。

**Acceptance Criteria:**

**Given** 用户点击浏览器插件图标
**When** 插件提取当前页面内容
**Then** 在收集确认前显示预览：

- 页面标题
- 正文前 200 字摘要
- 预估阅读时间

**Given** 用户查看预览
**When** 内容正确
**Then** 用户点击"收集"确认保存

**Given** 用户查看预览
**When** 发现内容不对（如登录页面）
**Then** 用户可以取消收集
**And** 不发送请求到桌面应用

**技术细节:**

- WXT: `entrypoints/content.ts` - 内容提取增强
- WXT: `components/PreviewCard.tsx` - 预览 UI

---

### Story 6.3: 手动备注与标签

**As a** 用户,
**I want** 为收集的内容添加自定义备注和标签,
**So that** 更容易通过关键词找到特定内容。

**Acceptance Criteria:**

**Given** 用户在内容详情页
**When** 点击"添加备注"
**Then** 显示文本输入框
**And** 用户可以输入自定义备注

**Given** 用户添加了备注
**When** 执行搜索
**Then** 备注内容也参与语义搜索匹配

**Given** 用户在内容详情页
**When** 点击"添加标签"
**Then** 显示标签输入框（支持多个）
**And** 显示已有标签建议（自动补全）

**Given** 用户添加了标签
**When** 在内容列表按标签筛选
**Then** 只显示包含该标签的内容

**技术细节:**

- 数据库: 新增 `notes` 字段，`tags` 表（多对多）
- React: `components/features/TagEditor.tsx`
- Tauri Command: `update_collection_notes()`, `add_tag()`, `remove_tag()`

---

### Story 6.4: AI 自动摘要

**As a** 用户,
**I want** 系统自动为收集的内容生成摘要,
**So that** 快速了解文章主旨，无需阅读全文。

**Acceptance Criteria:**

**Given** 用户收集了一篇长文章
**When** 内容保存后
**Then** 系统后台自动生成 100-200 字的摘要
**And** 摘要显示在搜索结果和内容详情中

**Given** 自动摘要正在生成
**When** 用户查看内容
**Then** 显示"摘要生成中..."占位符

**Given** 摘要生成完成
**When** 用户查看搜索结果
**Then** 每条结果显示自动摘要（替代简单截断）

**Given** 用户不满意自动摘要
**When** 在详情页编辑
**Then** 可以手动修改摘要内容

**技术细节:**

- 实现选项:
  1. 本地小模型（如 Phi-2）
  2. 简单提取式摘要（首段 + 关键句）
  3. 可选云端 API（用户自带 API Key）
- 数据库: 新增 `summary` 字段

---

### Story 6.5: AI 自动标签

**As a** 用户,
**I want** 系统自动为收集的内容生成分类标签,
**So that** 无需手动分类，内容自动组织。

**Acceptance Criteria:**

**Given** 用户收集了一篇技术文章
**When** 内容保存后
**Then** 系统自动生成 2-5 个相关标签（如"React", "状态管理", "前端"）

**Given** 自动标签已生成
**When** 用户查看内容
**Then** 自动标签以不同样式显示（与手动标签区分）

**Given** 用户不认可某个自动标签
**When** 点击删除
**Then** 该标签被移除
**And** 系统学习用户偏好（可选）

**Given** 用户按标签浏览
**When** 点击某个标签
**Then** 显示所有包含该标签的内容（包括自动和手动）

**技术细节:**

- 实现选项:
  1. 基于 Embedding 的聚类分类
  2. 关键词提取（TF-IDF 或 TextRank）
  3. 预定义分类 + 匹配
- 数据库: 标签表增加 `is_auto` 字段

---

### Story 6.6: 搜索建议

**As a** 用户,
**I want** 在输入搜索词时看到建议,
**So that** 更快找到想要的内容。

**Acceptance Criteria:**

**Given** 用户在搜索框输入
**When** 输入超过 2 个字符
**Then** 显示搜索建议下拉列表
**And** 建议来自：最近搜索、热门标签、相似标题

**Given** 用户看到搜索建议
**When** 点击某个建议
**Then** 该建议填入搜索框
**And** 自动执行搜索

**Given** 用户输入时
**When** 按上下箭头键
**Then** 可以在建议列表中导航
**And** 按回车选中当前建议

**Given** 搜索建议显示
**When** 用户按 Escape 或点击外部
**Then** 建议列表隐藏

**技术细节:**

- React: `components/features/SearchSuggestions.tsx`
- 数据来源: 搜索历史表、标签表、标题模糊匹配
- 防抖: 300ms 延迟请求

---

## Epic 7: 内容组织与生命周期管理

用户可以通过收藏夹、标签组织内容，支持归档和删除功能，提供完整的侧边栏导航体验。

### Story 7.1: 数据库 Schema 扩展

**As a** 开发者,
**I want** 数据库支持收藏夹、标签和内容状态管理,
**So that** 可以实现内容组织功能。

**Acceptance Criteria:**

**Given** 数据库已初始化
**When** 运行 Schema 迁移
**Then** 创建以下表：

- `favorites` 表（id, name, icon, created_at, updated_at）
- `tags` 表（id, name, color, created_at, updated_at）
- `collection_tags` 关联表（collection_id, tag_id, created_at）
- `collections` 表添加字段：`favorite_id`, `status`

**Given** Schema 已更新
**When** 查询数据库
**Then** 所有表都有正确的索引和外键约束
**And** 默认创建"未分类"收藏夹（name = '未分类'）

**技术细节:**

- Rust: `db/migrations/` - Schema 迁移脚本
- SQLite: 外键约束、索引优化
- 默认数据: 系统启动时创建"未分类"收藏夹

---

### Story 7.2: 收藏夹管理

**As a** 用户,
**I want** 创建、重命名和删除收藏夹,
**So that** 可以按主题组织收集的内容。

**Acceptance Criteria:**

**Given** 用户在侧边栏
**When** 点击收藏夹区域的"+"按钮
**Then** 显示创建收藏夹对话框
**And** 用户可以输入收藏夹名称

**Given** 用户输入收藏夹名称
**When** 点击"创建"
**Then** 收藏夹出现在侧边栏列表中
**And** 显示内容数量为 0

**Given** 用户已创建收藏夹
**When** 右键点击收藏夹
**Then** 显示上下文菜单：重命名、删除

**Given** 用户选择重命名
**When** 输入新名称并确认
**Then** 收藏夹名称更新
**And** 侧边栏立即反映更改

**Given** 用户选择删除收藏夹
**When** 收藏夹中有内容
**Then** 显示确认对话框："删除后，内容将移动到'未分类'"
**And** 用户确认后，收藏夹被删除，内容移动到"未分类"

**Given** 用户选择删除收藏夹
**When** 收藏夹为空
**Then** 直接删除，无需确认

**技术细节:**

- React: `components/features/FavoritesList.tsx`
- React: `components/features/CreateFavoriteDialog.tsx`
- Tauri Commands: `create_favorite()`, `update_favorite()`, `delete_favorite()`
- Rust: `db/favorites.rs` - CRUD 操作
- 事件: `favorite:created`, `favorite:updated`, `favorite:deleted`

---

### Story 7.3: 将内容添加到收藏夹

**As a** 用户,
**I want** 将收集的内容添加到收藏夹中,
**So that** 可以按主题组织内容。

**Acceptance Criteria:**

**Given** 用户查看内容列表或详情
**When** 点击内容项的"添加到收藏夹"按钮
**Then** 显示收藏夹选择菜单
**And** 显示所有收藏夹列表（包括"未分类"）

**Given** 用户选择收藏夹
**When** 点击某个收藏夹
**Then** 内容被添加到该收藏夹
**And** 侧边栏中该收藏夹的内容数量更新
**And** 显示成功提示

**Given** 内容已在某个收藏夹中
**When** 用户选择另一个收藏夹
**Then** 内容从原收藏夹移除，添加到新收藏夹
**And** 两个收藏夹的内容数量都更新

**技术细节:**

- React: `components/features/CollectionItem.tsx` - 添加到收藏夹按钮
- React: `components/features/FavoriteSelector.tsx` - 收藏夹选择器
- Tauri Command: `update_collection()` - 更新 `favorite_id`
- Rust: `db/collections.rs` - 更新收藏夹关联
- 事件: `collection:updated`

---

### Story 7.4: 查看收藏夹内容

**As a** 用户,
**I want** 查看每个收藏夹中的内容列表,
**So that** 可以快速找到特定主题的内容。

**Acceptance Criteria:**

**Given** 用户在侧边栏
**When** 点击某个收藏夹
**Then** 主内容区显示该收藏夹的所有内容
**And** 显示内容数量（如"5 条内容"）

**Given** 用户查看收藏夹内容
**When** 收藏夹为空
**Then** 显示空状态提示："此收藏夹还没有内容"
**And** 提供"添加内容"按钮

**Given** 用户查看"未分类"收藏夹
**When** 点击它
**Then** 显示所有未分配到其他收藏夹的内容
**And** 显示内容数量

**Given** 用户在收藏夹内容列表中
**When** 执行搜索
**Then** 搜索结果限定在当前收藏夹内

**技术细节:**

- React: `components/features/CollectionList.tsx` - 支持 `favorite_id` 筛选
- TanStack Query: `useCollections({ favoriteId })`
- Tauri Command: `get_collections({ favorite_id })`
- Rust: `db/collections.rs` - 按收藏夹查询

---

### Story 7.5: 侧边栏收藏夹列表

**As a** 用户,
**I want** 在侧边栏中查看和管理收藏夹列表,
**So that** 可以快速导航到不同主题的内容。

**Acceptance Criteria:**

**Given** 用户在应用主界面
**When** 查看侧边栏
**Then** 显示"收藏夹"区域
**And** 显示折叠/展开按钮（chevron 图标）

**Given** 收藏夹区域已展开
**When** 点击折叠按钮
**Then** 收藏夹列表隐藏
**And** 只显示"收藏夹"标题和"+"按钮

**Given** 收藏夹区域已折叠
**When** 点击展开按钮
**Then** 显示所有收藏夹列表
**And** 每个收藏夹显示名称和内容数量（如"未分类 5"）

**Given** 用户有多个收藏夹
**When** 查看侧边栏
**Then** 收藏夹按创建时间或名称排序显示
**And** "未分类"始终显示在第一位

**技术细节:**

- React: `components/features/Sidebar.tsx` - 侧边栏主组件
- React: `components/features/FavoritesList.tsx` - 收藏夹列表
- Zustand: `stores/use-sidebar-store.ts` - 展开/折叠状态
- TanStack Query: `useFavorites()` - 获取收藏夹列表

---

### Story 7.6: 标签管理

**As a** 用户,
**I want** 创建、重命名和删除标签,
**So that** 可以为内容添加分类标记。

**Acceptance Criteria:**

**Given** 用户在侧边栏标签区域
**When** 点击"+"按钮
**Then** 显示创建标签对话框
**And** 用户可以输入标签名称

**Given** 用户输入标签名称
**When** 标签名称已存在
**Then** 显示错误提示："标签已存在"
**And** 不允许创建重复标签

**Given** 用户输入唯一标签名称
**When** 点击"创建"
**Then** 标签出现在侧边栏标签列表中
**And** 显示使用该标签的内容数量（初始为 0）

**Given** 用户已创建标签
**When** 右键点击标签
**Then** 显示上下文菜单：重命名、删除

**Given** 用户选择重命名标签
**When** 输入新名称并确认
**Then** 标签名称更新
**And** 所有使用该标签的内容关联保持不变

**Given** 用户选择删除标签
**When** 标签被内容使用
**Then** 显示确认对话框："删除后，内容将失去此标签"
**And** 用户确认后，标签被删除，内容关联被移除

**技术细节:**

- React: `components/features/TagsList.tsx`
- React: `components/features/CreateTagDialog.tsx`
- Tauri Commands: `create_tag()`, `update_tag()`, `delete_tag()`
- Rust: `db/tags.rs` - CRUD 操作
- 事件: `tag:created`, `tag:updated`, `tag:deleted`

---

### Story 7.7: 为内容添加标签

**As a** 用户,
**I want** 为收集的内容添加一个或多个标签,
**So that** 可以通过标签快速筛选和查找内容。

**Acceptance Criteria:**

**Given** 用户查看内容详情或列表项
**When** 点击"添加标签"按钮
**Then** 显示标签选择器
**And** 显示所有已有标签列表
**And** 显示标签输入框（支持创建新标签）

**Given** 用户在标签选择器中
**When** 输入标签名称
**Then** 显示匹配的已有标签建议（自动补全）
**And** 如果输入新标签名称，显示"创建新标签"选项

**Given** 用户选择已有标签或创建新标签
**When** 点击确认
**Then** 标签被添加到内容
**And** 内容项显示标签徽章
**And** 标签的使用数量更新

**Given** 内容已有多个标签
**When** 用户查看内容
**Then** 显示所有标签徽章
**And** 可以点击标签徽章快速筛选

**技术细节:**

- React: `components/features/TagSelector.tsx` - 标签选择器
- React: `components/features/TagBadge.tsx` - 标签徽章
- Tauri Command: `update_collection()` - 更新标签关联
- Rust: `db/collection_tags.rs` - 多对多关联管理
- 事件: `collection:tags_updated`

---

### Story 7.8: 按标签筛选内容

**As a** 用户,
**I want** 按标签筛选和查看内容,
**So that** 可以快速找到特定主题的内容。

**Acceptance Criteria:**

**Given** 用户在侧边栏
**When** 点击某个标签
**Then** 主内容区显示所有包含该标签的内容
**And** 显示筛选提示："标签: #标签名 (5 条)"

**Given** 用户查看标签内容列表
**When** 点击"清除筛选"
**Then** 显示所有内容（取消标签筛选）

**Given** 用户在内容列表中
**When** 点击内容项的标签徽章
**Then** 应用该标签筛选
**And** 显示该标签的所有内容

**Given** 用户按标签筛选
**When** 执行搜索
**Then** 搜索结果限定在包含该标签的内容中

**Given** 用户查看"无标签"分类
**When** 点击它
**Then** 显示所有未添加标签的内容

**技术细节:**

- React: `components/features/CollectionList.tsx` - 支持 `tagIds` 筛选
- TanStack Query: `useCollections({ tagIds })`
- Tauri Command: `get_collections({ tag_ids })`
- Rust: `db/collections.rs` - JOIN 查询标签关联

---

### Story 7.9: 标签排序

**As a** 用户,
**I want** 对标签进行排序,
**So that** 可以按使用频率或字母顺序组织标签。

**Acceptance Criteria:**

**Given** 用户在侧边栏标签区域
**When** 点击排序图标
**Then** 显示排序选项菜单：

- 按名称排序（A-Z）
- 按使用频率排序（最常用在前）
- 按创建时间排序（最新在前）

**Given** 用户选择排序方式
**When** 点击某个选项
**Then** 标签列表立即按选择的方式排序
**And** 排序偏好被保存（下次打开应用时保持）

**技术细节:**

- React: `components/features/TagsList.tsx` - 排序功能
- Zustand: `stores/use-settings-store.ts` - 保存排序偏好
- Tauri Command: `get_tags({ sort })` - 支持排序参数
- Rust: `db/tags.rs` - ORDER BY 查询

---

### Story 7.10: AI 自动生成标签

**As a** 用户,
**I want** 系统自动为收集的内容生成标签,
**So that** 无需手动添加就能获得基础分类。

**Acceptance Criteria:**

**Given** 用户收集了新内容
**When** 内容处理完成
**Then** 系统自动分析内容
**And** 生成 2-5 个相关标签（如"React", "状态管理", "前端"）

**Given** 自动标签已生成
**When** 用户查看内容
**Then** 自动标签以不同样式显示（与手动标签区分，如灰色背景）
**And** 显示"自动"标识

**Given** 用户不认可某个自动标签
**When** 点击标签的"移除"按钮
**Then** 该标签被移除
**And** 不再显示

**Given** 用户认可自动标签
**When** 点击标签的"确认"按钮
**Then** 标签样式变为手动标签样式
**And** 不再显示"自动"标识

**技术细节:**

- Rust: `embedding/tag_generation.rs` - 标签生成逻辑
- 实现选项: 关键词提取（TF-IDF）、预定义分类匹配
- 数据库: 标签表 `is_auto` 字段标识自动标签
- 事件: `collection:auto_tags_generated`

---

### Story 7.11: 归档内容

**As a** 用户,
**I want** 将内容归档,
**So that** 可以隐藏不再需要但不想删除的内容。

**Acceptance Criteria:**

**Given** 用户查看内容列表或详情
**When** 点击"归档"按钮
**Then** 内容状态变为"已归档"
**And** 内容从正常列表中消失
**And** 显示成功提示："已归档"

**Given** 内容已归档
**When** 用户查看正常内容列表
**Then** 归档内容不显示
**And** 内容数量统计不包含归档内容

**Given** 用户在侧边栏"其他"分类下
**When** 点击"已归档"
**Then** 显示所有归档内容列表
**And** 显示归档内容数量

**技术细节:**

- React: `components/features/CollectionItem.tsx` - 归档按钮
- Tauri Command: `archive_collection({ id })`
- Rust: `db/collections.rs` - 更新 `status = 'archived'`
- 事件: `collection:archived`

---

### Story 7.12: 恢复归档内容

**As a** 用户,
**I want** 将归档的内容恢复,
**So that** 可以重新在正常列表中查看。

**Acceptance Criteria:**

**Given** 用户在"已归档"分类中
**When** 查看归档内容列表
**Then** 每个内容项显示"恢复"按钮

**Given** 用户点击"恢复"按钮
**When** 确认操作
**Then** 内容状态变为"active"
**And** 内容从归档列表移除
**And** 出现在正常内容列表中
**And** 显示成功提示："已恢复"

**技术细节:**

- React: `components/features/CollectionList.tsx` - 归档内容列表
- Tauri Command: `restore_collection({ id })`
- Rust: `db/collections.rs` - 更新 `status = 'active'`
- 事件: `collection:restored`

---

### Story 7.13: 删除内容到"最近删除"

**As a** 用户,
**I want** 删除内容,
**So that** 可以清理不需要的内容。

**Acceptance Criteria:**

**Given** 用户查看内容列表或详情
**When** 点击"删除"按钮
**Then** 显示确认对话框："确定要删除此内容吗？"
**And** 提示："删除后可在'最近删除'中恢复"

**Given** 用户确认删除
**When** 点击"确定"
**Then** 内容状态变为"deleted"
**And** 内容从正常列表和归档列表中消失
**And** 移动到"最近删除"分类
**And** 显示成功提示："已删除"

**Given** 用户在侧边栏"其他"分类下
**When** 点击"最近删除"
**Then** 显示所有已删除内容列表
**And** 显示删除时间
**And** 显示"恢复"和"永久删除"按钮

**技术细节:**

- React: `components/features/CollectionItem.tsx` - 删除按钮
- React: `components/features/DeleteConfirmDialog.tsx` - 删除确认对话框
- Tauri Command: `delete_collection({ id, permanent: false })`
- Rust: `db/collections.rs` - 更新 `status = 'deleted'`
- 事件: `collection:deleted`

---

### Story 7.14: 永久删除内容

**As a** 用户,
**I want** 永久删除内容,
**So that** 可以彻底清理不需要的内容。

**Acceptance Criteria:**

**Given** 用户在"最近删除"分类中
**When** 查看已删除内容列表
**Then** 每个内容项显示"永久删除"按钮

**Given** 用户点击"永久删除"
**When** 显示确认对话框："此操作不可恢复，确定要永久删除吗？"
**And** 用户确认
**Then** 内容从数据库中彻底删除
**And** 关联的向量嵌入也被删除
**And** 内容从"最近删除"列表移除
**And** 显示成功提示："已永久删除"

**技术细节:**

- React: `components/features/CollectionList.tsx` - 永久删除按钮
- Tauri Command: `delete_collection({ id, permanent: true })`
- Rust: `db/collections.rs` - DELETE 操作（CASCADE 删除关联）
- Rust: `db/vectors.rs` - 删除向量嵌入
- 事件: `collection:permanently_deleted`

---

### Story 7.15: 自动清理"最近删除"

**As a** 用户,
**I want** 系统自动清理"最近删除"中超过30天的内容,
**So that** 避免占用过多存储空间。

**Acceptance Criteria:**

**Given** 系统已启动
**When** 每天首次启动时
**Then** 检查"最近删除"中的内容
**And** 自动永久删除超过30天的内容

**Given** 自动清理执行
**When** 有内容被清理
**Then** 在日志中记录清理数量
**And** 可选：显示通知"已清理 X 条过期内容"

**Given** 用户查看设置
**When** 查看"自动清理"选项
**Then** 可以启用/禁用自动清理
**And** 可以自定义清理天数（默认30天）

**技术细节:**

- Rust: `db/collections.rs` - 清理任务
- Tauri: 后台任务或启动时检查
- 设置: `auto_cleanup_enabled`, `auto_cleanup_days`
- 事件: `cleanup:completed`

---

### Story 7.16: 侧边栏"其他"分类

**As a** 用户,
**I want** 归档和删除功能统一在"其他"分类下,
**So that** 侧边栏组织清晰，易于导航。

**Acceptance Criteria:**

**Given** 用户在侧边栏
**When** 查看"其他"分类
**Then** 显示以下子项：

- "已归档"（显示归档内容数量）
- "最近删除"（显示删除内容数量）

**Given** "其他"分类已展开
**When** 点击"已归档"
**Then** 主内容区显示所有归档内容
**And** 显示筛选提示："已归档 (3 条)"

**Given** "其他"分类已展开
**When** 点击"最近删除"
**Then** 主内容区显示所有已删除内容
**And** 显示筛选提示："最近删除 (2 条)"

**技术细节:**

- React: `components/features/Sidebar.tsx` - "其他"分类区域
- React: `components/features/OtherSection.tsx` - "其他"分类组件
- 状态管理: 与收藏夹和标签区域独立的展开/折叠状态

---
