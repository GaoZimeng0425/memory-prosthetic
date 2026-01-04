# Story 3.3: 笔记归档和恢复功能

Status: review

## Story

As a 用户,
I want 归档和恢复笔记,
So that 可以管理笔记的状态。

## Acceptance Criteria

1. **Given** 用户在笔记详情页或列表页
   **When** 点击归档按钮
   **Then** 笔记状态更新为 `archived`
   **And** 归档的笔记在默认列表中不显示
   **And** 用户可以在归档列表中查看归档的笔记
   **And** 用户可以在归档列表中点击恢复按钮
   **And** 恢复后笔记状态更新为 `active`
   **And** 笔记重新出现在默认列表中

## Tasks / Subtasks

- [x] Task 1: 实现归档功能 (AC: 1)
  - [x] Subtask 1.1: 添加归档按钮（ArticleReader 工具栏已有）
  - [x] Subtask 1.2: 实现归档 API（已存在 `collections.api.archive`）
  - [x] Subtask 1.3: 更新笔记状态为 archived（通过通用 collection API）

- [x] Task 2: 实现归档列表视图 (AC: 1)
  - [x] Subtask 2.1: 创建归档列表页面或视图（`/archived` 路由已存在）
  - [x] Subtask 2.2: 筛选显示 archived 状态的笔记（通过 status='archived' 筛选）
  - [x] Subtask 2.3: 添加恢复按钮（ArticleReader 工具栏已有）

- [x] Task 3: 实现恢复功能 (AC: 1)
  - [x] Subtask 3.1: 实现恢复 API（已存在 `collections.api.restore`）
  - [x] Subtask 3.2: 更新笔记状态为 active（通过通用 collection API）
  - [x] Subtask 3.3: 笔记重新出现在默认列表（默认列表只显示 status='active'）

## Dev Notes

### 技术要点

1. **状态管理**: 使用现有的 status 字段（active/archived/deleted）
2. **列表筛选**: 默认列表不显示 archived 状态的笔记
3. **恢复功能**: 从 archived 恢复到 active

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-3.3]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 归档和恢复功能已通过现有的 collection 系统实现，笔记自动支持这些功能
- ✅ ArticleReader 工具栏中已有归档按钮（当 status='active' 时显示）
- ✅ ArticleReader 工具栏中已有恢复按钮（当 status='archived' 或 'deleted' 时显示）
- ✅ 归档 API 已存在：`collections.api.archive(id)`，使用通用的 collection API
- ✅ 恢复 API 已存在：`collections.api.restore(id)`，使用通用的 collection API
- ✅ 归档列表视图已存在：`/archived` 路由，显示所有 status='archived' 的内容（包括笔记）
- ✅ 默认列表只显示 status='active' 的内容，归档的笔记不会显示
- ✅ 恢复后笔记状态更新为 'active'，自动重新出现在默认列表中
- ✅ 笔记与收集的内容使用相同的归档/恢复逻辑，无需特殊处理

### File List

- 无需修改文件，功能已通过现有系统实现

### Change Log

- 2025-01-27: 验证 Story 3.3 - 笔记归档和恢复功能
  - 归档和恢复功能已通过现有的 collection 系统完全实现
  - 笔记自动支持归档和恢复，无需额外实现
  - ArticleReader 工具栏中的归档/恢复按钮对所有内容类型（包括笔记）都可用
  - 归档列表视图（`/archived` 路由）已支持显示归档的笔记
  - 所有验收标准已满足
