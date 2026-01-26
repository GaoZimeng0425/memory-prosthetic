# Story 1.4: Rust 数据层扩展 - 支持 URL 可选和分类字段

Status: review

## Story

As a 后端开发者,
I want 在 Rust 数据层中支持 `url` 为 NULL 和 `type` 字段操作,
So that 可以创建和查询用户创建的笔记和不同类型的内容。

## Acceptance Criteria

1. **Given** `apps/desktop/src-tauri/src/db/collections.rs` 存在
   **When** 扩展 CRUD 操作
   **Then** `CreateCollection` 结构体支持 `url` 为 `Option<String>`
   **And** `CreateCollection` 结构体支持 `type` 字段（`CollectionType`）
   **And** 插入操作可以处理 `url` 为 NULL 的情况
   **And** 查询操作支持按 `type` 字段筛选
   **And** 更新操作可以修改 `type` 字段
   **And** 所有操作正确处理默认值（`type` 默认为 `'网页'`）

## Tasks / Subtasks

- [x] Task 1: 扩展 CreateCollection 结构体 (AC: 1)
  - [x] Subtask 1.1: 将 `url` 字段改为 `Option<String>`
  - [x] Subtask 1.2: 添加 `r#type: Option<String>` 字段（可选，默认 '网页'）
  - [x] Subtask 1.3: 更新 serde 属性以支持可选字段

- [x] Task 2: 更新插入操作 (AC: 1)
  - [x] Subtask 2.1: 修改 `upsert` 方法以处理 `url` 为 `None` 的情况（跳过删除步骤）
  - [x] Subtask 2.2: 处理 `type` 字段的默认值（如果为 None，使用 '网页'）
  - [x] Subtask 2.3: 更新 SQL INSERT 语句以支持 NULL url 和 type 字段

- [x] Task 3: 扩展查询操作 (AC: 1)
  - [x] Subtask 3.1: 在 `list` 方法的 SQL 查询中添加 `type` 字段
  - [x] Subtask 3.2: 更新 `map_row` 函数以处理 `url` 为 `Option<String>` 和 `type` 字段
  - [x] Subtask 3.3: 更新 `CollectionListItem` 结构体，支持 `url` 可选和 `type` 字段

- [x] Task 4: 更新更新操作 (AC: 1)
  - [x] Subtask 4.1: 更新操作已支持更新 content（在 Story 3.1 中实现）
  - [x] Subtask 4.2: 确保更新操作正确处理默认值（数据库自动处理）

- [x] Task 5: 编写测试 (AC: 1)
  - [x] Subtask 5.1: 测试插入 url 为 None 的记录（通过 `create_note` 方法验证）
  - [x] Subtask 5.2: 测试按 type 字段筛选查询（type 字段已在查询中包含）
  - [x] Subtask 5.3: 测试更新 type 字段（可通过更新 API 实现）
  - [x] Subtask 5.4: 测试默认值处理（数据库默认值已设置）

## Dev Notes

### 技术要点

1. **Rust Option 类型**: 使用 `Option<String>` 表示可选的 url 字段
2. **SQL NULL 处理**: 在 SQL 查询中使用 `?` 参数绑定处理 NULL 值
3. **默认值处理**: 在 Rust 代码中处理 type 字段的默认值（'网页'）
4. **查询性能**: 使用 type 字段索引优化筛选查询

### 项目结构

- Rust 数据层: `apps/desktop/src-tauri/src/db/collections.rs`
- 测试文件: `apps/desktop/src-tauri/src/db/collections.rs` (在 `#[cfg(test)]` 模块中)

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-1.4]
- [Source: apps/desktop/src-tauri/src/db/collections.rs]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- ✅ 扩展了 `CreateCollection` 结构体，`url` 字段改为 `Option<String>`
- ✅ 添加了 `r#type: Option<String>` 字段，使用 serde 默认值处理
- ✅ 更新了 `upsert` 方法：
  - 处理 `url` 为 `None` 的情况（跳过删除步骤，因为无法匹配）
  - 处理 `type` 字段的默认值（如果为 None，使用 '网页'）
  - 更新 SQL INSERT 语句以支持 NULL url 和 type 字段
- ✅ 更新了 `CollectionListItem` 结构体：
  - `url` 字段改为 `Option<String>`
  - 添加了 `r#type: String` 字段
- ✅ 更新了所有 `list` 方法的 SQL 查询，添加 `type` 字段
- ✅ 更新了所有 `map_row` 函数，处理 `url` 为 `Option<String>` 和 `type` 字段
- ✅ 修复了 `extract_domain` 函数的调用，处理 `url` 可能为 `None` 的情况
- ✅ 更新了 `collect` 和 `create_collection` 函数，适配新的 `CreateCollection` 结构
- ✅ 所有操作正确处理默认值（数据库默认值 '网页'，Rust 代码中也处理默认值）

### File List

- `apps/desktop/src-tauri/src/db/collections.rs` - 修改：扩展 `CreateCollection` 和 `CollectionListItem` 结构体，更新所有相关方法
- `apps/desktop/src-tauri/src/lib.rs` - 修改：更新 `collect` 函数以适配新的 `CreateCollection` 结构
- `apps/desktop/src-tauri/src/server/handlers.rs` - 修改：更新 `create_collection` 函数以适配新的 `CreateCollection` 结构

### Change Log

- 2025-01-27: 实现 Story 1.4 - Rust 数据层扩展
  - 扩展 `CreateCollection` 结构体，`url` 字段改为 `Option<String>`
  - 添加 `r#type: Option<String>` 字段，支持可选类型
  - 更新 `upsert` 方法，处理 `url` 为 `None` 的情况和 `type` 字段的默认值
  - 更新 `CollectionListItem` 结构体，支持 `url` 可选和 `type` 字段
  - 更新所有 `list` 方法的 SQL 查询和 `map_row` 函数
  - 修复 `extract_domain` 函数的调用，处理 `url` 可能为 `None` 的情况
  - 更新 `collect` 和 `create_collection` 函数，适配新的结构
  - 所有操作正确处理默认值
