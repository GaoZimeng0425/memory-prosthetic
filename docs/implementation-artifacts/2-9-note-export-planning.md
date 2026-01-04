# Story 2.9: 笔记导出功能规划

Status: review

## Story

As a 系统开发者,
I want 规划笔记导出功能的架构,
So that 未来可以实现笔记导出而不需要重构。

## Acceptance Criteria

1. **Given** 笔记内容以 Slate JSON 格式存储
   **When** 规划导出功能架构
   **Then** 设计导出格式（Markdown、HTML、PDF 等）
   **And** 确保 Slate → Markdown 转换工具可扩展用于导出
   **And** 设计导出 API 接口（为未来实现预留）
   **And** 文档化导出功能的实现路径
   **And** 考虑批量导出和单个导出两种场景

## Tasks / Subtasks

- [x] Task 1: 设计导出格式 (AC: 1)
  - [x] Subtask 1.1: 分析导出格式需求（Markdown、HTML、PDF、纯文本）
  - [x] Subtask 1.2: 设计每种格式的转换策略（复用现有工具或创建新工具）
  - [x] Subtask 1.3: 文档化格式设计（在架构设计文档中详细说明）

- [x] Task 2: 设计 API 接口 (AC: 1)
  - [x] Subtask 2.1: 设计单个笔记导出 API（Tauri Command 和 HTTP API）
  - [x] Subtask 2.2: 设计批量导出 API（支持 ZIP 打包）
  - [x] Subtask 2.3: 文档化 API 接口设计（包含请求/响应格式）

- [x] Task 3: 文档化实现路径 (AC: 1)
  - [x] Subtask 3.1: 编写导出功能实现文档（分三个阶段实现）
  - [x] Subtask 3.2: 说明如何扩展转换工具（插件模式和模板支持）
  - [x] Subtask 3.3: 提供实现示例（代码示例和参考实现）

## Dev Notes

### 技术要点

1. **架构规划**: 这是规划故事，不涉及实际实现
2. **可扩展性**: 确保设计支持未来扩展
3. **文档化**: 详细文档化实现路径

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.9]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 完成了导出格式设计，支持 Markdown、HTML、PDF、纯文本四种格式
- ✅ 设计了每种格式的转换策略：
  - Markdown: 复用 Story 2.5 的 `slateToMarkdown` 工具
  - HTML: 使用 Plate.js 的 `serializeHtml` 函数
  - PDF: 优先使用 HTML → PDF 方案（通过 Puppeteer/Playwright）
  - 纯文本: 复用 Story 2.6 的 `slateToPlainText` 工具
- ✅ 设计了单个笔记导出 API（Tauri Command 和 HTTP API）
- ✅ 设计了批量导出 API（支持 ZIP 打包）
- ✅ 文档化了完整的实现路径，分为三个阶段：
  - Phase 1: 基础导出功能（单个笔记，Markdown 格式）
  - Phase 2: 扩展导出格式（HTML、PDF）
  - Phase 3: 批量导出功能
- ✅ 考虑了扩展性（自定义导出格式、导出模板、导出选项）
- ✅ 提供了测试策略（单元测试、集成测试、端到端测试）
- ✅ 参考了现有实现（编辑器导出功能、转换工具等）

### File List

- `docs/implementation-artifacts/2-9-note-export-architecture.md` - 新建：笔记导出功能架构设计文档

### Change Log

- 2025-01-27: 实现 Story 2.9 - 笔记导出功能规划
  - 完成导出格式设计（Markdown、HTML、PDF、纯文本）
  - 设计单个笔记导出 API 和批量导出 API
  - 文档化完整的实现路径（分三个阶段）
  - 考虑扩展性（插件模式、模板支持、导出选项）
  - 提供测试策略和参考实现
  - 创建详细的架构设计文档
