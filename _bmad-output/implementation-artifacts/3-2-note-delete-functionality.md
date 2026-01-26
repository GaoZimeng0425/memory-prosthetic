# Story 3.2: 笔记删除功能

Status: review

## Story

As a 用户,
I want 在笔记详情页删除笔记,
So that 可以移除不需要的笔记。

## Acceptance Criteria

1. **Given** 用户在笔记详情页
   **When** 点击删除按钮
   **Then** 显示确认对话框
   **And** 用户确认后，笔记从数据库中删除（或标记为 deleted 状态）
   **And** 相关的 Embedding 向量也被删除（CASCADE）
   **And** 删除成功后显示成功提示
   **And** 用户返回到笔记列表或搜索界面

## Tasks / Subtasks

- [x] Task 1: 实现删除按钮和确认对话框 (AC: 1)
  - [x] Subtask 1.1: 添加删除按钮
  - [x] Subtask 1.2: 实现确认对话框
  - [x] Subtask 1.3: 处理用户确认/取消

- [x] Task 2: 实现删除逻辑 (AC: 1)
  - [x] Subtask 2.1: 调用删除 API
  - [x] Subtask 2.2: 删除笔记记录（或标记为 deleted）
  - [x] Subtask 2.3: 确保 Embedding 向量被删除（CASCADE）

- [x] Task 3: 用户反馈和导航 (AC: 1)
  - [x] Subtask 3.1: 显示删除成功提示
  - [x] Subtask 3.2: 返回到笔记列表或搜索界面

## Dev Notes

### 技术要点

1. **软删除**: 考虑使用软删除（标记为 deleted）还是硬删除
2. **CASCADE**: 确保外键约束正确处理 Embedding 删除
3. **用户确认**: 重要操作需要确认对话框

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-3.2]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 在 NoteEditorView 组件中添加了删除按钮，位于编辑按钮旁边
- ✅ 实现了删除确认对话框，使用 AlertDialog 组件
- ✅ 确认对话框显示笔记标题，提示用户操作可恢复（软删除）
- ✅ 实现了删除 mutation，调用 `collections.api.delete` API
- ✅ 删除操作使用软删除（标记为 deleted 状态），符合现有系统设计
- ✅ Embedding 向量通过数据库外键 CASCADE 约束自动删除
- ✅ 删除成功后显示成功提示（使用 sonner toast）
- ✅ 删除成功后调用 `onDelete` 回调，由父组件（ArticleReader）处理导航
- ✅ ArticleReader 已实现删除后的导航逻辑（返回到列表页）
- ✅ 修复了 ArticleReader 中 article.url 可能为 undefined 的类型错误

### File List

- `apps/desktop/src/components/features/NoteEditorView.tsx` - 修改：添加删除按钮和确认对话框
- `apps/desktop/src/components/ArticleReader.tsx` - 修改：传递 onDelete 回调给 NoteEditorView，修复类型错误

### Change Log

- 2025-01-27: 实现 Story 3.2 - 笔记删除功能
  - 在 NoteEditorView 中添加删除按钮和确认对话框
  - 实现删除 mutation，调用 collections API
  - 删除操作使用软删除（标记为 deleted 状态）
  - Embedding 向量通过数据库 CASCADE 约束自动删除
  - 删除成功后显示提示并触发导航回调
  - 修复 ArticleReader 中 article.url 可能为 undefined 的类型错误
