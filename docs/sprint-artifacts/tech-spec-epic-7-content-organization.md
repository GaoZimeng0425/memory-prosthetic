# Tech-Spec: Epic 7 - 内容组织与生命周期管理

**Created:** 2025-12-25
**Status:** Ready for Development
**Epic:** Epic 7
**Stories:** 7.1 - 7.16 (16 stories)

## Overview

### Problem Statement

用户需要能够组织和管理收集的内容，包括：

1. **收藏夹管理** - 按主题组织内容到不同的收藏夹（文件夹）
2. **标签管理** - 为内容添加多个标签，支持多维度分类
3. **内容生命周期** - 归档不需要但不想删除的内容，删除不需要的内容
4. **侧边栏导航** - 提供完整的侧边栏导航体验，包括收藏夹列表、标签列表、"其他"分类

**用户价值：**

- 可以按主题快速找到相关内容
- 可以通过标签进行多维度筛选
- 可以管理内容的生命周期（归档、删除、恢复）

### Solution

实现完整的内容组织系统，包括：

1. **数据库 Schema 扩展** - 添加 `favorites`、`tags`、`collection_tags` 表，扩展 `collections` 表
2. **收藏夹功能** - CRUD 操作、添加到收藏夹、查看收藏夹内容
3. **标签功能** - CRUD 操作、为内容添加标签、按标签筛选
4. **归档和删除** - 状态管理（active/archived/deleted）、恢复功能
5. **侧边栏 UI** - 收藏夹列表、标签列表、"其他"分类（归档、最近删除）

### Scope (In/Out)

**In:**

- 数据库 Schema 迁移（Story 7.1）
- 收藏夹管理（Story 7.2-7.5）
- 标签管理（Story 7.6-7.9）
- AI 自动生成标签（Story 7.10，可选）
- 归档和删除（Story 7.11-7.15）
- 侧边栏"其他"分类（Story 7.16）

**Out:**

- 标签颜色自定义（未来功能）
- 收藏夹图标自定义（未来功能）
- 批量操作（未来功能）
- 标签自动合并（未来功能）

## Context for Development

### Codebase Patterns

**数据库迁移模式：**

```rust
// apps/desktop/src-tauri/src/db/connection.rs
pub fn migrate(&self) -> Result<(), DbError> {
    self.with_connection(|conn| {
        conn.execute_batch(
            r#"
            -- Migration SQL here
            "#,
        )?;
        Ok(())
    })
}
```

**Tauri Command 模式：**

```rust
// apps/desktop/src-tauri/src/lib.rs
#[tauri::command]
fn command_name(
    state: State<'_, Arc<AppState>>,
    params: Params,
) -> Result<CommandResult<Response>, CommandError> {
    // Implementation
    Ok(CommandResult { data: response })
}
```

**React 组件模式：**

```typescript
// apps/desktop/src/components/
import { invoke } from '@tauri-apps/api/tauri'
import { useQuery, useMutation } from '@tanstack/react-query'

// 使用 TanStack Query 进行数据获取
const { data, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: () => invoke('command_name', { params })
})
```

**Zustand Store 模式：**

```typescript
// apps/desktop/src/stores/
import { create } from 'zustand'

interface StoreState {
  // state
  // actions
}

export const useStore = create<StoreState>((set) => ({
  // implementation
}))
```

### Files to Reference

**现有数据库代码：**

- `apps/desktop/src-tauri/src/db/connection.rs` - 数据库连接和迁移
- `apps/desktop/src-tauri/src/db/collections.rs` - Collection CRUD 操作
- `apps/desktop/src-tauri/src/db/mod.rs` - 数据库模块导出

**现有 Tauri Commands：**

- `apps/desktop/src-tauri/src/lib.rs` - 所有 Tauri Commands 定义
- `apps/desktop/src/apis/index.ts` - 前端 API 调用封装

**现有 React 组件：**

- `apps/desktop/src/components/AppSidebar.tsx` - 侧边栏组件（需要扩展）
- `apps/desktop/src/components/CollectionList.tsx` - 内容列表组件（需要支持筛选）
- `apps/desktop/src/components/CollectionDetail.tsx` - 内容详情组件（需要添加操作按钮）

**现有类型定义：**

- `packages/shared/src/types/collection.ts` - Collection 类型（需要扩展）

**现有 Hooks：**

- `apps/desktop/src/hooks/use-collections.ts` - Collection 数据获取 Hook（需要扩展）

### Technical Decisions

**数据库 Schema：**

- 使用 `INTEGER PRIMARY KEY AUTOINCREMENT` 作为主键（与现有 collections 表一致）
- 使用 `TEXT` 存储时间戳（ISO 8601 格式，与现有模式一致）
- 使用外键约束确保数据完整性
- `collections.favorite_id` 可为 NULL（未分类内容）
- `collections.status` 默认值为 'active'

**状态管理：**

- 使用 Zustand 管理侧边栏展开/折叠状态
- 使用 TanStack Query 进行数据获取和缓存
- 使用 Tauri Events 进行实时更新通知

**UI 组件：**

- 使用 shadcn/ui 组件库（Dialog、DropdownMenu、Badge 等）
- 遵循现有设计系统（TailwindCSS、颜色变量）

**命名约定：**

- Rust: snake_case（函数、变量）、PascalCase（结构体）
- TypeScript: camelCase（变量、函数）、PascalCase（类型、组件）
- 文件: kebab-case（TS）、PascalCase（React 组件）

## Implementation Plan

### Tasks

#### Story 7.1: 数据库 Schema 扩展

- [ ] **Task 7.1.1**: 创建数据库迁移脚本
  - 在 `apps/desktop/src-tauri/src/db/connection.rs` 的 `migrate()` 方法中添加新表创建
  - 创建 `favorites` 表（id, name, icon, created_at, updated_at）
  - 创建 `tags` 表（id, name, color, created_at, updated_at）
  - 创建 `collection_tags` 关联表（collection_id, tag_id, created_at）
  - 为 `collections` 表添加 `favorite_id` 字段（INTEGER，可为 NULL）
  - 为 `collections` 表添加 `status` 字段（TEXT，默认 'active'）
  - 创建必要的索引和外键约束

- [ ] **Task 7.1.2**: 创建默认"未分类"收藏夹
  - 在迁移后检查是否存在"未分类"收藏夹
  - 如果不存在，创建默认收藏夹（name = '未分类'）

- [ ] **Task 7.1.3**: 更新 Rust 类型定义
  - 在 `apps/desktop/src-tauri/src/db/mod.rs` 导出新模块
  - 创建 `apps/desktop/src-tauri/src/db/favorites.rs` - Favorite 实体和 Repository
  - 创建 `apps/desktop/src-tauri/src/db/tags.rs` - Tag 实体和 Repository
  - 创建 `apps/desktop/src-tauri/src/db/collection_tags.rs` - 关联表操作

- [ ] **Task 7.1.4**: 更新 TypeScript 类型定义
  - 在 `packages/shared/src/types/collection.ts` 添加新类型
  - 添加 `Favorite` 接口
  - 添加 `Tag` 接口
  - 扩展 `Collection` 接口（添加 `favoriteId?`, `status`, `tags?`）
  - 添加 `CollectionStatus` 类型（'active' | 'archived' | 'deleted'）

#### Story 7.2: 收藏夹管理

- [ ] **Task 7.2.1**: 创建 Tauri Commands
  - `create_favorite(name: string)` - 创建收藏夹
  - `update_favorite(id: number, name: string)` - 重命名收藏夹
  - `delete_favorite(id: number)` - 删除收藏夹
  - `get_favorites()` - 获取所有收藏夹列表
  - `get_favorite(id: number)` - 获取单个收藏夹

- [ ] **Task 7.2.2**: 实现 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/favorites.rs` 实现 CRUD 操作
  - 实现 `create()`, `update()`, `delete()`, `list()`, `get_by_id()`
  - 实现 `get_collection_count(favorite_id)` - 获取收藏夹内容数量

- [ ] **Task 7.2.3**: 创建 React 组件
  - `apps/desktop/src/components/features/FavoritesList.tsx` - 收藏夹列表组件
  - `apps/desktop/src/components/features/CreateFavoriteDialog.tsx` - 创建收藏夹对话框
  - `apps/desktop/src/components/features/EditFavoriteDialog.tsx` - 编辑收藏夹对话框

- [ ] **Task 7.2.4**: 创建 Hooks 和 API
  - `apps/desktop/src/hooks/use-favorites.ts` - 收藏夹数据获取 Hook
  - 在 `apps/desktop/src/apis/index.ts` 添加收藏夹 API 调用

#### Story 7.3: 将内容添加到收藏夹

- [ ] **Task 7.3.1**: 扩展 Tauri Command
  - 修改 `update_collection()` 或创建 `set_collection_favorite()` Command
  - 支持更新 `collections.favorite_id` 字段

- [ ] **Task 7.3.2**: 创建 React 组件
  - `apps/desktop/src/components/features/FavoriteSelector.tsx` - 收藏夹选择器组件
  - 在 `apps/desktop/src/components/CollectionItem.tsx` 添加"添加到收藏夹"按钮

- [ ] **Task 7.3.3**: 实现 UI 交互
  - 点击按钮显示收藏夹选择菜单
  - 选择收藏夹后更新内容
  - 显示成功提示
  - 更新侧边栏收藏夹数量

#### Story 7.4: 查看收藏夹内容

- [ ] **Task 7.4.1**: 扩展查询功能
  - 修改 `get_collections()` Command 支持 `favorite_id` 参数
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加按收藏夹筛选的查询

- [ ] **Task 7.4.2**: 更新 React 组件
  - 修改 `apps/desktop/src/components/CollectionList.tsx` 支持 `favoriteId` 筛选
  - 修改 `apps/desktop/src/hooks/use-collections.ts` 支持筛选参数

- [ ] **Task 7.4.3**: 实现空状态
  - 在 `apps/desktop/src/components/EmptyState.tsx` 添加收藏夹空状态提示

#### Story 7.5: 侧边栏收藏夹列表

- [ ] **Task 7.5.1**: 创建 Zustand Store
  - `apps/desktop/src/stores/use-sidebar-store.ts` - 管理侧边栏展开/折叠状态

- [ ] **Task 7.5.2**: 扩展 AppSidebar 组件
  - 在 `apps/desktop/src/components/AppSidebar.tsx` 添加收藏夹区域
  - 实现折叠/展开功能
  - 显示收藏夹列表和内容数量
  - "未分类"始终显示在第一位

- [ ] **Task 7.5.3**: 实现交互
  - 点击收藏夹切换主内容区显示
  - 点击"+"按钮创建新收藏夹
  - 右键菜单：重命名、删除

#### Story 7.6: 标签管理

- [ ] **Task 7.6.1**: 创建 Tauri Commands
  - `create_tag(name: string, color?: string)` - 创建标签
  - `update_tag(id: number, name: string, color?: string)` - 更新标签
  - `delete_tag(id: number)` - 删除标签
  - `get_tags()` - 获取所有标签列表
  - `get_tag(id: number)` - 获取单个标签

- [ ] **Task 7.6.2**: 实现 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/tags.rs` 实现 CRUD 操作
  - 实现 `get_usage_count(tag_id)` - 获取标签使用数量

- [ ] **Task 7.6.3**: 创建 React 组件
  - `apps/desktop/src/components/features/TagsList.tsx` - 标签列表组件
  - `apps/desktop/src/components/features/CreateTagDialog.tsx` - 创建标签对话框
  - `apps/desktop/src/components/features/EditTagDialog.tsx` - 编辑标签对话框

- [ ] **Task 7.6.4**: 创建 Hooks 和 API
  - `apps/desktop/src/hooks/use-tags.ts` - 标签数据获取 Hook
  - 在 `apps/desktop/src/apis/index.ts` 添加标签 API 调用

#### Story 7.7: 为内容添加标签

- [ ] **Task 7.7.1**: 创建 Tauri Commands
  - `add_collection_tags(collection_id: number, tag_ids: number[])` - 添加标签
  - `remove_collection_tag(collection_id: number, tag_id: number)` - 移除标签
  - `get_collection_tags(collection_id: number)` - 获取内容的标签列表

- [ ] **Task 7.7.2**: 实现 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/collection_tags.rs` 实现关联操作
  - 实现 `add_tags()`, `remove_tag()`, `get_tags_by_collection()`

- [ ] **Task 7.7.3**: 创建 React 组件
  - `apps/desktop/src/components/features/TagSelector.tsx` - 标签选择器组件
  - `apps/desktop/src/components/features/TagBadge.tsx` - 标签徽章组件
  - 在 `apps/desktop/src/components/CollectionItem.tsx` 显示标签徽章

- [ ] **Task 7.7.4**: 实现 UI 交互
  - 点击"添加标签"按钮显示选择器
  - 支持创建新标签
  - 显示标签自动补全
  - 多选标签支持

#### Story 7.8: 按标签筛选内容

- [ ] **Task 7.8.1**: 扩展查询功能
  - 修改 `get_collections()` Command 支持 `tag_ids` 参数（数组）
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加 JOIN 查询标签关联

- [ ] **Task 7.8.2**: 更新 React 组件
  - 修改 `apps/desktop/src/components/CollectionList.tsx` 支持 `tagIds` 筛选
  - 修改 `apps/desktop/src/hooks/use-collections.ts` 支持标签筛选
  - 实现"无标签"分类（tagIds = [] 且排除有标签的内容）

- [ ] **Task 7.8.3**: 实现交互
  - 点击标签应用筛选
  - 点击标签徽章应用筛选
  - 显示筛选提示和清除筛选按钮

#### Story 7.9: 标签排序

- [ ] **Task 7.9.1**: 扩展查询功能
  - 修改 `get_tags()` Command 支持 `sort` 参数
  - 支持排序方式：按名称（A-Z）、按使用频率、按创建时间

- [ ] **Task 7.9.2**: 创建设置存储
  - 在 `apps/desktop/src/stores/use-settings-store.ts` 保存标签排序偏好
  - 或使用 Tauri Settings 持久化

- [ ] **Task 7.9.3**: 实现 UI
  - 在 `apps/desktop/src/components/features/TagsList.tsx` 添加排序菜单
  - 实现排序选项切换

#### Story 7.10: AI 自动生成标签（可选，可延后）

- [ ] **Task 7.10.1**: 实现标签生成逻辑
  - 在 `apps/desktop/src-tauri/src/embedding/tag_generation.rs` 实现
  - 使用关键词提取（TF-IDF）或预定义分类匹配
  - 生成 2-5 个相关标签

- [ ] **Task 7.10.2**: 扩展数据库
  - 在 `tags` 表添加 `is_auto` 字段（BOOLEAN，默认 false）

- [ ] **Task 7.10.3**: 实现 UI
  - 自动标签以不同样式显示（灰色背景）
  - 显示"自动"标识
  - 支持确认/移除自动标签

#### Story 7.11: 归档内容

- [ ] **Task 7.11.1**: 创建 Tauri Command
  - `archive_collection(id: number)` - 归档内容（设置 status = 'archived'）

- [ ] **Task 7.11.2**: 更新 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加 `archive()` 方法

- [ ] **Task 7.11.3**: 更新 React 组件
  - 在 `apps/desktop/src/components/CollectionItem.tsx` 添加"归档"按钮
  - 实现归档操作和成功提示

- [ ] **Task 7.11.4**: 更新查询
  - 修改 `get_collections()` 默认只返回 `status = 'active'` 的内容
  - 支持 `status` 参数筛选

#### Story 7.12: 恢复归档内容

- [ ] **Task 7.12.1**: 创建 Tauri Command
  - `restore_collection(id: number)` - 恢复内容（设置 status = 'active'）

- [ ] **Task 7.12.2**: 更新 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加 `restore()` 方法

- [ ] **Task 7.12.3**: 更新 React 组件
  - 在归档内容列表中显示"恢复"按钮
  - 实现恢复操作

#### Story 7.13: 删除内容到"最近删除"

- [ ] **Task 7.13.1**: 修改删除 Command
  - 修改 `delete_collection()` 为软删除（设置 status = 'deleted'）
  - 添加 `deleted_at` 字段到 `collections` 表（可选，或使用 `updated_at`）

- [ ] **Task 7.13.2**: 更新 Rust Repository
  - 修改 `apps/desktop/src-tauri/src/db/collections.rs` 的 `delete()` 方法
  - 实现软删除逻辑

- [ ] **Task 7.13.3**: 创建确认对话框
  - `apps/desktop/src/components/features/DeleteConfirmDialog.tsx` - 删除确认对话框

- [ ] **Task 7.13.4**: 更新 React 组件
  - 在 `apps/desktop/src/components/CollectionItem.tsx` 添加"删除"按钮
  - 实现删除操作和成功提示

#### Story 7.14: 永久删除内容

- [ ] **Task 7.14.1**: 创建 Tauri Command
  - `permanently_delete_collection(id: number)` - 永久删除（DELETE FROM collections）

- [ ] **Task 7.14.2**: 更新 Rust Repository
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加 `permanently_delete()` 方法
  - 确保 CASCADE 删除关联数据（embeddings、collection_tags）

- [ ] **Task 7.14.3**: 更新 React 组件
  - 在"最近删除"列表中显示"永久删除"按钮
  - 实现永久删除确认对话框

#### Story 7.15: 自动清理"最近删除"

- [ ] **Task 7.15.1**: 实现清理逻辑
  - 在 `apps/desktop/src-tauri/src/db/collections.rs` 添加 `cleanup_deleted()` 方法
  - 删除 `status = 'deleted'` 且 `updated_at < 30天前` 的内容

- [ ] **Task 7.15.2**: 实现定时任务
  - 在应用启动时检查并清理
  - 或使用 Tauri 后台任务（如果支持）

- [ ] **Task 7.15.3**: 添加设置选项
  - 在设置中添加"自动清理"开关和天数配置

#### Story 7.16: 侧边栏"其他"分类

- [ ] **Task 7.16.1**: 创建组件
  - `apps/desktop/src/components/features/OtherSection.tsx` - "其他"分类组件

- [ ] **Task 7.16.2**: 扩展 AppSidebar
  - 在 `apps/desktop/src/components/AppSidebar.tsx` 添加"其他"分类区域
  - 显示"已归档"和"最近删除"子项
  - 显示数量徽章
  - 实现独立的展开/折叠状态

- [ ] **Task 7.16.3**: 实现交互
  - 点击"已归档"显示归档内容列表
  - 点击"最近删除"显示删除内容列表
  - 显示筛选提示

### Acceptance Criteria

#### Story 7.1: 数据库 Schema 扩展

- [ ] **AC 7.1.1**: Given 数据库已初始化，When 运行 Schema 迁移，Then 创建 `favorites`、`tags`、`collection_tags` 表，And `collections` 表添加 `favorite_id` 和 `status` 字段
- [ ] **AC 7.1.2**: Given Schema 已更新，When 查询数据库，Then 所有表都有正确的索引和外键约束，And 默认创建"未分类"收藏夹

#### Story 7.2: 收藏夹管理

- [ ] **AC 7.2.1**: Given 用户在侧边栏，When 点击收藏夹区域的"+"按钮，Then 显示创建收藏夹对话框，And 用户可以输入收藏夹名称
- [ ] **AC 7.2.2**: Given 用户输入收藏夹名称，When 点击"创建"，Then 收藏夹出现在侧边栏列表中，And 显示内容数量为 0
- [ ] **AC 7.2.3**: Given 用户已创建收藏夹，When 右键点击收藏夹，Then 显示上下文菜单：重命名、删除
- [ ] **AC 7.2.4**: Given 用户选择重命名，When 输入新名称并确认，Then 收藏夹名称更新，And 侧边栏立即反映更改
- [ ] **AC 7.2.5**: Given 用户选择删除收藏夹，When 收藏夹中有内容，Then 显示确认对话框，And 用户确认后，收藏夹被删除，内容移动到"未分类"
- [ ] **AC 7.2.6**: Given 用户选择删除收藏夹，When 收藏夹为空，Then 直接删除，无需确认

#### Story 7.3: 将内容添加到收藏夹

- [ ] **AC 7.3.1**: Given 用户查看内容列表或详情，When 点击内容项的"添加到收藏夹"按钮，Then 显示收藏夹选择菜单，And 显示所有收藏夹列表（包括"未分类"）
- [ ] **AC 7.3.2**: Given 用户选择收藏夹，When 点击某个收藏夹，Then 内容被添加到该收藏夹，And 侧边栏中该收藏夹的内容数量更新，And 显示成功提示
- [ ] **AC 7.3.3**: Given 内容已在某个收藏夹中，When 用户选择另一个收藏夹，Then 内容从原收藏夹移除，添加到新收藏夹，And 两个收藏夹的内容数量都更新

#### Story 7.4: 查看收藏夹内容

- [ ] **AC 7.4.1**: Given 用户在侧边栏，When 点击某个收藏夹，Then 主内容区显示该收藏夹的所有内容，And 显示内容数量（如"5 条内容"）
- [ ] **AC 7.4.2**: Given 用户查看收藏夹内容，When 收藏夹为空，Then 显示空状态提示："此收藏夹还没有内容"，And 提供"添加内容"按钮
- [ ] **AC 7.4.3**: Given 用户查看"未分类"收藏夹，When 点击它，Then 显示所有未分配到其他收藏夹的内容，And 显示内容数量
- [ ] **AC 7.4.4**: Given 用户在收藏夹内容列表中，When 执行搜索，Then 搜索结果限定在当前收藏夹内

#### Story 7.5: 侧边栏收藏夹列表

- [ ] **AC 7.5.1**: Given 用户在应用主界面，When 查看侧边栏，Then 显示"收藏夹"区域，And 显示折叠/展开按钮（chevron 图标）
- [ ] **AC 7.5.2**: Given 收藏夹区域已展开，When 点击折叠按钮，Then 收藏夹列表隐藏，And 只显示"收藏夹"标题和"+"按钮
- [ ] **AC 7.5.3**: Given 收藏夹区域已折叠，When 点击展开按钮，Then 显示所有收藏夹列表，And 每个收藏夹显示名称和内容数量（如"未分类 5"）
- [ ] **AC 7.5.4**: Given 用户有多个收藏夹，When 查看侧边栏，Then 收藏夹按创建时间或名称排序显示，And "未分类"始终显示在第一位

#### Story 7.6: 标签管理

- [ ] **AC 7.6.1**: Given 用户在侧边栏标签区域，When 点击"+"按钮，Then 显示创建标签对话框，And 用户可以输入标签名称
- [ ] **AC 7.6.2**: Given 用户输入标签名称，When 标签名称已存在，Then 显示错误提示："标签已存在"，And 不允许创建重复标签
- [ ] **AC 7.6.3**: Given 用户输入唯一标签名称，When 点击"创建"，Then 标签出现在侧边栏标签列表中，And 显示使用该标签的内容数量（初始为 0）
- [ ] **AC 7.6.4**: Given 用户已创建标签，When 右键点击标签，Then 显示上下文菜单：重命名、删除
- [ ] **AC 7.6.5**: Given 用户选择重命名标签，When 输入新名称并确认，Then 标签名称更新，And 所有使用该标签的内容关联保持不变
- [ ] **AC 7.6.6**: Given 用户选择删除标签，When 标签被内容使用，Then 显示确认对话框，And 用户确认后，标签被删除，内容关联被移除

#### Story 7.7: 为内容添加标签

- [ ] **AC 7.7.1**: Given 用户查看内容详情或列表项，When 点击"添加标签"按钮，Then 显示标签选择器，And 显示所有已有标签列表，And 显示标签输入框（支持创建新标签）
- [ ] **AC 7.7.2**: Given 用户在标签选择器中，When 输入标签名称，Then 显示匹配的已有标签建议（自动补全），And 如果输入新标签名称，显示"创建新标签"选项
- [ ] **AC 7.7.3**: Given 用户选择已有标签或创建新标签，When 点击确认，Then 标签被添加到内容，And 内容项显示标签徽章，And 标签的使用数量更新
- [ ] **AC 7.7.4**: Given 内容已有多个标签，When 用户查看内容，Then 显示所有标签徽章，And 可以点击标签徽章快速筛选

#### Story 7.8: 按标签筛选内容

- [ ] **AC 7.8.1**: Given 用户在侧边栏，When 点击某个标签，Then 主内容区显示所有包含该标签的内容，And 显示筛选提示："标签: #标签名 (5 条)"
- [ ] **AC 7.8.2**: Given 用户查看标签内容列表，When 点击"清除筛选"，Then 显示所有内容（取消标签筛选）
- [ ] **AC 7.8.3**: Given 用户在内容列表中，When 点击内容项的标签徽章，Then 应用该标签筛选，And 显示该标签的所有内容
- [ ] **AC 7.8.4**: Given 用户按标签筛选，When 执行搜索，Then 搜索结果限定在包含该标签的内容中
- [ ] **AC 7.8.5**: Given 用户查看"无标签"分类，When 点击它，Then 显示所有未添加标签的内容

#### Story 7.9: 标签排序

- [ ] **AC 7.9.1**: Given 用户在侧边栏标签区域，When 点击排序图标，Then 显示排序选项菜单：按名称排序（A-Z）、按使用频率排序（最常用在前）、按创建时间排序（最新在前）
- [ ] **AC 7.9.2**: Given 用户选择排序方式，When 点击某个选项，Then 标签列表立即按选择的方式排序，And 排序偏好被保存（下次打开应用时保持）

#### Story 7.10: AI 自动生成标签（可选）

- [ ] **AC 7.10.1**: Given 用户收集了新内容，When 内容处理完成，Then 系统自动分析内容，And 生成 2-5 个相关标签（如"React", "状态管理", "前端"）
- [ ] **AC 7.10.2**: Given 自动标签已生成，When 用户查看内容，Then 自动标签以不同样式显示（与手动标签区分，如灰色背景），And 显示"自动"标识
- [ ] **AC 7.10.3**: Given 用户不认可某个自动标签，When 点击标签的"移除"按钮，Then 该标签被移除，And 不再显示
- [ ] **AC 7.10.4**: Given 用户认可自动标签，When 点击标签的"确认"按钮，Then 标签样式变为手动标签样式，And 不再显示"自动"标识

#### Story 7.11: 归档内容

- [ ] **AC 7.11.1**: Given 用户查看内容列表或详情，When 点击"归档"按钮，Then 内容状态变为"已归档"，And 内容从正常列表中消失，And 显示成功提示："已归档"
- [ ] **AC 7.11.2**: Given 内容已归档，When 用户查看正常内容列表，Then 归档内容不显示，And 内容数量统计不包含归档内容
- [ ] **AC 7.11.3**: Given 用户在侧边栏"其他"分类下，When 点击"已归档"，Then 显示所有归档内容列表，And 显示归档内容数量

#### Story 7.12: 恢复归档内容

- [ ] **AC 7.12.1**: Given 用户在"已归档"分类中，When 查看归档内容列表，Then 每个内容项显示"恢复"按钮
- [ ] **AC 7.12.2**: Given 用户点击"恢复"按钮，When 确认操作，Then 内容状态变为"active"，And 内容从归档列表移除，And 出现在正常内容列表中，And 显示成功提示："已恢复"

#### Story 7.13: 删除内容到"最近删除"

- [ ] **AC 7.13.1**: Given 用户查看内容列表或详情，When 点击"删除"按钮，Then 显示确认对话框："确定要删除此内容吗？"，And 提示："删除后可在'最近删除'中恢复"
- [ ] **AC 7.13.2**: Given 用户确认删除，When 点击"确定"，Then 内容状态变为"deleted"，And 内容从正常列表和归档列表中消失，And 移动到"最近删除"分类，And 显示成功提示："已删除"
- [ ] **AC 7.13.3**: Given 用户在侧边栏"其他"分类下，When 点击"最近删除"，Then 显示所有已删除内容列表，And 显示删除时间，And 显示"恢复"和"永久删除"按钮

#### Story 7.14: 永久删除内容

- [ ] **AC 7.14.1**: Given 用户在"最近删除"分类中，When 查看已删除内容列表，Then 每个内容项显示"永久删除"按钮
- [ ] **AC 7.14.2**: Given 用户点击"永久删除"，When 显示确认对话框："此操作不可恢复，确定要永久删除吗？"，And 用户确认，Then 内容从数据库中彻底删除，And 关联的向量嵌入也被删除，And 内容从"最近删除"列表移除，And 显示成功提示："已永久删除"

#### Story 7.15: 自动清理"最近删除"

- [ ] **AC 7.15.1**: Given 系统已启动，When 每天首次启动时，Then 检查"最近删除"中的内容，And 自动永久删除超过30天的内容
- [ ] **AC 7.15.2**: Given 自动清理执行，When 有内容被清理，Then 在日志中记录清理数量，And 可选：显示通知"已清理 X 条过期内容"
- [ ] **AC 7.15.3**: Given 用户查看设置，When 查看"自动清理"选项，Then 可以启用/禁用自动清理，And 可以自定义清理天数（默认30天）

#### Story 7.16: 侧边栏"其他"分类

- [ ] **AC 7.16.1**: Given 用户在侧边栏，When 查看"其他"分类，Then 显示以下子项："已归档"（显示归档内容数量）、"最近删除"（显示删除内容数量）
- [ ] **AC 7.16.2**: Given "其他"分类已展开，When 点击"已归档"，Then 主内容区显示所有归档内容，And 显示筛选提示："已归档 (3 条)"
- [ ] **AC 7.16.3**: Given "其他"分类已展开，When 点击"最近删除"，Then 主内容区显示所有已删除内容，And 显示筛选提示："最近删除 (2 条)"

## Additional Context

### Dependencies

**Story 依赖关系：**

- Story 7.1 是基础，必须先完成（数据库 Schema）
- Story 7.2-7.5 依赖 Story 7.1（收藏夹功能）
- Story 7.6-7.9 依赖 Story 7.1（标签功能）
- Story 7.11-7.15 依赖 Story 7.1（归档和删除功能）
- Story 7.16 依赖 Story 7.11-7.13（"其他"分类）

**技术依赖：**

- 需要先完成 Epic 1（数据库基础、Tauri Commands 模式）
- 需要先完成 Epic 2（搜索功能，用于筛选）
- 需要先完成 Epic 5（内容管理基础）

### Testing Strategy

**数据库迁移测试：**

- 测试迁移脚本在空数据库上运行
- 测试迁移脚本在已有数据上运行（向后兼容）
- 测试外键约束和数据完整性

**功能测试：**

- 测试收藏夹 CRUD 操作
- 测试标签 CRUD 操作
- 测试内容添加到收藏夹/标签
- 测试筛选功能
- 测试归档/删除/恢复流程

**UI 测试：**

- 测试侧边栏展开/折叠
- 测试对话框交互
- 测试右键菜单
- 测试空状态显示

**集成测试：**

- 测试收藏夹、标签、归档删除的完整流程
- 测试数据一致性（数量统计、关联关系）

### Notes

**实现顺序建议：**

1. Story 7.1（数据库 Schema）- 必须首先完成
2. Story 7.2-7.5（收藏夹功能）- 可以独立实现
3. Story 7.6-7.9（标签功能）- 可以独立实现
4. Story 7.11-7.15（归档删除）- 可以独立实现
5. Story 7.16（"其他"分类）- 最后实现
6. Story 7.10（AI 标签）- 可选，可以延后

**注意事项：**

- 数据库迁移需要考虑向后兼容性（已有数据）
- 默认"未分类"收藏夹需要在迁移时创建
- 状态管理需要考虑实时更新（使用 Tauri Events）
- UI 组件需要遵循现有设计系统
- 性能考虑：大量内容时的筛选和查询性能

**未来扩展：**

- 标签颜色自定义
- 收藏夹图标自定义
- 批量操作（批量添加到收藏夹、批量添加标签）
- 标签自动合并（相似标签建议合并）
- 收藏夹嵌套（子收藏夹）
