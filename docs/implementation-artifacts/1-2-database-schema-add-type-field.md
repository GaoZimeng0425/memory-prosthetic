# Story 1.2: 数据库 Schema 扩展 - 添加分类字段

Status: review

## Story

As a 系统开发者,
I want 在 `collections` 表中添加 `type` 字段,
So that 系统可以区分不同类型的内容（网页、代码、音频、视频、笔记、文件）。

## Acceptance Criteria

1. **Given** `collections` 表存在
   **When** 执行数据库迁移脚本
   **Then** 迁移前自动创建数据备份（如果 Story 1.1 已执行，复用备份或创建增量备份）
   **And** 添加 `type` 字段（TEXT NOT NULL DEFAULT '网页'）
   **And** 为 `type` 字段创建索引以优化查询性能
   **And** 现有所有记录的 `type` 字段自动设置为 `'网页'`
   **And** 迁移脚本可以安全地重复执行（幂等性）
   **And** 如果迁移失败，提供回滚方案（从备份恢复）
   **And** 迁移过程记录详细日志，便于问题排查

## Tasks / Subtasks

- [x] Task 1: 实现 type 字段迁移逻辑 (AC: 1)
  - [x] Subtask 1.1: 检查 type 字段是否已存在（幂等性检查）
  - [x] Subtask 1.2: 如果不存在，使用 ALTER TABLE 添加 type 字段（TEXT NOT NULL DEFAULT '网页'）
  - [x] Subtask 1.3: 为现有所有记录设置 type = '网页'
  - [x] Subtask 1.4: 创建 type 字段索引
  - [x] Subtask 1.5: 记录详细迁移日志

- [x] Task 2: 集成迁移到 migrate() 方法 (AC: 1)
  - [x] Subtask 2.1: 在 `migrate()` 方法中调用 type 字段迁移
  - [x] Subtask 2.2: 迁移前创建备份（复用 Story 1.1 的备份机制）
  - [x] Subtask 2.3: 确保迁移在 URL 字段迁移之后执行

- [x] Task 3: 编写测试 (AC: 1)
  - [x] Subtask 3.1: 测试新数据库添加 type 字段
  - [x] Subtask 3.2: 测试已有数据的迁移（所有记录设置为 '网页'）
  - [x] Subtask 3.3: 测试幂等性（重复执行迁移）
  - [x] Subtask 3.4: 测试 type 字段索引创建
  - [x] Subtask 3.5: 测试插入新记录时 type 字段默认值

## Dev Notes

### 技术要点

1. **SQLite ALTER TABLE**: SQLite 支持 `ALTER TABLE ADD COLUMN`，可以直接添加带默认值的列
2. **默认值处理**: 使用 `DEFAULT '网页'` 确保新记录自动设置默认值
3. **现有数据**: 需要显式更新现有记录的 type 字段为 '网页'
4. **索引创建**: 为 type 字段创建索引以优化按类型筛选的查询性能
5. **幂等性**: 检查列是否已存在，如果存在则跳过迁移

### 项目结构

- 数据库迁移代码: `apps/desktop/src-tauri/src/db/connection.rs`
- 测试文件: `apps/desktop/src-tauri/src/db/connection.rs` (在 `#[cfg(test)]` 模块中)

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-1.2]
- [Source: apps/desktop/src-tauri/src/db/connection.rs#migrate]
- SQLite ALTER TABLE 文档: <https://www.sqlite.org/lang_altertable.html>

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- ✅ 实现了 type 字段迁移逻辑，使用 ALTER TABLE ADD COLUMN 添加字段
- ✅ 迁移是幂等的，会检查字段是否已存在
- ✅ 为现有所有记录设置 type = '网页'
- ✅ 创建了 type 字段索引以优化查询性能
- ✅ 更新了 Collection 结构体以包含 type 字段
- ✅ 更新了所有相关查询以包含 type 字段
- ✅ 迁移前自动创建备份（复用 Story 1.1 的备份机制）
- ✅ 所有测试通过（5 个测试）

### File List

- `apps/desktop/src-tauri/src/db/connection.rs` - 添加了 type 字段迁移逻辑
- `apps/desktop/src-tauri/src/db/collections.rs` - 更新了 Collection 结构体和查询

### Change Log

- 2025-01-27: 实现 Story 1.2 - 数据库 Schema 扩展，添加 type 字段
  - 实现 `migrate_add_type_field()` 方法，添加 type 字段（TEXT NOT NULL DEFAULT '网页'）
  - 在 `migrate()` 方法中集成 type 字段迁移，迁移前自动创建备份
  - 更新 Collection 结构体以包含 type 字段
  - 更新所有 SELECT 查询以包含 type 字段
  - 更新 row_to_collection 函数以处理 type 字段
  - 更新初始 CREATE TABLE 语句以包含 type 字段（新数据库）
  - 更新 URL 字段迁移中的表创建以包含 type 字段
  - 添加完整的测试套件，验证迁移、幂等性、索引和默认值
