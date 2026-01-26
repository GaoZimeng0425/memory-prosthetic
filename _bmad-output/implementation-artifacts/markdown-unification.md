# Markdown 格式统一实现

## 概述

将笔记内容存储格式从 Slate JSON 统一为 Markdown，与网页内容保持一致。

## 实现日期

2025-01-27

## 变更内容

### 1. 前端组件修改

#### NoteEditor 组件 (`packages/editor/src/components/note-editor.tsx`)
- ✅ 支持通过 `markdown` prop 加载 Markdown 内容
- ✅ 通过 `onMarkdownChange` 回调提供 Markdown 格式的内容
- ✅ 使用 Plate.js 的 MarkdownPlugin API 进行序列化/反序列化

#### NoteEditorPage (`apps/desktop/src/components/pages/NoteEditorPage.tsx`)
- ✅ 保存时使用 Markdown 格式（通过 `onMarkdownChange` 获取）
- ✅ 移除了 `serializeSlateValue` 的使用

#### NoteEditorView (`apps/desktop/src/components/features/NoteEditorView.tsx`)
- ✅ 加载时直接使用 Markdown 内容（通过 `markdown` prop）
- ✅ 保存时使用 Markdown 格式
- ✅ 显示时直接使用 Markdown（无需转换）

### 2. 后端修改

#### Embedding 生成 (`apps/desktop/src-tauri/src/embedding/service.rs`)
- ✅ 添加 `is_markdown_format()` 函数检测内容格式
- ✅ 统一处理：Markdown 使用 `markdown_to_plaintext`，Slate JSON 使用 `slate_to_plaintext`（向后兼容）

#### Markdown 转纯文本 (`apps/desktop/src-tauri/src/embedding/markdown_to_plaintext.rs`)
- ✅ 新增 `markdown_to_plaintext()` 函数
- ✅ 移除 Markdown 格式标记，保留文本内容
- ✅ 处理代码块、链接、图片、标题、列表等常见 Markdown 元素

### 3. 数据迁移

#### 迁移脚本 (`apps/desktop/src-tauri/src/db/migrations/migrate_notes_to_markdown.rs`)
- ✅ 自动检测 Slate JSON 格式的笔记
- ✅ 将 Slate JSON 转换为 Markdown
- ✅ 幂等性：可以安全地多次运行
- ✅ 在数据库初始化时自动执行

#### 迁移集成 (`apps/desktop/src-tauri/src/db/connection.rs`)
- ✅ 在 `migrate()` 函数中调用笔记迁移
- ✅ 迁移失败不会阻止数据库初始化

### 4. 工具函数

#### Markdown 存储工具 (`packages/editor/src/utils/markdown-storage.ts`)
- ✅ `serializeEditorToMarkdown()` - 将编辑器内容序列化为 Markdown
- ✅ `deserializeMarkdownToEditor()` - 将 Markdown 反序列化为编辑器内容
- ✅ `isMarkdownFormat()` - 检测内容是否为 Markdown 格式

## 优势

1. **格式统一**：笔记和网页内容都使用 Markdown，简化存储逻辑
2. **易于处理**：Markdown 是文本格式，搜索、预览、导出更简单
3. **兼容性好**：Markdown 是通用格式，易于与其他工具集成
4. **向后兼容**：迁移脚本自动处理现有数据，支持 Slate JSON 格式的旧笔记

## 数据迁移

- 迁移脚本会在数据库初始化时自动运行
- 只迁移 Slate JSON 格式的笔记（通过格式检测）
- 已经是 Markdown 格式的内容会被跳过
- 迁移是幂等的，可以安全地多次运行

## 测试建议

1. 创建新笔记，验证保存为 Markdown 格式
2. 编辑现有笔记，验证加载和保存正常
3. 验证 Embedding 生成正常工作
4. 验证搜索功能正常工作
5. 验证数据迁移脚本正确转换旧笔记

## 相关文件

### 新增文件
- `packages/editor/src/utils/markdown-storage.ts`
- `apps/desktop/src-tauri/src/embedding/markdown_to_plaintext.rs`
- `apps/desktop/src-tauri/src/db/migrations/migrate_notes_to_markdown.rs`
- `apps/desktop/src-tauri/src/db/migrations/mod.rs`

### 修改文件
- `packages/editor/src/components/note-editor.tsx`
- `apps/desktop/src/components/pages/NoteEditorPage.tsx`
- `apps/desktop/src/components/features/NoteEditorView.tsx`
- `apps/desktop/src-tauri/src/embedding/service.rs`
- `apps/desktop/src-tauri/src/embedding/mod.rs`
- `apps/desktop/src-tauri/src/db/connection.rs`
- `apps/desktop/src-tauri/src/db/mod.rs`
- `apps/desktop/src-tauri/Cargo.toml` (添加 regex 依赖)

## 注意事项

1. **迁移时机**：迁移在数据库初始化时自动执行，首次运行可能需要一些时间
2. **格式检测**：使用启发式方法检测内容格式，对于边界情况可能需要手动处理
3. **转换精度**：Slate JSON 到 Markdown 的转换可能无法完全保留所有格式细节，但核心内容会保留
4. **向后兼容**：系统仍然支持读取 Slate JSON 格式（用于旧数据），但新数据统一使用 Markdown
