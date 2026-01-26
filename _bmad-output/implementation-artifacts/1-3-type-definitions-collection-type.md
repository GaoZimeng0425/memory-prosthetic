# Story 1.3: 类型定义扩展 - CollectionType 和 Collection 类型

Status: review

## Story

As a 前端开发者,
I want 在共享类型包中定义 `CollectionType` 和扩展 `Collection` 类型,
So that 前端和后端可以使用统一的类型定义。

## Acceptance Criteria

1. **Given** `packages/shared/src/types/collection.ts` 文件存在
   **When** 添加类型定义
   **Then** 定义 `CollectionType` 类型：`'网页' | '代码' | '音频' | '视频' | '笔记' | '文件'`
   **And** `Collection` 类型的 `url` 字段改为可选（`url?: string`）
   **And** `Collection` 类型添加 `type: CollectionType` 字段
   **And** 类型定义导出并在项目中可用
   **And** TypeScript 编译无错误

## Tasks / Subtasks

- [x] Task 1: 定义 CollectionType 类型 (AC: 1)
  - [x] Subtask 1.1: 在 `packages/shared/src/types/collection.ts` 中定义 `CollectionType` 类型
  - [x] Subtask 1.2: 类型值为：`'网页' | '代码' | '音频' | '视频' | '笔记' | '文件'`
  - [x] Subtask 1.3: 导出 `CollectionType` 类型

- [x] Task 2: 扩展 Collection 类型 (AC: 1)
  - [x] Subtask 2.1: 将 `url` 字段改为可选（`url?: string`）
  - [x] Subtask 2.2: 添加 `type: CollectionType` 字段
  - [x] Subtask 2.3: 更新类型注释以反映新的字段

- [x] Task 3: 更新类型导出 (AC: 1)
  - [x] Subtask 3.1: 在 `packages/shared/src/types/index.ts` 中导出 `CollectionType`
  - [x] Subtask 3.2: 确保所有使用 Collection 类型的地方都能访问新类型（修复了使用 url 字段的代码）

- [x] Task 4: 验证类型定义 (AC: 1)
  - [x] Subtask 4.1: 运行 TypeScript 编译检查（通过）
  - [x] Subtask 4.2: 确保没有类型错误（修复了所有相关代码）
  - [x] Subtask 4.3: 验证类型导出正确（已导出）

## Dev Notes

### 技术要点

1. **类型定义位置**: `packages/shared/src/types/collection.ts`
2. **类型导出**: 需要在 `packages/shared/src/types/index.ts` 中导出
3. **向后兼容**: `url` 字段改为可选，需要确保现有代码能处理可选值
4. **类型安全**: 使用 TypeScript 字面量类型确保类型安全

### 项目结构

- 类型定义: `packages/shared/src/types/collection.ts`
- 类型导出: `packages/shared/src/types/index.ts`

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-1.3]
- [Source: packages/shared/src/types/collection.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- ✅ 定义了 `CollectionType` 类型：`'网页' | '代码' | '音频' | '视频' | '笔记' | '文件'`
- ✅ 将 `Collection` 类型的 `url` 字段改为可选（`url?: string`）
- ✅ 将 `Collection` 类型的 `type` 字段改为必需（`type: CollectionType`），默认值为 `'网页'`
- ✅ 更新了 `CollectionListItem` 类型，`url` 字段改为可选，添加了 `type` 字段
- ✅ 更新了 `CreateCollectionInput` 类型，添加了可选的 `type` 字段
- ✅ 在 `packages/shared/src/types/index.ts` 中导出了 `CollectionType` 类型
- ✅ 修复了所有使用 `url` 字段的代码，处理 `url` 可能为 `undefined` 的情况：
  - `ArticleReader.tsx`: 添加了 `url` 存在性检查
  - `ArticleListItem.tsx`: 添加了 `url` 存在性检查，显示 type 字段
  - `article-list/index.tsx`: 修复了搜索过滤逻辑，处理 `url` 可能为 `undefined`
- ✅ TypeScript 编译检查通过，没有类型错误

### File List

- `packages/shared/src/types/collection.ts` - 修改：定义 `CollectionType` 类型，扩展 `Collection` 和 `CollectionListItem` 类型
- `packages/shared/src/types/index.ts` - 修改：导出 `CollectionType` 类型
- `apps/desktop/src/components/ArticleReader.tsx` - 修改：处理 `url` 可选的情况
- `apps/desktop/src/components/article-list/ArticleListItem.tsx` - 修改：处理 `url` 可选的情况，显示 type 字段
- `apps/desktop/src/components/article-list/index.tsx` - 修改：修复搜索过滤逻辑

### Change Log

- 2025-01-27: 实现 Story 1.3 - 类型定义扩展
  - 定义了 `CollectionType` 类型：`'网页' | '代码' | '音频' | '视频' | '笔记' | '文件'`
  - 将 `Collection` 类型的 `url` 字段改为可选（`url?: string`）
  - 将 `Collection` 类型的 `type` 字段改为必需（`type: CollectionType`）
  - 更新了 `CollectionListItem` 和 `CreateCollectionInput` 类型
  - 在类型导出文件中导出了 `CollectionType` 类型
  - 修复了所有使用 `url` 字段的代码，处理 `url` 可能为 `undefined` 的情况
  - TypeScript 编译检查通过
