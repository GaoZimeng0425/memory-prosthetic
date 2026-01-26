# Story 3.4: 笔记收藏夹集成

Status: review

## Story

As a 用户,
I want 为笔记设置收藏夹,
So that 可以组织和管理笔记。

## Acceptance Criteria

1. **Given** 用户在笔记创建或编辑界面
   **When** 查看收藏夹选择器
   **Then** 显示现有的收藏夹列表（与收集的内容使用相同的收藏夹系统）
   **And** 用户可以选择一个收藏夹
   **And** 保存后笔记的 `favorite_id` 字段更新为选中的收藏夹 ID
   **And** 笔记可以在侧边栏中按收藏夹筛选显示

## Tasks / Subtasks

- [x] Task 1: 添加收藏夹选择器 (AC: 1)
  - [x] Subtask 1.1: 在笔记创建界面添加收藏夹选择器（使用 SelectFavoriteDialog）
  - [x] Subtask 1.2: 复用现有的 SelectFavoriteDialog 组件
  - [x] Subtask 1.3: 显示收藏夹列表（通过 SelectFavoriteDialog）
  - [x] Subtask 1.4: 编辑界面通过 ArticleActionsMenu 的"移动"按钮设置收藏夹（已存在）

- [x] Task 2: 实现收藏夹保存 (AC: 1)
  - [x] Subtask 2.1: 在保存笔记时包含 favorite_id（扩展 CreateNote API）
  - [x] Subtask 2.2: 更新数据库 favorite_id 字段（在 create_note 方法中）
  - [x] Subtask 2.3: 处理未选择的情况（favorite_id 为 NULL，可选）

- [x] Task 3: 侧边栏筛选集成 (AC: 1)
  - [x] Subtask 3.1: 确保笔记参与侧边栏筛选（筛选基于 favorite_id，不区分类型）
  - [x] Subtask 3.2: 按收藏夹筛选显示笔记（已支持）

## Dev Notes

### 技术要点

1. **组件复用**: 复用现有的 FavoriteSelector 组件
2. **数据层**: 使用现有的 set_favorite 方法
3. **筛选集成**: 确保笔记与收集的内容使用相同的筛选逻辑

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-3.4]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 扩展了后端 `CreateNote` 结构体，添加 `favorite_id: Option<i64>` 字段
- ✅ 更新了 `create_note` 方法，在插入笔记时包含 `favorite_id` 字段
- ✅ 更新了 `CreateNoteRequest` 结构体，添加 `favorite_id: Option<i64>` 字段
- ✅ 更新了前端 `createNote` API，支持 `favoriteId` 参数
- ✅ 在 `NoteEditorPage` 中添加了收藏夹选择器：
  - 使用 `SelectFavoriteDialog` 组件
  - 添加了收藏夹选择按钮，显示当前选中的收藏夹名称
  - 添加了清除收藏夹的按钮（X 图标）
  - 保存笔记时包含 `favoriteId`
- ✅ 编辑界面通过 `ArticleActionsMenu` 的"移动"按钮设置收藏夹（已存在）
- ✅ 侧边栏筛选已支持笔记（筛选基于 `favorite_id`，不区分内容类型）
- ✅ 笔记可以在侧边栏中按收藏夹筛选显示（已支持）

### File List

- `apps/desktop/src-tauri/src/db/collections.rs` - 修改：扩展 `CreateNote` 结构体和 `create_note` 方法
- `apps/desktop/src-tauri/src/lib.rs` - 修改：更新 `CreateNoteRequest` 结构体
- `packages/shared/src/apis/collections.ts` - 修改：更新 `createNote` API 支持 `favoriteId`
- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 修改：添加收藏夹选择器

### Change Log

- 2025-01-27: 实现 Story 3.4 - 笔记收藏夹集成
  - 扩展后端支持在创建笔记时设置收藏夹
  - 在笔记创建界面添加收藏夹选择器（使用 SelectFavoriteDialog）
  - 编辑界面通过 ArticleActionsMenu 的"移动"按钮设置收藏夹（已存在）
  - 侧边栏筛选已支持笔记（基于 favorite_id，不区分类型）
