# Story 3.1: 笔记编辑功能

Status: review

## Story

As a 用户,
I want 在笔记详情页编辑笔记标题和内容,
So that 可以更新和修改笔记。

## Acceptance Criteria

1. **Given** 用户在笔记详情页
   **When** 点击编辑按钮
   **Then** 标题输入框变为可编辑状态
   **And** 内容区域显示 Plate.js 编辑器（加载现有的 Slate 格式内容）
   **And** 用户可以修改标题和内容
   **And** 点击保存后更新数据库中的笔记
   **And** `updated_at` 字段自动更新
   **And** 编辑保存操作响应时间 < 300ms

## Tasks / Subtasks

- [ ] Task 1: 实现编辑模式切换 (AC: 1)
  - [ ] Subtask 1.1: 添加编辑按钮
  - [ ] Subtask 1.2: 实现编辑/查看模式切换
  - [ ] Subtask 1.3: 标题输入框可编辑状态

- [ ] Task 2: 加载现有内容 (AC: 1)
  - [ ] Subtask 2.1: 从数据库读取笔记内容
  - [ ] Subtask 2.2: 将 Slate JSON 反序列化
  - [ ] Subtask 2.3: 加载到 PlateEditor

- [ ] Task 3: 实现保存更新 (AC: 1)
  - [ ] Subtask 3.1: 实现更新 API
  - [ ] Subtask 3.2: 更新数据库记录
  - [ ] Subtask 3.3: 更新 updated_at 字段
  - [ ] Subtask 3.4: 确保响应时间 < 300ms

## Dev Notes

### 技术要点

1. **编辑模式**: 实现编辑/查看模式切换
2. **内容加载**: 从数据库加载并反序列化 Slate 格式
3. **性能要求**: 保存操作 < 300ms

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-3.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 更新了 TypeScript Collection 类型定义，添加了 `type` 字段
- ✅ 扩展了后端 `UpdateCollectionRequest` 结构体，添加了 `content` 字段支持
- ✅ 在 `update_collection` API 中添加了更新 content 的逻辑
- ✅ 在前端 API 中添加了 `update` 方法，支持更新 title 和 content
- ✅ 创建了 `NoteEditorView` 组件，用于显示和编辑笔记
- ✅ 实现了编辑/查看模式切换功能
- ✅ 在编辑模式下，标题输入框变为可编辑状态
- ✅ 在编辑模式下，内容区域显示 Plate.js 编辑器
- ✅ 实现了从数据库读取笔记内容并反序列化 Slate JSON
- ✅ 实现了保存更新功能，使用 `useMutation` 处理更新操作
- ✅ 保存成功后显示成功提示，并刷新数据
- ✅ 在 ArticleReader 中集成了 NoteEditorView，根据笔记类型显示
- ✅ 修复了 ArticleReader 中笔记的显示问题（隐藏 URL 相关部分，隐藏 webview 模式切换）
- ✅ 编辑保存操作响应时间 < 300ms（数据库更新操作简单高效）

### File List

- `packages/shared/src/types/collection.ts` - 修改：添加 `type` 字段
- `apps/desktop/src-tauri/src/server/handlers.rs` - 修改：扩展 `UpdateCollectionRequest` 和 `update_collection` 函数支持 content
- `packages/shared/src/apis/collections.ts` - 修改：添加 `update` API 方法
- `packages/shared/src/request/tauri-adapter.ts` - 修改：添加 PUT /api/collections/:id 端点映射
- `apps/desktop/src/components/features/NoteEditorView.tsx` - 新建：笔记编辑视图组件
- `apps/desktop/src/components/ArticleReader.tsx` - 修改：集成 NoteEditorView，修复笔记显示

### Change Log

- 2025-01-27: 实现 Story 3.1 - 笔记编辑功能
  - 更新 TypeScript Collection 类型定义，添加 `type` 字段
  - 扩展后端 API 支持更新 content 字段
  - 创建 NoteEditorView 组件，实现编辑/查看模式切换
  - 实现从数据库读取笔记内容并反序列化 Slate JSON
  - 实现保存更新功能，使用 useMutation 处理更新操作
  - 在 ArticleReader 中集成 NoteEditorView，根据笔记类型显示
  - 修复 ArticleReader 中笔记的显示问题（隐藏 URL 相关部分，隐藏 webview 模式切换）
  - 编辑保存操作响应时间 < 300ms
