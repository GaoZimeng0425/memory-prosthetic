# Story 3.5: 笔记标签集成

Status: review

## Story

As a 用户,
I want 为笔记添加标签,
So that 可以通过标签组织和查找笔记。

## Acceptance Criteria

1. **Given** 用户在笔记创建或编辑界面
   **When** 查看标签选择器
   **Then** 显示现有的标签列表（与收集的内容使用相同的标签系统）
   **And** 显示标签输入框，支持多个标签选择
   **And** 显示已有标签建议（自动补全）
   **And** 用户可以选择或创建新标签
   **And** 保存后笔记与选中的标签建立关联（`collection_tags` 表）
   **And** 笔记可以在侧边栏中按标签筛选显示

## Tasks / Subtasks

- [x] Task 1: 添加标签选择器 (AC: 1)
  - [x] Subtask 1.1: 在笔记创建界面添加标签选择器（使用 TagSelector 组件）
  - [x] Subtask 1.2: 支持多个标签选择（TagSelector 已支持）
  - [x] Subtask 1.3: 实现标签自动补全（TagSelector 已支持）
  - [x] Subtask 1.4: 编辑界面通过 ArticleActionsMenu 的"标签"按钮管理标签（已存在）

- [x] Task 2: 实现标签创建 (AC: 1)
  - [x] Subtask 2.1: 支持创建新标签（TagSelector 已支持，通过 onCreateTag）
  - [x] Subtask 2.2: 验证标签名称唯一性（后端已实现）
  - [x] Subtask 2.3: 保存新标签到数据库（通过 useTags.createTag）

- [x] Task 3: 实现标签关联 (AC: 1)
  - [x] Subtask 3.1: 保存笔记时建立标签关联（创建笔记后调用 addCollectionTags）
  - [x] Subtask 3.2: 使用 collection_tags 表（通过 addCollectionTags API）
  - [x] Subtask 3.3: 处理标签更新（编辑界面通过 TagDialog 管理，已存在）

- [x] Task 4: 侧边栏筛选集成 (AC: 1)
  - [x] Subtask 4.1: 确保笔记参与标签筛选（筛选基于 collection_tags 表，不区分类型）
  - [x] Subtask 4.2: 按标签筛选显示笔记（已支持）

## Dev Notes

### 技术要点

1. **标签系统**: 复用现有的标签系统
2. **多标签支持**: 支持为笔记添加多个标签
3. **自动补全**: 显示已有标签建议

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-3.5]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 在 `NoteEditorPage` 中添加了标签选择器（使用 `TagSelector` 组件）
- ✅ `TagSelector` 组件支持多个标签选择、自动补全和创建新标签
- ✅ 实现了创建笔记后添加标签关联的逻辑：
  - 在创建笔记时选择标签（存储在本地状态）
  - 创建笔记成功后，使用返回的 ID 调用 `addCollectionTags` API
  - 如果添加标签失败，显示错误提示但不影响笔记保存
- ✅ 编辑界面通过 `ArticleActionsMenu` 的"标签"按钮管理标签（已存在，使用 `TagDialog`）
- ✅ 标签创建功能已通过 `TagSelector` 的 `onCreateTag` 支持
- ✅ 标签关联使用 `collection_tags` 表（通过 `addCollectionTags` API）
- ✅ 侧边栏标签筛选已支持笔记（筛选基于 `collection_tags` 表的 JOIN 查询，不区分内容类型）
- ✅ 笔记可以在侧边栏中按标签筛选显示（已支持）

### File List

- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 修改：添加标签选择器和标签关联逻辑

### Change Log

- 2025-01-27: 实现 Story 3.5 - 笔记标签集成
  - 在笔记创建界面添加标签选择器（使用 TagSelector 组件）
  - 实现创建笔记后添加标签关联的逻辑
  - 编辑界面通过 ArticleActionsMenu 的"标签"按钮管理标签（已存在）
  - 侧边栏标签筛选已支持笔记（基于 collection_tags 表，不区分类型）
  - 所有验收标准已满足
