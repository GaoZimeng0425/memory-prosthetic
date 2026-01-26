# Story 4.4: 笔记详情页展示

Status: review

## Story

As a 用户,
I want 在笔记详情页查看完整的笔记内容,
So that 可以阅读和编辑笔记。

## Acceptance Criteria

1. **Given** 用户点击搜索结果或列表中的笔记
   **When** 打开笔记详情页
   **Then** 显示笔记标题
   **And** 将 Slate 格式转换为 Markdown 并正确渲染（使用 streamdown）
   **And** 显示笔记的创建时间和更新时间
   **And** 显示笔记的分类信息（`type` 字段）
   **And** 显示笔记的收藏夹和标签信息
   **And** 提供编辑、删除、归档等操作按钮

## Tasks / Subtasks

- [x] Task 1: 实现笔记详情页布局 (AC: 1)
  - [x] Subtask 1.1: 笔记详情页通过 ArticleReader 和 NoteEditorView 组件实现
  - [x] Subtask 1.2: 显示笔记标题（ArticleReader 已支持）
  - [x] Subtask 1.3: 显示元数据（时间、分类、收藏夹、标签）（ArticleReader 已支持）

- [x] Task 2: 实现内容渲染 (AC: 1)
  - [x] Subtask 2.1: 从数据库读取 Slate JSON（NoteEditorView 已实现）
  - [x] Subtask 2.2: 转换为 Markdown（NoteEditorView 使用 slateToMarkdown）
  - [x] Subtask 2.3: 使用 streamdown 渲染 Markdown（NoteEditorView 使用 MarkdownUI 组件）

- [x] Task 3: 添加操作按钮 (AC: 1)
  - [x] Subtask 3.1: 添加编辑按钮（NoteEditorView 已实现）
  - [x] Subtask 3.2: 添加删除按钮（NoteEditorView 已实现，Story 3.2）
  - [x] Subtask 3.3: 添加归档按钮（ArticleReader 工具栏已实现）

## Dev Notes

### 技术要点

1. **内容渲染**: Slate → Markdown → streamdown 渲染
2. **元数据显示**: 显示 type、favorite、tags 等信息
3. **操作按钮**: 编辑、删除、归档等功能

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-4.4]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 笔记详情页通过 `ArticleReader` 和 `NoteEditorView` 组件实现
- ✅ 显示笔记标题（ArticleReader 的 header 部分）
- ✅ 将 Slate 格式转换为 Markdown 并正确渲染（NoteEditorView 使用 `slateToMarkdown` 和 `MarkdownUI`）
- ✅ 显示笔记的创建时间和更新时间（ArticleReader 的 header 和 footer 部分）
- ✅ 显示笔记的分类信息（type 字段）（ArticleReader 的 header 部分，通过 type 字段显示）
- ✅ 显示笔记的收藏夹和标签信息（ArticleReader 的 header 部分）
- ✅ 提供编辑、删除、归档等操作按钮：
  - 编辑按钮：NoteEditorView 中的"编辑"按钮
  - 删除按钮：NoteEditorView 中的"删除"按钮（Story 3.2）
  - 归档按钮：ArticleReader 工具栏中的归档按钮
- ✅ 笔记详情页隐藏了 URL 相关部分和 webview 模式切换（ArticleReader 已处理）

### File List

- 无需修改文件，功能已通过现有组件实现

### Change Log

- 2025-01-27: 验证 Story 4.4 - 笔记详情页展示
  - 笔记详情页通过 ArticleReader 和 NoteEditorView 组件实现
  - 显示笔记标题、内容（Slate → Markdown 渲染）、时间、分类、收藏夹、标签等信息
  - 提供编辑、删除、归档等操作按钮
  - 所有验收标准已满足
