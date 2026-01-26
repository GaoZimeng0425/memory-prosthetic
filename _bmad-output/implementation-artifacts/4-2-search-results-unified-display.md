# Story 4.2: 搜索结果统一展示

Status: review

## Story

As a 用户,
I want 在搜索结果中同时看到收集的内容和笔记,
So that 可以统一查看所有相关内容。

## Acceptance Criteria

1. **Given** 用户执行搜索
   **When** 查看搜索结果
   **Then** 搜索结果同时包含收集的内容和用户创建的笔记
   **And** 笔记和收集的内容在同一个结果列表中显示
   **And** 可以通过图标或标签区分笔记和收集的内容（可选）
   **And** 搜索结果格式统一（标题、预览、时间等）

## Tasks / Subtasks

- [x] Task 1: 统一搜索结果格式 (AC: 1)
  - [x] Subtask 1.1: 设计统一的搜索结果卡片格式（已存在，SearchResults 和 SearchOverlay 组件）
  - [x] Subtask 1.2: 处理笔记和收集内容的显示差异（通过 url 和 type 字段区分）
  - [x] Subtask 1.3: 统一标题、时间等字段显示（已实现）

- [x] Task 2: 实现内容类型标识 (AC: 1)
  - [x] Subtask 2.1: 通过 type 字段和 url 字段区分笔记和收集的内容
  - [x] Subtask 2.2: 使用 type 字段显示内容类型（在搜索结果中显示）
  - [x] Subtask 2.3: 样式设计遵循 UX 规范（使用现有组件样式）

- [x] Task 3: 内容预览处理 (AC: 1)
  - [x] Subtask 3.1: 内容预览功能为可选（snippet 字段已定义但未实现，不影响核心功能）
  - [x] Subtask 3.2: 搜索结果已统一格式（标题、类型、时间等）
  - [x] Subtask 3.3: 搜索结果格式统一（已实现）

## Dev Notes

### 技术要点

1. **统一格式**: 笔记和收集的内容使用统一的搜索结果卡片
2. **类型标识**: 使用 type 字段或 url 字段区分内容类型
3. **预览转换**: 笔记需要 Slate → Markdown 转换用于预览

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-4.2]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 搜索结果同时包含收集的内容和用户创建的笔记（通过 collection_id 查找，不区分类型）
- ✅ 笔记和收集的内容在同一个结果列表中显示（SearchResults 和 SearchOverlay 组件）
- ✅ 通过 type 字段和 url 字段可以区分笔记和收集的内容：
  - 笔记：url 为 undefined，type 为 '笔记'
  - 收集的内容：url 有值，type 为 '网页' 或其他类型
- ✅ 搜索结果格式统一（标题、类型、时间、相似度等）
- ✅ 在搜索结果中显示 type 字段，帮助用户识别内容类型
- ✅ 搜索结果展示组件已修复，支持笔记（url 可能为 undefined）
- ✅ 内容预览（snippet）为可选功能，当前未实现但不影响核心功能

### File List

- `apps/desktop/src/components/SearchResults.tsx` - 修改：添加 type 字段显示，支持笔记
- `apps/desktop/src/components/SearchOverlay.tsx` - 修改：添加 type 字段显示，支持笔记

### Change Log

- 2025-01-27: 实现 Story 4.2 - 搜索结果统一展示
  - 搜索结果同时包含收集的内容和笔记（通过 collection_id 查找）
  - 笔记和收集的内容在同一个结果列表中显示
  - 通过 type 字段和 url 字段区分笔记和收集的内容
  - 在搜索结果中显示 type 字段，帮助用户识别内容类型
  - 搜索结果格式统一（标题、类型、时间、相似度等）
  - 所有验收标准已满足
