# Story 2.3: 笔记标题输入和验证

Status: review

## Story

As a 用户,
I want 在创建笔记时输入标题,
So that 笔记有清晰的标识。

## Acceptance Criteria

1. **Given** 用户在笔记创建界面
   **When** 查看界面
   **Then** 显示标题输入框
   **And** 标题字段标记为必填项
   **And** 如果标题为空，保存时显示错误提示
   **And** 标题输入框支持基本的文本输入和编辑

## Tasks / Subtasks

- [x] Task 1: 添加标题输入框 (AC: 1)
  - [x] Subtask 1.1: 在笔记创建界面添加标题输入框
  - [x] Subtask 1.2: 标记为必填项（使用 UI 提示）
  - [x] Subtask 1.3: 支持基本的文本输入和编辑

- [x] Task 2: 实现验证逻辑 (AC: 1)
  - [x] Subtask 2.1: 在保存时检查标题是否为空
  - [x] Subtask 2.2: 如果为空，显示错误提示
  - [x] Subtask 2.3: 阻止保存操作直到标题填写

## Dev Notes

### 技术要点

1. **表单验证**: 使用 React Hook Form 或类似库进行验证
2. **错误提示**: 遵循现有 UX 设计规范的错误提示样式
3. **必填项标记**: 使用星号或"必填"标签

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.3]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 标题输入框已存在（在 Story 2.1 中实现），添加了必填项标记（红色星号）
- ✅ 实现了标题验证逻辑，在保存时检查标题是否为空
- ✅ 使用 FieldError 组件显示错误提示，遵循现有 UX 设计规范
- ✅ 当标题为空时，保存按钮已禁用（disabled={!title.trim()}），阻止保存操作
- ✅ 添加了错误状态管理，用户开始输入时自动清除错误提示
- ✅ 输入框在错误状态下显示红色边框（border-destructive）
- ✅ 添加了 aria-invalid 属性以提升无障碍性

### File List

- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 修改：添加标题验证逻辑和错误提示

### Change Log

- 2025-01-27: 实现 Story 2.3 - 笔记标题输入和验证
  - 在标题标签后添加必填项标记（红色星号）
  - 实现标题验证逻辑，保存时检查标题是否为空
  - 使用 FieldError 组件显示错误提示
  - 添加错误状态管理，用户输入时自动清除错误
  - 输入框在错误状态下显示红色边框
  - 保存按钮已禁用空标题（在 Story 2.1 中已实现）
