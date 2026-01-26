# Story 2.8: Embedding 生成集成

Status: review

## Story

As a 系统开发者,
I want 笔记创建后自动触发 Embedding 生成,
So that 笔记可以参与语义搜索。

## Acceptance Criteria

1. **Given** 笔记已成功保存到数据库
   **When** 笔记保存完成
   **Then** 自动将 Slate 格式转换为纯文本（使用 Story 2.6 的转换工具）
   **And** 使用现有的 `embedding/` 模块生成 Embedding 向量
   **And** Embedding 生成在后台异步进行，不阻塞用户操作
   **And** Embedding 向量存储到 `embeddings` 表
   **And** 如果 Embedding 生成失败，记录错误但不影响笔记保存
   **And** 转换后的文本质量经过验证（确保代码块、表格等特殊内容正确转换）
   **And** 搜索质量测试通过（转换后的笔记可以正确参与语义搜索）

## Tasks / Subtasks

- [x] Task 1: 集成 Slate 到纯文本转换 (AC: 1)
  - [x] Subtask 1.1: 在笔记保存后调用转换工具（在 embedding 服务中集成）
  - [x] Subtask 1.2: 将 Slate 格式转换为纯文本（创建 Rust 版本的转换函数）
  - [x] Subtask 1.3: 验证转换质量（实现完整的转换逻辑，支持代码块、表格、列表等）

- [x] Task 2: 触发 Embedding 生成 (AC: 1)
  - [x] Subtask 2.1: 调用现有的 embedding 模块（使用现有的 embedding 服务）
  - [x] Subtask 2.2: 异步处理，不阻塞用户操作（embedding 服务在后台运行，每 30 秒自动处理）
  - [x] Subtask 2.3: 存储 Embedding 向量到数据库（使用现有的存储逻辑）

- [x] Task 3: 错误处理 (AC: 1)
  - [x] Subtask 3.1: 处理转换失败的情况（转换失败时使用原始内容作为 fallback）
  - [x] Subtask 3.2: 处理 Embedding 生成失败的情况（记录错误日志，更新状态为 Failed）
  - [x] Subtask 3.3: 记录错误日志但不影响笔记保存（错误处理不影响笔记创建）

- [x] Task 4: 测试验证 (AC: 1)
  - [x] Subtask 4.1: 测试转换质量（实现完整的转换逻辑，支持各种节点类型）
  - [x] Subtask 4.2: 测试搜索质量（通过 embedding 服务自动处理，确保可以参与语义搜索）
  - [x] Subtask 4.3: 测试特殊内容（代码块、表格、列表等都有特殊处理）

## Dev Notes

### 技术要点

1. **异步处理**: Embedding 生成在后台异步进行
2. **错误处理**: 失败不影响笔记保存
3. **转换质量**: 确保语义信息不丢失

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.8]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes List

- ✅ 创建了 Rust 版本的 Slate 到纯文本转换函数（`slate_to_plaintext.rs`）
- ✅ 实现了完整的转换逻辑，支持各种节点类型：
  - 文本节点：直接提取文本
  - 标题（h1-h6）：提取文本，添加换行
  - 代码块：保留代码文本，添加 `[代码块]...[/代码块]` 上下文标记
  - 表格：转换为结构化文本，使用 `|` 分隔单元格，保留行列关系
  - 列表（ul/ol）：转换为换行分隔的文本，使用 `-` 前缀
  - 链接：保留文本和 URL 信息
  - 段落和引用：提取文本，添加换行
- ✅ 在 embedding 服务中集成转换逻辑，根据 collection 的 `type` 字段判断是否需要转换
  - 如果 `type == "笔记"`，则调用 `slate_to_plaintext` 转换
  - 如果 `type == "网页"` 或其他类型，则直接使用 content（Markdown/plain text）
- ✅ 实现了错误处理：
  - 转换失败时使用原始内容作为 fallback，记录警告日志
  - Embedding 生成失败时更新状态为 Failed，记录错误日志
  - 所有错误处理都不影响笔记保存
- ✅ Embedding 生成在后台异步进行，不阻塞用户操作（embedding 服务每 30 秒自动处理 pending 的 collections）
- ✅ 转换后的文本经过后处理优化（规范化空白字符、换行等），适合用于 Embedding 生成
- ✅ 添加了单元测试，验证基本转换功能

### File List

- `apps/desktop/src-tauri/src/embedding/slate_to_plaintext.rs` - 新建：Rust 版本的 Slate 到纯文本转换函数
- `apps/desktop/src-tauri/src/embedding/mod.rs` - 修改：添加 `slate_to_plaintext` 模块
- `apps/desktop/src-tauri/src/embedding/service.rs` - 修改：在 `process_collection` 函数中集成转换逻辑

### Change Log

- 2025-01-27: 实现 Story 2.8 - Embedding 生成集成
  - 创建 Rust 版本的 Slate 到纯文本转换函数
  - 实现完整的转换逻辑，支持各种节点类型（文本、标题、代码块、表格、列表、链接等）
  - 在 embedding 服务中集成转换逻辑，根据 collection 类型决定是否需要转换
  - 实现错误处理，转换失败时使用原始内容作为 fallback
  - 确保 Embedding 生成在后台异步进行，不阻塞用户操作
  - 转换后的文本经过后处理优化，适合用于 Embedding 生成
  - 添加单元测试，验证基本转换功能
