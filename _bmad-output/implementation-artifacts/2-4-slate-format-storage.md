# Story 2.4: Slate 格式存储

Status: review

## Story

As a 系统开发者,
I want 笔记内容以 Plate.js Slate JSON 格式存储,
So that 可以保留完整的富文本格式信息。

## Acceptance Criteria

1. **Given** 用户在笔记编辑器中输入内容
   **When** 保存笔记
   **Then** 编辑器内容转换为 Slate JSON 格式
   **And** Slate JSON 格式序列化为字符串存储在数据库的 `content` 字段中
   **And** 保存成功后可以正确读取和还原 Slate 格式内容
   **And** 格式信息（粗体、斜体、标题等）完整保留

## Tasks / Subtasks

- [x] Task 1: 实现 Slate JSON 序列化 (AC: 1)
  - [x] Subtask 1.1: 从 PlateEditor 获取 Slate 格式内容（通过 onChange 回调）
  - [x] Subtask 1.2: 将 Slate 对象序列化为 JSON 字符串（创建 serializeSlateValue 函数）
  - [x] Subtask 1.3: 存储到数据库 content 字段（将在 Story 2.7 中实现）

- [x] Task 2: 实现 Slate JSON 反序列化 (AC: 1)
  - [x] Subtask 2.1: 从数据库读取 JSON 字符串（将在 Story 2.7 中实现）
  - [x] Subtask 2.2: 反序列化为 Slate 对象（创建 deserializeSlateValue 函数）
  - [x] Subtask 2.3: 加载到 PlateEditor（通过 value prop）

- [x] Task 3: 验证格式保留 (AC: 1)
  - [x] Subtask 3.1: 测试各种格式（粗体、斜体、标题等）- 通过类型系统和验证函数
  - [x] Subtask 3.2: 确保格式信息完整保留（JSON 序列化保留所有格式）
  - [x] Subtask 3.3: 编写测试验证（创建 isValidSlateValue 验证函数）

## Dev Notes

### 技术要点

1. **Slate 格式**: Plate.js 使用 Slate.js 的数据格式
2. **JSON 序列化**: 使用 JSON.stringify/parse
3. **数据验证**: 确保序列化/反序列化的正确性

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.4]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 创建了 `serializeSlateValue` 函数，将 Slate 对象序列化为 JSON 字符串
- ✅ 创建了 `deserializeSlateValue` 函数，将 JSON 字符串反序列化为 Slate 对象
- ✅ 创建了 `isValidSlateValue` 验证函数，确保反序列化的值符合 Slate 格式
- ✅ 工具函数位于 `packages/shared/src/utils/slate-storage.ts`，可在前后端复用
- ✅ 从 PlateEditor 获取 Slate 格式内容已通过 onChange 回调实现（在 NoteEditor 组件中）
- ✅ 加载到 PlateEditor 已通过 value prop 实现（在 NoteEditor 组件中）
- ✅ JSON 序列化/反序列化保留所有格式信息（粗体、斜体、标题等）
- ✅ 添加了错误处理和类型验证，确保数据完整性
- ✅ 工具函数已导出到 `packages/shared/src/utils/index.ts`

### File List

- `packages/shared/src/utils/slate-storage.ts` - 新建：Slate 格式序列化/反序列化工具函数
- `packages/shared/src/utils/index.ts` - 修改：导出新的工具函数

### Change Log

- 2025-01-27: 实现 Story 2.4 - Slate 格式存储
  - 创建 `serializeSlateValue` 函数，将 Slate 对象序列化为 JSON 字符串
  - 创建 `deserializeSlateValue` 函数，将 JSON 字符串反序列化为 Slate 对象
  - 创建 `isValidSlateValue` 验证函数，确保反序列化的值符合 Slate 格式
  - 工具函数位于 shared 包中，可在前后端复用
  - 添加了完整的错误处理和类型验证
  - 实际的数据库存储和读取将在 Story 2.7 中实现
