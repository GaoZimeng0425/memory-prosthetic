# Story 4.1: 笔记语义搜索集成

Status: review

## Story

As a 用户,
I want 通过语义搜索找到我创建的笔记,
So that 可以使用模糊记忆检索笔记内容。

## Acceptance Criteria

1. **Given** 用户已创建笔记并生成了 Embedding 向量
   **When** 用户在搜索框输入查询
   **Then** 笔记参与语义搜索（使用现有的向量搜索功能）
   **And** 搜索结果包含匹配的笔记
   **And** 搜索结果按相关性排序
   **And** 笔记在搜索结果中正确显示（标题、内容预览）

## Tasks / Subtasks

- [x] Task 1: 扩展搜索查询 (AC: 1)
  - [x] Subtask 1.1: 搜索查询已包含笔记（搜索通过 collection_id 查找，不区分 url 是否为 NULL）
  - [x] Subtask 1.2: 笔记的 Embedding 已参与向量搜索（Story 2.8 已实现 Embedding 生成）
  - [x] Subtask 1.3: 搜索结果统一排序（按 similarity 排序）

- [x] Task 2: 搜索结果展示 (AC: 1)
  - [x] Subtask 2.1: 在搜索结果中显示笔记（修复了搜索结果展示组件）
  - [x] Subtask 2.2: 显示笔记标题（已支持）
  - [x] Subtask 2.3: 区分笔记和收集的内容（通过 type 字段和 url 字段区分）

## Dev Notes

### 技术要点

1. **向量搜索**: 使用现有的 Embedding 向量搜索功能
2. **查询扩展**: 搜索查询需要包含 url IS NULL 的记录
3. **结果统一**: 笔记和收集的内容统一排序和展示

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-4.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 笔记的 Embedding 生成已实现（Story 2.8），笔记自动参与语义搜索
- ✅ 搜索查询通过 `collection_id` 查找，不区分 url 是否为 NULL，笔记自动包含在搜索结果中
- ✅ 更新了后端 `Collection` 结构体，`url` 字段改为 `Option<String>`
- ✅ 更新了后端 `SearchResultItem` 结构体，`url` 字段改为 `Option<String>`，添加 `type` 字段
- ✅ 修复了前端搜索结果展示组件，支持笔记（url 可能为 undefined）：
  - `SearchResults.tsx`: 处理 url 为 undefined 的情况，显示"笔记"而不是域名
  - `SearchOverlay.tsx`: 修复 `getDomain` 函数和 `onOpenUrl` 调用
  - `SearchWindow.tsx`: 修复搜索结果展示，显示 type 字段
- ✅ 搜索结果按相关性排序（按 similarity 降序）
- ✅ 笔记在搜索结果中正确显示（标题、类型、时间等）
- ✅ 通过 `type` 字段和 `url` 字段可以区分笔记和收集的内容

### File List

- `apps/desktop/src-tauri/src/db/collections.rs` - 修改：Collection 结构体的 url 字段改为 Option<String>
- `apps/desktop/src-tauri/src/server/handlers.rs` - 修改：SearchResultItem 结构体支持 url 可选和 type 字段
- `apps/desktop/src-tauri/src/lib.rs` - 修改：SearchResultItem 结构体支持 url 可选和 type 字段
- `apps/desktop/src-tauri/src/server/mcp/tools.rs` - 修改：SearchResultItem 结构体支持 url 可选和 type 字段
- `packages/shared/src/types/api.ts` - 修改：SearchResultItem 接口支持 url 可选和 type 字段
- `apps/desktop/src/components/SearchResults.tsx` - 修改：支持笔记（url 可能为 undefined）
- `apps/desktop/src/components/SearchOverlay.tsx` - 修改：支持笔记（url 可能为 undefined）
- `apps/desktop/src/pages/SearchWindow.tsx` - 修改：支持笔记（url 可能为 undefined）

### Change Log

- 2025-01-27: 实现 Story 4.1 - 笔记语义搜索集成
  - 更新后端 Collection 和 SearchResultItem 结构体支持 url 可选
  - 笔记的 Embedding 生成已实现（Story 2.8），笔记自动参与语义搜索
  - 搜索查询通过 collection_id 查找，不区分 url 是否为 NULL
  - 修复前端搜索结果展示组件，支持笔记（url 可能为 undefined）
  - 搜索结果按相关性排序（按 similarity 降序）
  - 通过 type 字段和 url 字段可以区分笔记和收集的内容
