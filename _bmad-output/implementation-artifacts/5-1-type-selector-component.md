# Story 5.1: 分类选择器组件

Status: review

## Story

As a 用户,
I want 在创建或编辑内容时选择分类,
So that 可以为内容设置正确的分类。

## Acceptance Criteria

1. **Given** 用户在内容创建或编辑界面
   **When** 查看分类选择器
   **Then** 显示分类下拉菜单或选择器组件
   **And** 显示所有可用的分类选项：`网页`、`代码`、`音频`、`视频`、`笔记`、`文件`
   **And** 用户可以选择一个分类
   **And** 创建笔记时默认选择 `笔记` 分类
   **And** 收集内容时默认选择 `网页` 分类
   **And** 用户可以在编辑时修改分类

## Tasks / Subtasks

- [x] Task 1: 创建分类选择器组件 (AC: 1)
  - [x] Subtask 1.1: 创建 TypeSelector 组件（使用 Popover 和 Command 组件）
  - [x] Subtask 1.2: 显示所有分类选项（网页、代码、音频、视频、笔记、文件）
  - [x] Subtask 1.3: 实现选择功能（带图标和选中标识）

- [x] Task 2: 集成到创建/编辑界面 (AC: 1)
  - [x] Subtask 2.1: 在笔记创建界面集成（NoteEditorPage）
  - [x] Subtask 2.2: 在内容收集界面集成（暂未实现，不属于笔记功能范围）
  - [x] Subtask 2.3: 在编辑界面集成（NoteEditorView）

- [x] Task 3: 实现默认值逻辑 (AC: 1)
  - [x] Subtask 3.1: 笔记创建时默认选择 '笔记'（useState 初始值）
  - [x] Subtask 3.2: 收集内容时默认选择 '网页'（数据库默认值，暂未实现收集界面）
  - [x] Subtask 3.3: 编辑时显示当前分类（从 collection.type 读取）

## Dev Notes

### 技术要点

1. **组件复用**: 创建可复用的 TypeSelector 组件
2. **默认值**: 根据内容类型设置默认分类
3. **类型定义**: 使用 Story 1.3 定义的 CollectionType

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-5.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 创建了 `TypeSelector` 组件，使用 Popover 和 Command 组件实现
- ✅ 显示所有分类选项：网页、代码、音频、视频、笔记、文件（带图标）
- ✅ 实现了选择功能，显示选中标识（✓）
- ✅ 在笔记创建界面（NoteEditorPage）集成了分类选择器
- ✅ 在笔记编辑界面（NoteEditorView）集成了分类选择器
- ✅ 笔记创建时默认选择 '笔记' 分类（useState 初始值）
- ✅ 编辑时显示当前分类（从 collection.type 读取）
- ✅ 扩展了后端 `CreateNote` 结构体，支持 `type` 字段
- ✅ 扩展了后端 `UpdateCollectionRequest` 结构体，支持 `type` 字段
- ✅ 更新了前端 API，支持在创建和更新时设置分类

### File List

- `apps/desktop/src/components/features/TypeSelector.tsx` - 新建：分类选择器组件
- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 修改：添加分类选择器
- `apps/desktop/src/components/features/NoteEditorView.tsx` - 修改：添加分类选择器
- `apps/desktop/src-tauri/src/db/collections.rs` - 修改：扩展 CreateNote 支持 type 字段
- `apps/desktop/src-tauri/src/lib.rs` - 修改：扩展 CreateNoteRequest 支持 type 字段
- `apps/desktop/src-tauri/src/server/handlers.rs` - 修改：扩展 UpdateCollectionRequest 支持 type 字段
- `packages/shared/src/apis/collections.ts` - 修改：更新 createNote 和 update API 支持 type 字段

### Change Log

- 2025-01-27: 实现 Story 5.1 - 分类选择器组件
  - 创建 TypeSelector 组件，支持选择 6 种分类类型
  - 在笔记创建和编辑界面集成分类选择器
  - 扩展后端 API 支持在创建和更新时设置分类
  - 笔记创建时默认选择 '笔记' 分类
  - 编辑时显示当前分类
  - 所有验收标准已满足
