---
title: '文章获取 API 优化'
slug: 'article-fetch-api-optimization'
created: '2025-02-03'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4, 5]  # Step 5 = Party Mode (Hybrid Approach)
tech_stack: ['Tauri 2.x', 'Rust 2021', 'React 19', 'TypeScript 5.9', 'TanStack Query', 'Axum', 'SQLite', 'rusqlite']
party_mode_review: true  # Party Mode feedback integrated
approach: 'hybrid'  # Hybrid: Keep two-hook architecture + fix critical bugs + add comprehensive docs
files_to_modify: [
  'apps/desktop/src-tauri/src/server/handlers.rs',
  'apps/desktop/src-tauri/src/server/routes.rs',
  'apps/desktop/src-tauri/src/lib.rs',
  'apps/desktop/src-tauri/src/db/connection.rs',
  'apps/desktop/src-tauri/src/db/collections.rs',
  'packages/shared/src/types/collection.ts',
  'packages/shared/src/apis/sync.ts',
  'packages/shared/src/request/tauri-adapter.ts',
  'apps/desktop/src/hooks/use-sidebar-sync.ts',  # NEW FILE
  'apps/desktop/src/hooks/use-collections.ts',    # Add @deprecated, keep mutations
  'apps/desktop/src/components/features/FavoritesList.tsx',
  'docs/hooks-selection-guide.md',                # NEW FILE
  'docs/architecture/sync-api-decision.md',      # NEW FILE (ADR)
  'biome.json'                                  # ADD lint rules (项目使用 Biome)
]
code_patterns: ['Repository Pattern', 'API Response Wrapper', 'Tauri Commands', 'React Query Hooks']
test_patterns: ['Rust unit tests with #[test]', 'SQLite in-memory databases', 'React Testing Library']
---

# Tech-Spec: 文章获取 API 优化

**Created:** 2025-02-03

## Overview

### Problem Statement

**当前实现分析（通过 Reverse Engineering 发现）：**

前端当前使用 `useCollections` hook 进行双轮询：
- `GET /api/collections` - 获取 `CollectionListItem[]`（文章列表）
- `GET /api/collections/stats` - 获取 `CollectionStats`（统计数据）

**关键发现：概念混淆**

现有代码显示：
1. `useCollections` 返回的 `collections` 是 `CollectionListItem[]` 类型，代表**文章/收藏内容**
2. `CollectionListItem` 包含：`id`, `url`, `title`, `domain`, `starred`, `favoriteId`
3. 这些是**实际的内容项**，不是文件夹

但新规范中：
1. `FavoriteWithCount[]` 代表**收藏夹/文件夹**，包含：`id`, `name`, `icon`, `count`
2. 这些是**容器**，不是内容

**实际需求澄清：**

通过分析现有 6 个使用 `useCollections` 的组件，发现存在**两种不同的使用模式**：

**模式 A：获取收藏夹列表（侧边栏）**
- 组件：`FavoritesList.tsx`
- 需求：获取所有收藏夹名称、图标、每个收藏夹的文章数量
- 当前实现：使用 `/api/favorites` + 手动计数

**模式 B：获取文章列表（主内容区）**
- 组件：`ArticlesPage.tsx`, `__root.tsx` (部分)
- 需求：获取实际的文章列表（含 URL、标题、域名等）
- 当前实现：使用 `/api/collections`（支持过滤：`favorite_id`, `tag_id`, `status`）

**实际问题：**
1. 侧边栏需要收藏夹列表 + 统计数据（当前需要 `/api/favorites` + `/api/collections/stats`）
2. 主内容区需要文章列表（当前使用 `/api/collections`）
3. **双轮询**主要影响侧边栏场景，而不是主内容区

### Solution

**优化目标明确：为侧边栏提供统一的同步接口**

创建统一的 `/api/sync` 接口，**专门为侧边栏优化**：
- 收藏列表（含每个收藏的文章数量）
- 全局统计数据（总数、本周新增、已归档、已删除、星标数）
- 时间戳（用于检测数据变化）

**主内容区保持现有实现：**
- 继续使用 `/api/collections` 获取文章列表（支持过滤、分页）
- `useCollections` hook **不替换**，仅标记为 `@deprecated`（对于非侧边栏场景）
- 新增 `useSidebarSync` hook（替代 `useCollections` 用于侧边栏）

**API 职责分离：**
- `/api/sync` - 侧边栏数据（收藏夹 + 统计）
- `/api/collections` - 主内容数据（文章列表）
- `/api/favorites/:id/collections` - 特定收藏的文章列表

前端架构：
- 侧边栏使用 `useSidebarSync` - 5秒轮询，获取收藏夹 + 统计
- 主内容区使用 `useCollections` - 按需加载，支持过滤、分页

预留 `/api/sync/stream` 路由用于未来 SSE 实现。

### Scope

**In Scope:**

1. **后端 API**
   - 新增 `GET /api/sync` 接口（使用单次 JOIN 查询优化性能）
   - 新增 `GET /api/favorites/:id/collections` 接口
   - 预留 `GET /api/sync/stream` 路由（返回 501 Not Implemented）
   - 添加数据库索引优化查询性能
   - **保留现有 `/api/collections` 和 `/api/collections/stats` 接口**

2. **类型定义**
   - `SyncResponse` - 同步响应类型
   - `FavoriteWithCount` - 带统计的收藏类型（包含 count 字段，unread 暂不实现）
   - `SyncStats` - 同步统计数据类型
   - `SidebarSyncData` - 侧边栏统一数据类型

3. **前端 Hooks**
   - 新增 `useSidebarSync` hook（用于侧边栏，5秒轮询）
   - **保留 `useCollections` hook**（用于主内容区，标记 `@deprecated`）
   - `useSidebarSync` 返回：`favorites`, `stats`, `isLoading`, `error`, `refresh`
   - **保留所有 mutation 操作**：`setFavorite`, `toggleStar`, `archive`, `restore`, `delete`, `permanentlyDelete`

4. **组件迁移**
   - 迁移 `FavoritesList.tsx` 使用 `useSidebarSync`
   - **保持其他组件使用 `useCollections`**：
     - `ArticlesPage.tsx` - 文章列表
     - `__root.tsx` - 统计数据获取
     - `ChatPage.tsx`, `TagsList.tsx` - 保持不变

5. **性能监控**
   - 添加请求响应时间日志
   - 添加数据库查询时间日志
   - 性能基准测试和验证

6. **TanStack Query 缓存兼容**
   - 新 hook 使用独立的 query key 命名空间：`['sidebar-sync']`
   - 避免与现有 `['collections']` keys 冲突
   - mutation 操作后同时刷新两个缓存

**Out of Scope:**

1. SSE/WebSocket 实时推送实现（第二阶段） - **注意**：`GET /api/sync/stream` 路由占位符在 Phase 1 实现
2. 智能轮询间隔调整（保持固定 5 秒）
3. `unread` 字段实现（需要添加 `is_read` 列，第二阶段）
4. 浏览器扩展修改
5. UI/UX 重大改动
6. **替换主内容区的 `useCollections`**（保持现有实现）

### Party Mode Review (Step 5)

**专家审查结果**：4 位专家（前端架构、后端性能、DX、数据库）对规范进行了全面审查。

**采用方法：Hybrid Approach**
- **保留**：双 hook 架构（`useSidebarSync` + `useCollections`）
- **修复**：3 个关键 bug（部分索引、条件聚合、事务包装）
- **新增**：全面开发者文档（决策树、ADR、Biome lint 规则）
- **验证**：性能基准测试 + EXPLAIN QUERY PLAN 验证

**关键优化**（必须实施）：
- ✅ 条件聚合替代 5 个 COUNT 查询（预期 5x 性能提升）
- ✅ 部分索引 `WHERE status='active'`（70% 索引大小减少）
- ✅ 事务包装确保数据一致性
- ✅ EXPLAIN QUERY PLAN 在 CI 中验证索引使用

**推迟改进**（第二阶段考虑）：
- ⏸️ 统一端点设计（`/api/collections?include=stats`）
- ⏸️ Hook 重命名（`useCollections` → `useArticles`）

详细决策记录见：Technical Decisions → 7. Party Mode 反馈整合

## Context for Development

### Codebase Patterns

#### 后端模式

- **Axum 路由**：使用 `route()` 方法定义 RESTful 端点
- **错误处理**：返回 `Result<Json<ApiResponse<T>>, (StatusCode, Json<ApiError>)>`
- **序列化**：使用 `serde`，JSON 字段使用 `camelCase` (`#[serde(rename_all = "camelCase")]`)
- **数据库访问**：通过 Repository 模式（`CollectionRepository`, `FavoriteRepository`）

#### 前端模式

- **API 客户端**：使用 `@tanstack/react-query` 的 `queryOptions` 模式
- **请求适配器**：通过 `RequestAdapter` 接口（Tauri 或 HTTP）
- **状态管理**：Zustand stores（UI 状态）+ TanStack Query（服务器状态）
- **轮询**：使用 `refetchInterval: 5000`
- **类型定义**：所有共享类型在 `@memory-prosthetic/shared`

#### 命名约定

- **Rust**: snake_case (`get_collections`, `CollectionRepository`)
- **TypeScript**: camelCase (`useSync`, `SyncResponse`)
- **API 端点**: kebab-case (`/api/favorites/:id/collections`)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/desktop/src-tauri/src/server/routes.rs` | HTTP 路由定义 |
| `apps/desktop/src-tauri/src/server/handlers.rs` | 请求处理器实现 |
| `apps/desktop/src-tauri/src/db/collections.rs` | Collection 数据访问层 |
| `apps/desktop/src-tauri/src/db/favorites.rs` | Favorite 数据访问层 |
| `apps/desktop/src-tauri/src/db/migrations/` | 数据库迁移文件（新增索引） |
| `packages/shared/src/types/collection.ts` | Collection/Favorite 类型定义 |
| `packages/shared/src/apis/collections.ts` | Collections API 客户端 |
| `packages/shared/src/apis/sync.ts` | Sync API 客户端（新增） |
| `apps/desktop/src/hooks/use-collections.ts` | 当前 useCollections hook（保留） |
| `apps/desktop/src/hooks/use-sidebar-sync.ts` | 新的 useSidebarSync hook（新增） |
| `apps/desktop/src/components/features/FavoritesList.tsx` | 侧边栏收藏列表组件（需迁移） |
| `packages/shared/src/request/tauri-adapter.ts` | Tauri 请求适配器 |

### Reverse Engineering Findings

**重要发现：通过分析现有代码发现的隐藏需求和架构约束**

#### 发现 1：概念混淆 - Collection vs Favorite

**当前实现**：
- `useCollections()` 返回 `CollectionListItem[]` - 代表**文章/收藏内容**
- `CollectionListItem` 包含：`id`, `url`, `title`, `domain`, `starred`, `favoriteId`, `type`, `createdAt`
- 这些是**实际的内容项**，不是文件夹

**问题**：
- 原规范描述优化 `/api/collections`，但实际优化目标应该是 `/api/favorites`
- 存在两种使用模式：
  1. **侧边栏模式**：需要收藏夹列表 + 统计数据
  2. **主内容区模式**：需要文章列表（支持过滤、分页）

**解决方案**：
- `/api/sync` - 专门为侧边栏优化（收藏夹 + 统计）
- `/api/collections` - 保持不变（主内容区使用）

#### 发现 2：隐藏的 Mutation 依赖

**当前 `useCollections` 暴露 7 个 mutation 函数**：
```typescript
setFavorite: (id: number, favoriteId: number | null) => Promise<void>
toggleStar: (id: number) => Promise<void>
archive: (id: number) => Promise<void>
restore: (id: number) => Promise<void>
delete: (id: number) => Promise<void>
permanentlyDelete: (id: number) => Promise<void>
```

**所有 mutation 都调用 `refresh()`**：
```typescript
const refresh = async () => {
  await queryClient.invalidateQueries({ queryKey: collections.keys.all })
  await Promise.all([
    queryClient.refetchQueries({ queryKey: collections.keys.lists() }),
    queryClient.refetchQueries({ queryKey: collections.keys.stats() }),
  ])
}
```

**影响**：
- 新的 `useSidebarSync` 不能简单替换 `useCollections`
- 必须保留所有 mutation 操作
- mutation 后需要刷新**两个**缓存（`collections` 和 `sidebar-sync`）

**解决方案**：
- `useCollections` 保持不变，仅添加 `@deprecated` JSDoc
- 对于主内容区继续使用 `useCollections`
- 对于侧边栏使用新的 `useSidebarSync`

#### 发现 3：组件使用模式分析

**6 个组件使用 `useCollections`**：

| 组件 | 用途 | 迁移策略 |
| ---- | ---- | -------- |
| `FavoritesList.tsx` | 侧边栏收藏列表 | ✅ 迁移到 `useSidebarSync` |
| `ArticlesPage.tsx` | 文章列表 | ❌ 保持 `useCollections` |
| `__root.tsx` | 全局统计 | ✅ 使用 `useSidebarSync().stats` |
| `ChatPage.tsx` | 聊天页面 | ❓ 需手动检查 |
| `TagsList.tsx` | 标签列表 | ❓ 需手动检查 |

**迁移风险**：
- 低风险：仅 1-2 个组件需要迁移
- 其他组件保持现有实现不变

#### 发现 4：TanStack Query 缓存冲突风险

**当前缓存 key 结构**：
```typescript
KEYS = {
  all: ['collections'],
  lists: () => ['collections', 'list'],
  list: (params) => ['collections', 'list', params],
  stats: () => ['collections', 'stats'],
}
```

**新缓存 key 结构（需避免冲突）**：
```typescript
SYNC_KEYS = {
  all: ['sidebar-sync'],  // 不同的命名空间
  data: () => ['sidebar-sync', 'data'],
}
```

#### 发现 5：ApiResponse 泛型约束

**当前 Rust 结构**：
```rust
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: T,
}
```

**新需求**：添加 `_performance` 字段（仅开发环境）

**问题**：无法直接向泛型结构添加字段

**解决方案**：
```rust
// 创建开发环境专用的响应类型
#[cfg(debug_assertions)]
#[derive(Serialize)]
pub struct SyncApiResponseWithPerformance {
    pub success: bool,
    pub data: SyncResponse,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub _performance: Option<PerformanceMetadata>,
}

// 生产环境使用标准类型
#[cfg(not(debug_assertions))]
pub type SyncApiResponseWithPerformance = ApiResponse<SyncResponse>;
```

#### 发现 6：过滤参数丢失

**当前 `/api/collections` 支持**：
- `limit`, `offset` - 分页
- `favorite_id` - 按收藏夹过滤
- `tag_id`, `tag_ids` - 按标签过滤
- `status` - 按状态过滤（active/archived/deleted）
- `uncategorized` - 未分类内容

**新 `/api/sync` 不支持过滤**，因为：
- 侧边栏需要显示**所有**收藏夹
- 过滤由主内容区的 `/api/collections` 处理

**合理的设计分离**。

### Technical Decisions

1. **数据结构设计**
   - `SyncResponse` 包含 `favorites`、`stats`、`timestamp` 和可选的 `capabilities`
   - 每个收藏包含 `count` 字段（文章总数）
   - **暂不实现 `unread` 字段**：需要在 `collections` 表添加 `is_read` 列，推迟到第二阶段
   - **`capabilities` 字段策略**：
     - 开发环境：返回 `ServerCapabilities` 对象，`streamingSupported: false`
     - 生产环境：返回 `ServerCapabilities` 对象，`streamingSupported: false`（同样返回对象，不返回 `null`）
     - 理由：避免客户端需要处理 `null` vs `{ streamingSupported: false }` 两种情况，保持类型一致性
   - **`_performance` 字段策略**：
     - 开发环境：在 `ApiResponse` 结构的顶层附加 `_performance` 字段（与 `success`, `data` 同级）
     - 生产环境：不包含此字段
     - 示例：
       ```json
       {
         "success": true,
         "data": { "favorites": [...], "stats": {...}, "timestamp": "..." },
         "_performance": { "queryTimeMs": 23, "totalTimeMs": 45 }
       }
       ```
   - 添加 `timestamp` 字段用于未来增量更新

2. **数据库查询优化**
   - 使用单次 `LEFT JOIN` 查询避免 N+1 问题
   - 添加复合索引加速查询：
     ```sql
     CREATE INDEX idx_collections_favorite_id ON collections(favorite_id);
     CREATE INDEX idx_collections_status ON collections(status);
     ```
   - 使用 `GROUP BY` 聚合统计，避免多次查询

3. **性能监控策略**
   - 开发环境：在 `/api/sync` 响应中包含 `_performance` 字段（查询时间、总时间）
   - 生产环境：记录 p50, p95, p99 响应时间日志
   - 使用 `tracing::info!` 记录慢查询（>100ms）

4. **弃用策略**
   - `useCollections` **保持不变**，仅添加 `@deprecated` JSDoc 注释说明用途
   - 新增独立的 `useSidebarSync` hook 用于侧边栏场景
   - 两个 hooks 并存，各自服务不同场景：
     - `useCollections` - 主内容区（文章列表、mutation 操作）
     - `useSidebarSync` - 侧边栏（收藏夹列表、统计数据）
   - **不重定向**：避免类型不兼容问题

5. **SSE 预留**
   - 添加 `/api/sync/stream` 路由但返回 501
   - 响应头包含 `Retry-After: 3600` 指示重试时间
   - 未来实现时不破坏现有 `/api/sync` 接口

6. **向后兼容**
   - 保留现有的 `/api/collections` 和 `/api/favorites` 接口
   - `/api/sync` 仅作为侧边栏优化的新接口
   - 主内容区继续使用 `/api/collections`

7. **Party Mode 反馈整合**
   - **采纳的优化**（必须实施）：
     - ✅ 使用**条件聚合**代替 5 个独立 COUNT 查询（5x 性能提升）
     - ✅ 使用**部分索引**代替全量索引（70% 索引大小，10% 写入性能提升）
     - ✅ **事务包装** `/api/sync` 查询确保数据一致性
     - ✅ **EXPLAIN QUERY PLAN 验证**在 CI 中防止索引退化
     - ✅ **全面开发者文档**（决策树、ADR、代码示例）
     - ✅ **Biome lint 规则**防止 hook 误用
   - **推迟的改进**（第二阶段考虑）：
     - ⏸️ 统一端点设计（`/api/collections?include=stats`）- 需要更大架构讨论
     - ⏸️ 重命名 hooks（`useCollections` → `useArticles`）- 需要大规模重构
     - ⏸️ 单 hook 条件查询模式 - 增加内部复杂度
   - **接受的风险**：
     - ⚠️ 双缓存命名空间（`collections` 和 `sidebar-sync`）
     - ⚠️ Mutation 需要使 2 个缓存失效（vs 原来 1 个）
     - ⚠️ 新开发者学习曲线（通过文档缓解）
   - **成功验证标准**：
     - ✅ EXPLAIN QUERY PLAN 确认索引使用
     - ✅ 性能测试显示 ≥ 5x 统计查询提升
     - ✅ 并发测试通过（无数据不一致）
     - ✅ 新开发者 5 分钟内选择正确 hook

## Implementation Plan

### Sprint 计划和里程碑

**总体时间线**：13 天（3 个 Sprint + 2 天缓冲）

| Sprint | 时长 | 目标 | 风险 | 关键任务 |
|--------|------|------|------|----------|
| **Sprint 1** | 5 天 | MVP 可用 | ⚠️ 中 | 1, 2, 3, 4, 5, 5.5, 5.6, 6, 7, 8, 13a |
| **Sprint 2** | 3 天 | 完整迁移 + 文档 | ⚠️ 低 | 9, 9.5, 9.6, 10, 11 |
| **Sprint 3** | 3 天 | 生产就绪 | ✅ 低 | 12, 13, 13.5, 13.6, 14 |
| **缓冲** | 2 天 | - | - | 处理意外问题 |

**关键里程碑**：
- **Day 5**：`/api/sync` 可用，查询性能 ≤ 50ms (p95) ✅
- **Day 9**：完整迁移完成，侧边栏使用 `useSidebarSync`，主内容区保持 `useCollections` ✅
- **Day 13**：生产就绪，性能达标，文档完整 🚀

**风险管理**：
- **Sprint 1 关键风险**：数据库查询性能
  - **缓解**：优先完成任务 5.5（索引），每日检查性能
  - **验证**：查询时间 ≤ 50ms (p95)，否则优化
- **降级策略**：保留旧接口，新接口失败可回退

### Tasks

#### Phase 1: 类型定义和后端接口

1. **定义 SyncResponse 类型** (`packages/shared/src/types/collection.ts`)
   - 添加 `SyncResponse` 接口（包含 `capabilities` 字段）
   - 添加 `FavoriteWithCount` 接口
   - 添加 `SyncStats` 接口
   - 添加 `ServerCapabilities` 接口（用于能力发现）
   - 添加 `PerformanceMetadata` 接口（性能监控数据）
   - 导出所有类型

   ```typescript
   export type ServerCapabilities = {
     streamingSupported: boolean
     streamingUrl?: string | null
   }

   export type PerformanceMetadata = {
     queryTimeMs: number
     totalTimeMs: number
   }

   export type SyncResponse = {
     favorites: FavoriteWithCount[]
     stats: SyncStats
     timestamp: string
     capabilities?: ServerCapabilities  // 可选，仅开发环境
   }

   export type SyncApiResponse = ApiResponse<SyncResponse> & {
     _performance?: PerformanceMetadata  // 开发环境附加性能数据
   }
   ```

   **Rust 后端类型定义**（`apps/desktop/src-tauri/src/server/models.rs` 或新增文件）：

   ```rust
   use serde::{Deserialize, Serialize};

   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct FavoriteWithCount {
       pub id: i64,
       pub name: String,
       pub icon: Option<String>,
       pub count: i64,  // 文章总数
       pub created_at: String,  // ISO 8601 格式
       pub updated_at: String,  // ISO 8601 格式
   }

   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct SyncStats {
       pub total: i64,
       pub this_week: i64,
       pub archived: i64,
       pub starred: i64,
       pub last_collected_at: Option<String>,  // ISO 8601 格式
   }

   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct ServerCapabilities {
       pub streaming_supported: bool,
       #[serde(skip_serializing_if = "Option::is_none")]
       pub streaming_url: Option<String>,
   }

   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct SyncResponse {
       pub favorites: Vec<FavoriteWithCount>,
       pub stats: SyncStats,
       pub timestamp: String,  // ISO 8601 格式
       #[serde(skip_serializing_if = "Option::is_none")]
       pub capabilities: Option<ServerCapabilities>,
   }

   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct PerformanceMetadata {
       pub query_time_ms: u64,
       pub total_time_ms: u64,
   }
   ```

2. **实现 /api/sync handler 和数据库查询优化** (`apps/desktop/src-tauri/src/server/handlers.rs` + `collections.rs`)
   - **Repository 结构**：在现有的 `CollectionRepository` (位于 `collections.rs`) 中新增两个方法
   - **注意**：实际代码中使用 `CollectionRepository<'a>` 生命周期参数，方法添加到该 impl 块中
   - 在 `CollectionRepository` 中新增 `get_favorites_with_counts()` 方法
   - 使用单次 `LEFT JOIN` + `GROUP BY` 查询获取所有收藏及其文章计数
   - 在 `CollectionRepository` 中新增 `get_sync_stats()` 方法
   - 添加性能日志（查询时间、总时间）
   - 返回 `SyncResponse`（开发环境包含 `_performance` 和 `capabilities`）

   ```rust
   // apps/desktop/src-tauri/src/db/collections.rs
   use crate::db::connection::Database;
   // 注意：类型定义添加到 handlers.rs 而非单独的 models.rs
   use crate::server::handlers::{FavoriteWithCount, SyncStats, SyncResponse};
   use std::time::Instant;

   impl CollectionRepository {
       pub fn get_favorites_with_counts(&self) -> Result<Vec<FavoriteWithCount>, DbError> {
           self.db.with_connection(|conn| {
               let sql = r#"
                   SELECT f.id, f.name, f.icon, f.created_at, f.updated_at,
                          COUNT(c.id) as count
                   FROM favorites f
                   LEFT JOIN collections c
                       ON c.favorite_id = f.id AND c.status = 'active'
                   GROUP BY f.id
                   ORDER BY CASE WHEN f.name = '未分类' THEN 0 ELSE 1 END,
                            f.created_at ASC
               "#;

               let mut stmt = conn.prepare(sql)?;
               let favorites_iter = stmt.query_map([], |row| {
                   Ok(FavoriteWithCount {
                       id: row.get(0)?,
                       name: row.get(1)?,
                       icon: row.get(2)?,
                       // SQLite 返回 snake_case，serde #[serde(rename_all = "camelCase")]
                       // 自动转换为 createdAt/updatedAt
                       created_at: row.get(3)?,
                       updated_at: row.get(4)?,
                       count: row.get::<_, i64>(5)?,
                   })
               })?;

               favorites_iter
                   .collect::<Result<Vec<_>, _>>()
                   .map_err(Into::into)
           })
       }

       pub fn get_sync_stats(&self) -> Result<SyncStats, DbError> {
           self.db.with_connection(|conn| {
               // **优化**: 使用条件聚合（Conditional Aggregation）代替 5 个独立查询
               // 性能提升：~5x（1 次表扫描 vs 5 次）
               let sql = r#"
                   SELECT
                       COUNT(*) FILTER (WHERE status = 'active') as total,
                       COUNT(*) FILTER (WHERE status = 'active' AND created_at >= datetime('now', '-7 days')) as this_week,
                       COUNT(*) FILTER (WHERE status = 'archived') as archived,
                       COUNT(*) FILTER (WHERE status = 'deleted') as deleted,
                       COUNT(*) FILTER (WHERE starred = 1) as starred,
                       MAX(created_at) FILTER (WHERE status != 'deleted') as last_collected_at
                   FROM collections
               "#;

               let mut stmt = conn.prepare(sql)?;
               let stats = stmt.query_row([], |row| {
                   Ok(SyncStats {
                       total: row.get(0)?,
                       this_week: row.get(1)?,
                       archived: row.get(2)?,
                       starred: row.get::<_, i64>(4)?, // 仅 starred，不包含 deleted
                       last_collected_at: row.get(5)?,
                   })
               })?;

               Ok(stats)
           })
       }
   }

   // apps/desktop/src-tauri/src/server/handlers.rs
   use axum::Json;
   use std::time::Instant;

   pub async fn sync_handler() -> Result<Json<SyncApiResponse>, AppError> {
       let start_time = Instant::now();

       let repo = CollectionRepository::new();

       // **关键修复**: 使用单一查询的事务确保数据一致性
       // 在一个数据库事务中获取 favorites 和 stats
       let (favorites, stats, query_duration) = repo.db.with_connection(|conn| {
           let tx = conn.unchecked_transaction()?;

           let query_start = Instant::now();
           let favs = repo.get_favorites_with_counts(&tx)?;
           let sts = repo.get_sync_stats(&tx)?;
           let query_duration = query_start.elapsed();

           tx.commit()?;
           Ok((favs, sts, query_duration))
       })?;

       let timestamp = chrono::Utc::now().to_rfc3339();

       // 开发环境返回 capabilities，生产环境不返回
       #[cfg(debug_assertions)]
       let capabilities = Some(ServerCapabilities {
           streaming_supported: false,
           streaming_url: Some("/api/sync/stream".to_string()),
       });
       #[cfg(not(debug_assertions))]
       let capabilities = None;

       let response = SyncResponse {
           favorites,
           stats,
           timestamp,
           capabilities,
       };

       let total_duration = start_time.elapsed();

       // 构建响应
       // 开发环境返回带 _performance 的响应，生产环境返回标准响应
       #[cfg(debug_assertions)]
       {
           let api_response = SyncApiResponse {
               success: true,
               data: response,
               _performance: Some(PerformanceMetadata {
                   query_time_ms: query_duration.as_millis() as u64,
                   total_time_ms: total_duration.as_millis() as u64,
               }),
           };
           Ok(Json(api_response))
       }

       #[cfg(not(debug_assertions))]
       {
           let api_response = SyncApiResponse {
               success: true,
               data: response,
               _performance: None,
           };
           Ok(Json(api_response))
       }
   }

   // 定义专用的同步响应类型（用于开发环境的 _performance 字段）
   #[derive(Debug, Clone, Serialize)]
   #[serde(rename_all = "camelCase")]
   pub struct SyncApiResponse {
       pub success: bool,
       pub data: SyncResponse,
       #[serde(skip_serializing_if = "Option::is_none")]
       pub _performance: Option<PerformanceMetadata>,
   }
           api_response._performance = Some(PerformanceMetadata {
               query_time_ms: query_duration.as_millis() as u64,
               total_time_ms: total_duration.as_millis() as u64,
           });
       }
       #[cfg(not(debug_assertions))]
       let api_response = ApiResponse::success(response);

       Ok(Json(api_response))
   }
   ```

   **边缘情况处理**：
   - 空收藏列表：`get_favorites_with_counts()` 返回空数组 `[]`
   - 没有文章的收藏：`LEFT JOIN` 保证 `COUNT(c.id)` 返回 `0`，收藏仍会包含在结果中
   - 数据库连接失败：返回 `DbError::ConnectionError`，handler 转换为 HTTP 500
   - 时间戳格式：使用 ISO 8601 (RFC 3339) 格式，确保前后端一致性

3. **实现 /api/favorites/:id/collections handler** (`apps/desktop/src-tauri/src/server/handlers.rs`)
   - 创建 `get_favorite_collections_handler` 函数
   - 按 `favorite_id` 过滤文章
   - 支持分页（`limit`, `offset`）
   - 返回 `CollectionListItem[]`

4. **添加路由** (`apps/desktop/src-tauri/src/server/routes.rs`)
   - 添加 `GET /api/sync` 路由
   - 添加 `GET /api/favorites/:id/collections` 路由
   - 添加 `GET /api/sync/stream` 路由（返回 501）

5. **添加 Tauri Command** (`apps/desktop/src-tauri/src/lib.rs`)
   - 添加 `get_sync` command
   - 添加 `get_favorite_collections` command

5.5. **创建数据库索引** (`apps/desktop/src-tauri/src/db/connection.rs`)
    - **Party Mode 反馈优化**：使用**部分索引（Partial Index）**代替全量索引
    - 在 `migrate()` 方法中的索引创建部分添加（约 line 304 附近）：
      ```sql
      -- 部分索引：仅索引活跃状态的收藏关系
      -- 优势：索引大小减少 ~70%，写入性能提升 ~10%
      -- 替换现有的全量 idx_collections_favorite_id 索引
      CREATE INDEX IF NOT EXISTS idx_collections_active_favorite
          ON collections(favorite_id)
          WHERE status = 'active';

      -- 覆盖索引：避免表查找（可选优化，提供额外 10-20% 性能）
      CREATE INDEX IF NOT EXISTS idx_collections_active_covering
          ON collections(favorite_id, id)
          WHERE status = 'active';
      ```
    - **注意**：
      1. 现有代码已有 `idx_collections_favorite_id` 全量索引（line 304），应被替换为部分索引
      2. 不创建 `idx_collections_status`（全量索引），因为 LEFT JOIN 中的 `status` 在 JOIN 条件中
      3. 全量索引增加 10-15% 写入开销，无读取收益
    - 验证索引生效（使用 `EXPLAIN QUERY PLAN`）：
      ```bash
      # 应显示：SEARCH collections USING INDEX idx_collections_active_favorite
      EXPLAIN QUERY PLAN
      SELECT f.id, COUNT(c.id)
      FROM favorites f
      LEFT JOIN collections c ON c.favorite_id = f.id AND c.status = 'active'
      GROUP BY f.id;
      ```

5.6. **单元测试数据库查询** (`apps/desktop/src-tauri/src/db/collections.rs`)
    - 添加 `test_get_favorites_with_counts` 单元测试
    - 使用 `tempfile::tempdir()` 创建内存数据库
    - 验证 SQL 查询正确性（LEFT JOIN + GROUP BY）
    - 验证计数聚合正确性
    - 验证排序逻辑（"未分类" 优先）

#### Phase 2: 前端 API 客户端

6. **创建 Sync API** (`packages/shared/src/apis/sync.ts`)
   - 创建 `createSyncApi` 函数
   - 实现 `getSync()` 方法
   - 实现 `getFavoriteCollections(id, params)` 方法
   - 添加 `queryOptions`（`sync`, `favoriteCollections`）

7. **更新 Tauri Adapter** (`packages/shared/src/request/tauri-adapter.ts`)
   - 添加 `GET /api/sync` → `get_sync` 映射
   - 添加 `GET /api/favorites/:id/collections` → `get_favorite_collections` 映射

#### Phase 3: 前端 Hooks

8. **创建 useSidebarSync Hook** (`apps/desktop/src/hooks/use-sidebar-sync.ts` 新文件)
    - 实现 `useSidebarSync()` hook
    - 返回 `favorites`, `stats`, `isLoading`, `error`, `refresh`
    - 保持 5 秒轮询间隔
    - 使用独立的 query key 命名空间：`['sidebar-sync']`
    - **不包含 mutation 操作**（mutations 由 `useCollections` 提供）
    - 示例：
      ```typescript
      export function useSidebarSync() {
        const syncQuery = useQuery({
          queryKey: ['sidebar-sync'],
          queryFn: () => syncApi.getSync(),
          refetchInterval: 5000, // 5秒轮询
        })
        return {
          favorites: syncQuery.data?.favorites ?? [],
          stats: syncQuery.data?.stats,
          isLoading: syncQuery.isLoading,
          error: syncQuery.error,
          refresh: syncQuery.refetch,
        }
      }
      ```

9. **更新 useCollections 文档** (`apps/desktop/src/hooks/use-collections.ts`)
    - 添加 `@deprecated` JSDoc 注释，说明用途和推荐替代方案
    - **保持现有实现不变**（所有 7 个 mutations 和查询逻辑）
    - 添加注释说明：
      - 主内容区应继续使用 `useCollections`（文章列表、mutations）
      - 侧边栏应使用 `useSidebarSync`（收藏夹列表、统计数据）
    - **不重定向到 `useSidebarSync`**（类型不兼容）
    - 示例 JSDoc：
      ```typescript
      /**
       * Collections Hook - 主内容区数据获取
       *
       * @deprecated 对于侧边栏场景，请使用 {@link useSidebarSync}
       *
       * 用途：
       * - 主内容区：获取文章列表（支持过滤、分页）
       * - Mutation 操作：setFavorite, toggleStar, archive, restore, delete, permanentlyDelete
       *
       * 侧边栏场景请使用 useSidebarSync：
       * - 获取收藏夹列表 + 文章数量
       * - 获取统计数据
       */
      ```

9.5. **创建开发者文档** (`docs/` 新增或更新现有文档)
    - **Party Mode 反馈**：创建全面的文档系统防止开发者困惑
    - 创建 `docs/hooks-selection-guide.md`：
      ```markdown
      # Hook 选择指南

      ## 快速决策树

      你需要什么？
      ├─ 显示侧边栏收藏列表？
      │  └─ → useSidebarSync()
      ├─ 显示主内容区文章列表？
      │  └─ → useCollections(params)
      ├─ 执行 mutation 操作（归档、删除、星标）？
      │  └─ → useCollections() (仅 mutations)
      └─ 显示全局统计数据？
         └─ → useSidebarSync().stats
      ```

      ## 概念说明

      - **Collection（收藏内容）**：单个文章/网页，包含 URL、标题、内容
      - **Favorite（收藏夹）**：文件夹，包含多个 Collection
      - **useCollections**：管理 Collection 列表 + mutations
      - **useSidebarSync**：获取 Favorite 列表 + 统计数据
      ```
    - 创建 `docs/architecture/sync-api-decision.md` (ADR)：
      ```markdown
      # ADR: 为什么使用两个 Hooks？

      ## 背景
      原有单个 `useCollections` hook 同时服务于侧边栏和主内容区，导致：
      - 侧边栏需要 `Favorite[]` + stats，但只能从 `CollectionListItem[]` 推导
      - 概念混淆：`useCollections` 名字暗示返回收藏夹，实际返回文章

      ## 决策
      引入 `useSidebarSync` 专门服务侧边栏，`useCollections` 服务主内容区。

      ## 替代方案
      - 单 hook + 条件查询：被拒绝（增加 hook 内部复杂度）
      - 完全重命名：被推迟（需要大规模重构）

      ## 后果
      - 新开发者需要学习两个 hook（通过文档缓解）
      - 必须维护两套缓存命名空间（可接受的成本）
      ```
    - 更新 `README.md` 添加快速入门指南
    - 创建代码示例：`examples/` 目录展示正确用法

9.6. **添加 Biome Lint 规则** (`biome.json`)
    - **项目使用 Biome 而非 ESLint**
    - **问题**: 直接使用 `paths` 会**全局禁止**导入 `useCollections`，但主内容区需要使用它
    - **解决方案 1**: 使用 Biome 的 overrides 配置，仅在侧边栏目录应用规则：
      ```json
      {
        "linter": {
          "rules": {
            "style": {
              "noRestrictedImports": {
                "level": "error",
                "options": {
                  "paths": {
                    "@/hooks/use-collections": "侧边栏组件请使用 useSidebarSync 代替"
                  }
                }
              }
            }
          }
        },
        "overrides": [
          {
            "include": ["apps/desktop/src/components/features/FavoritesList.tsx"],
            "linter": {
              "rules": {
                "style": {
                  "noRestrictedImports": "error"
                }
              }
            }
          }
        ]
      }
      ```
    - **解决方案 2** (推荐): 不使用 lint 规则，依赖：
      - JSDoc `@deprecated` 标记
      - Code review 流程
      - 开发者文档中的决策树

#### Phase 4: 组件迁移

10. **迁移 FavoritesList 组件** (`apps/desktop/src/components/features/FavoritesList.tsx`)
    - 更新导入：`import { useSidebarSync } from '@/hooks/use-sidebar-sync'`
    - 更新 hook 调用：`const { favorites, stats } = useSidebarSync()`
    - 更新数据访问：
      - `collections` → `favorites`
      - `collection.id` → `favorite.id`
      - `collection.name` → `favorite.name`
      - `collection.icon` → `favorite.icon`
      - 新增访问：`favorite.count`（每个收藏夹的文章数量）
    - **保持 mutation 操作**继续使用 `useCollections`：
      ```typescript
      const collections = useCollections()  // 仅用于 mutations
      const sidebar = useSidebarSync()       // 用于数据展示
      ```
    - 测试功能完整性

11. **更新 __root.tsx 统计数据获取** (`apps/desktop/src/routes/__root.tsx`)
    - 当前：`const { collections, stats } = useCollections()`
    - 更新为：`const { stats } = useSidebarSync()`
    - 移除对 `collections` 的使用（如果仅用于 stats）
    - 如果需要 mutations，从 `useCollections` 获取但解构时忽略 queries：
      ```typescript
      const { setFavorite, toggleStar, ...mutations } = useCollections()
      const { stats } = useSidebarSync()
      ```

12. **其他组件保持不变**
    - `ArticlesPage.tsx` - 继续使用 `useCollections`（主内容区）
    - `ChatPage.tsx` - 需手动检查，可能保持 `useCollections`
    - `TagsList.tsx` - 需手动检查，可能保持 `useCollections`

#### Phase 5: 测试和验证

**执行顺序说明**：Task 13a（基线测量）必须在 Task 13（优化验证）**之前**执行。

13. **功能测试**
    - 验证同步接口返回正确数据
    - 验证收藏列表显示文章数量
    - 验证选择收藏后加载文章列表
    - 验证轮询正常工作
    - 验证 `/api/sync/stream` 返回 501 和 `Retry-After` 头

13a. **测量当前实现性能基线**（**必须先执行**，在所有优化之前）
    - 测量当前双轮询机制的性能数据：
      - 单次 `GET /api/collections` 响应时间（ms）
      - 单次 `GET /api/collections/stats` 响应时间（ms）
      - 双请求总响应时间（ms）
      - 双请求响应体总大小（bytes）
      - JSON 解析时间（ms）
      - 完整轮询周期时间（ms）
    - 使用浏览器 DevTools Performance 面板记录数据
    - 记录至少 20 个样本，计算 p50, p95, p99
    - **输出**：性能基线报告，用于 Task 13 对比验证

13. **性能基准测试和验证**
    - **Party Mode 反馈**：必须验证假设，而非盲目优化
    - **步骤 1：EXPLAIN QUERY PLAN 验证**
      ```bash
      # 验证 LEFT JOIN 使用部分索引
      sqlite3 data.db "EXPLAIN QUERY PLAN
      SELECT f.id, COUNT(c.id)
      FROM favorites f
      LEFT JOIN collections c ON c.favorite_id = f.id AND c.status = 'active'
      GROUP BY f.id;"

      # 应显示：
      # SEARCH collections USING INDEX idx_collections_active_favorite

      # 验证条件聚合只扫描一次表
      sqlite3 data.db "EXPLAIN QUERY PLAN
      SELECT
          COUNT(*) FILTER (WHERE status = 'active') as total,
          COUNT(*) FILTER (WHERE status = 'archived') as archived
      FROM collections;"

      # 应显示：
      # SCAN collections (仅一次，不是 5 次)
      ```
    - **健壮性验证**：使用 `grep` 而不是精确匹配，因为不同 SQLite 版本输出格式略有不同：
      ```bash
      # 更健壮的验证（检查索引名称即可）
      EXPLAIN QUERY PLAN SELECT ... | grep "idx_collections_active"
      # 应该包含索引名称（无论具体格式如何）
      ```
    - **步骤 2：性能基准对比**
      - 测量 `/api/sync` 响应体大小（bytes）
      - 测量 JSON 解析时间（ms）
      - 测量完整轮询周期时间（ms）
      - 对比新旧实现的性能数据
    - **步骤 3：数据库查询性能**
      - 测量条件聚合查询时间（应 ≤ 10ms，10,000 条记录）
      - 测量 LEFT JOIN 查询时间（应 ≤ 20ms）
      - 使用 `sqlite3 data.db ".timer on"` 验证
    - **步骤 4：响应时间验证**
      - 测量 p50, p95, p99 响应时间
      - 使用 `wrk` 或 `autocannon` 进行负载测试：
        ```bash
        wrk -t4 -c100 -d30s http://localhost:21890/api/sync
        ```
    - **性能目标**：
      - 总响应时间 ≤ 原来的 90%
      - 数据库查询时间 ≤ 50ms（p95）
      - 条件聚合查询 ≤ 单个 COUNT 查询的 20%（5x 提升）
      - 部分索引写入开销 ≤ 全量索引的 90%
    - **失败标准**（如果任一条件满足，需重新设计）：
      - EXPLAIN QUERY PLAN 显示 `SCAN collections`（应该使用索引）
      - 条件聚合执行 5 次 `SCAN`（应该只扫描 1 次）
      - p95 响应时间 > 原来的 100%（优化无效）
      - 写入性能下降 > 15%（索引开销过大）

13.5. **添加性能监控**
    - 在 `sync_handler` 中添加查询时间日志
    - 记录响应时间百分位（p50, p95, p99）
    - 集成到现有 `tracing` 日志系统
    - 开发环境返回 `_performance` 字段
    - 使用 `tracing::info!` 记录慢查询（>50ms，比原来 >100ms 更严格）

13.6. **数据一致性验证测试**
    - **Party Mode 反馈**：验证事务正确性
    - **注意**：并发测试取决于项目的测试框架
    - Rust 后端测试（使用 tokio::test）：
      ```rust
      #[tokio::test]
      async fn test_sync_maintains_consistency_during_concurrent_writes() {
          // 启动两个并发任务
          let sync_task = tokio::spawn(async {
              // 调用 /api/sync
              reqwest::get("http://localhost:21890/api/sync").await.unwrap()
          });

          let collect_task = tokio::spawn(async {
              // 调用 /api/collect 创建新收藏
              reqwest::post("http://localhost:21890/api/collect")
                  .json(&json!({"url": "...", "title": "...", "content": "..."}))
                  .send().await.unwrap()
          });

          let (sync_resp, _) = tokio::join!(sync_task, collect_task);

          // 验证：favorites[].count === stats.total
          let data: SyncResponse = sync_resp.json().await.unwrap();
          let total_favorites_count: i64 = data.favorites.iter().map(|f| f.count).sum();
          assert_eq!(total_favorites_count, data.stats.total);
      }
      ```
    - **或者**手动测试：使用 `wrk` 或 Apache Bench 并发请求
      - **目标**：验证事务确实防止了数据不一致

14. **代码审查和清理**
    - 移除未使用的代码
    - 更新文档

### Acceptance Criteria

#### AC1: /api/sync 接口返回正确数据

**Given** 后端服务运行且数据库中有收藏和文章数据
**When** 调用 `GET /api/sync`
**Then** 返回以下结构：
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": 1,
        "name": "技术文章",
        "icon": "📚",
        "count": 42,
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ],
    "stats": {
      "total": 100,
      "thisWeek": 8,
      "archived": 10,
      "starred": 15,
      "lastCollectedAt": "2025-02-03T08:30:00Z"
    },
    "timestamp": "2025-02-03T10:00:00Z",
    "capabilities": {
      "streamingSupported": false,
      "streamingUrl": "/api/sync/stream"
    }
  },
  "_performance": {
    "queryTimeMs": 23,
    "totalTimeMs": 45
  }
}
```

**注意**：
- `capabilities` 字段在开发和生产环境都返回对象（不是 `null`），结构一致
- `_performance` 字段仅在开发环境返回，生产环境不包含

#### AC2: /api/favorites/:id/collections 返回收藏的文章列表

**Given** 收藏 ID 为 1 的收藏中有 10 篇文章
**When** 调用 `GET /api/favorites/1/collections?limit=5&offset=0`
**Then** 返回前 5 篇文章，包含分页信息

#### AC3: useSidebarSync Hook 侧边栏数据获取

**Given** 组件使用 `useSidebarSync` hook（侧边栏场景）
**When** 组件挂载
**Then**：
- 每 5 秒自动轮询一次
- 返回 `favorites`（收藏夹列表）和 `stats`（统计数据）
- 提供 `refresh` 方法手动刷新
- 提供 `isLoading` 和 `error` 状态
- **不包含 mutation 操作**（mutations 由 `useCollections` 提供）

#### AC4: 侧边栏组件迁移到新 API

**Given** `FavoritesList.tsx` 使用 `useSidebarSync`
**When** 组件运行
**Then**：
- 收藏夹列表正常显示
- 每个收藏夹显示文章数量（`count` 字段）
- 请求数量减少（2个 → 1个）
- 数据一致性提高

#### AC5: SSE 路由预留

**Given** 后端服务运行
**When** 调用 `GET /api/sync/stream`
**Then** 返回 `501 Not Implemented` 状态码

#### AC6: 向后兼容性 - 主内容区保持不变

**Given** 主内容区组件（如 `ArticlesPage.tsx`）仍使用 `useCollections`
**When** 组件运行
**Then**：
- 功能正常工作（保留原有实现）
- 添加 `@deprecated` JSDoc 注释说明用途
- **不重定向**到 `useSidebarSync`（类型不兼容）

#### AC7: 错误处理 - 数据库连接失败

**Given** 后端服务运行但数据库连接失败
**When** 调用 `GET /api/sync`
**Then**：
- 返回 HTTP 500 状态码
- 响应体包含 `success: false`
- 响应体包含 `error` 字段描述错误
- 前端 `useSidebarSync` hook 的 `error` 状态被设置
- 前端显示用户友好的错误消息

#### AC8: 错误处理 - 空数据集

**Given** 后端服务运行但数据库中没有收藏数据
**When** 调用 `GET /api/sync`
**Then**：
- 返回 HTTP 200 状态码
- 响应体包含 `success: true`
- `data.favorites` 为空数组 `[]`
- `data.stats.total` 为 `0`
- 前端正确显示空状态（不是错误）

#### AC9: 边缘情况处理 - 收藏无文章

**Given** 收藏 ID 为 1 的收藏中没有文章
**When** 调用 `GET /api/sync`
**Then**：
- 该收藏包含在响应中
- `favorites[0].count` 为 `0`
- 收藏的其他字段（`id`, `name`, `icon`）正常返回

## Additional Context

### 类型命名约定说明

**重要**：Rust 后端和 TypeScript 前端的字段命名约定不同，通过 serde 自动转换：

- **Rust 结构体**：使用 snake_case (`created_at`, `updated_at`)
- **TypeScript 接口**：使用 camelCase (`createdAt`, `updatedAt`)
- **序列化转换**：通过 `#[serde(rename_all = "camelCase")]` 自动处理

**示例**：
```rust
// Rust - snake_case
pub struct FavoriteWithCount {
    pub created_at: String,  // 序列化为 "createdAt"
    pub updated_at: String,  // 序列化为 "updatedAt"
}
```

```typescript
// TypeScript - camelCase（直接匹配序列化后的 JSON）
export type FavoriteWithCount = {
  createdAt: string,  // 直接使用，无需转换
  updatedAt: string,
}
```

**AC1 中的响应示例**展示的是序列化后的 JSON 格式（camelCase），这是正确的。

### Dependencies

- **Rust crates**: axum, serde, tokio, tracing
- **前端**: @tanstack/react-query, @memory-prosthetic/shared
- **数据库**: SQLite（现有表结构）

### Testing Strategy

#### 单元测试

- 测试 `sync_handler` 返回正确数据结构
- 测试 `get_favorite_collections_handler` 正确过滤和分页

#### 集成测试

- 测试 `/api/sync` 端点返回 200 和正确数据
- 测试 `/api/favorites/:id/collections` 端点返回正确数据
- 测试 `/api/sync/stream` 返回 501

#### 前端测试

- 测试 `useSync` hook 正确获取数据
- 测试轮询正常工作
- 测试错误处理

#### E2E 测试

- 测试用户打开应用看到收藏列表
- 测试选择收藏后看到文章列表
- 测试统计数据正确显示

### Notes

1. **数据库查询优化**：
   - 使用 `LEFT JOIN` + `GROUP BY` 避免 N+1 查询
   - 添加复合索引：`idx_collections_favorite_id` 和 `idx_collections_status`
   - 使用 `EXPLAIN QUERY PLAN` 验证查询效率：
     ```bash
     # 在 SQLite 命令行中验证索引使用
     EXPLAIN QUERY PLAN
     SELECT f.id, f.name, COUNT(c.id) as count
     FROM favorites f
     LEFT JOIN collections c ON c.favorite_id = f.id
     GROUP BY f.id;
     ```
   - 预期输出包含 `SEARCH collections USING INDEX idx_collections_favorite_id`

2. **性能监控**：
   - 开发环境：在响应中包含 `_performance` 字段
   - 生产环境：使用 `tracing::info!` 记录慢查询（>100ms）
   - 监控 p50, p95, p99 响应时间
   - 使用 Chrome DevTools Performance 面板测量前端性能：
     - 记录 20+ 个样本
     - 检查 Network 面板的 Time 列
     - 检查 Performance 面板的 JSON 解析时间

3. **扩展性**：`timestamp` 字段为实现增量更新预留空间

4. **降级策略**：如果新接口失败，可回退到旧接口（在迁移期内）

5. **未实现功能（第二阶段）**：
   - `unread` 字段需要添加 `collections.is_read` 列
   - SSE 实时推送（`/api/sync/stream`）
   - 智能轮询间隔调整

6. **Rust 实现细节**：
   - 时间格式化：使用 `chrono::Utc::now().to_rfc3339()` 生成 ISO 8601 字符串
   - 错误处理：`DbError` 枚举应包含 `ConnectionError`, `QueryError`, `MigrationError` 变体
   - 连接池：使用 `r2d2::Pool` 管理数据库连接，避免每次请求新建连接
   - JSON 序列化：使用 `#[serde(skip_serializing_if = "Option::is_none")]` 跳过 `None` 字段

7. **前端实现细节**：
   - 轮询暂停：当 `document.hidden` 为 `true` 时暂停轮询，恢复时立即刷新
   - 错误重试：使用 TanStack Query 的 `retry` 配置，失败重试 3 次
   - 缓存策略：`staleTime: 0` 确保每次轮询都获取最新数据
   - 类型转换：后端返回的 `count` 是 `number`，前端无需转换

8. **部署注意事项**：
   - 数据库迁移：索引创建在应用启动时执行，无需手动 SQL 脚本
   - 环境变量：`RUST_LOG=debug` 开发环境，`RUST_LOG=info` 生产环境
   - 向后兼容：旧接口至少保留 2 个 Sprint（8 天），确保所有组件迁移完成

9. **性能目标验证方法**：
   - 使用 `wrk` 或 `autocannon` 进行负载测试：
     ```bash
     # 测试 /api/sync 端点
     wrk -t4 -c100 -d30s http://localhost:21890/api/sync
     ```
   - 对比 `/api/collections` + `/api/collections/stats` 的性能数据
   - 确保新接口 p95 响应时间 ≤ 50ms

10. **架构澄清（Reverse Engineering 发现）**：
    - **概念区分**：
      - `Collection` = 文章/收藏内容（有 URL、标题、域名等）
      - `Favorite` = 收藏夹/文件夹（有名称、图标、文章数量）
    - **职责分离**：
      - `/api/sync` → 侧边栏数据（收藏夹 + 统计）
      - `/api/collections` → 主内容数据（文章列表）
    - **Hook 分工**：
      - `useSidebarSync` - 侧边栏专用，仅读取数据
      - `useCollections` - 主内容区专用，包含所有 mutations
    - **迁移策略**：
      - 仅迁移 `FavoritesList.tsx` 和 `__root.tsx`（统计部分）
      - 其他组件保持 `useCollections` 不变
    - **避免混淆**：不要试图将收藏夹和文章列表合并为同一概念

11. **Party Mode 决策记录（Hybrid Approach）**：
    - **背景**：4 位专家（前端架构、后端性能、DX、数据库）审查规范
    - **采纳的优化**：
      - 条件聚合替代 5 个 COUNT 查询（预期 5x 性能提升）
      - 部分索引 `WHERE status='active'` 替代全量索引（70% 索引大小减少）
      - 事务包装确保数据一致性
      - 全面开发者文档（决策树、ADR、Biome lint 规则）
    - **推迟的改进**（需后续讨论）：
      - 统一端点设计（`/api/collections?include=stats`）
      - Hook 重命名（`useCollections` → `useArticles`）
      - 单 hook 条件查询模式
    - **接受的风险**：
      - 双缓存命名空间复杂度
      - Mutation 失效 2 个缓存（vs 原来 1 个）
      - 新开发者学习曲线（通过文档缓解）
    - **成功标准**：
      - EXPLAIN QUERY PLAN 确认索引使用
      - 性能测试 ≥ 5x 提升
      - 并发测试无数据不一致
      - 新开发者 5 分钟选择正确 hook
