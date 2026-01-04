# 笔记导出功能架构设计

## 概述

本文档规划了笔记导出功能的架构设计，为未来实现提供清晰的实现路径。笔记导出功能允许用户将笔记内容导出为多种格式（Markdown、HTML、PDF 等），支持单个导出和批量导出。

## 导出格式设计

### 1. Markdown 格式

**用途**: 通用文本格式，适合版本控制和跨平台使用

**转换策略**:

- 使用 Story 2.5 实现的 `slateToMarkdown` 工具函数
- 直接调用 `@memory-prosthetic/editor/utils/slate-to-markdown` 中的 `slateToMarkdown` 函数
- 输出标准 Markdown 格式，保留所有格式信息

**实现位置**: `packages/editor/src/utils/slate-to-markdown.ts`

**示例**:

```typescript
import { slateToMarkdown } from '@memory-prosthetic/editor/utils/slate-to-markdown'
import { deserializeSlateValue } from '@memory-prosthetic/shared/utils'

const markdown = slateToMarkdown(deserializeSlateValue(collection.content))
```

### 2. HTML 格式

**用途**: 保留完整格式和样式，适合在浏览器中查看或打印

**转换策略**:

- 使用 Plate.js 的 `serializeHtml` 函数
- 参考现有的 `ExportToolbarButton` 组件实现
- 包含完整的 HTML 文档结构（DOCTYPE、head、body）
- 嵌入必要的 CSS 样式（Tailwind、KaTeX 等）

**实现位置**:

- 转换函数: `packages/editor/src/utils/slate-to-html.ts` (新建)
- 参考实现: `packages/editor/src/components/ui/export-toolbar-button.tsx`

**示例**:

```typescript
import { createSlateEditor } from 'platejs'
import { serializeHtml } from 'platejs/static'
import { BaseEditorKit } from '@memory-prosthetic/editor/components/editor/editor-base-kit'
import { deserializeSlateValue } from '@memory-prosthetic/shared/utils'

const editor = createSlateEditor({
  plugins: BaseEditorKit,
  value: deserializeSlateValue(collection.content),
})

const html = await serializeHtml(editor, {
  editorComponent: EditorStatic,
})
```

### 3. PDF 格式

**用途**: 适合打印和文档归档

**转换策略**:

- 方案 A: 通过 HTML 转换（推荐）
  - 先将 Slate 转换为 HTML
  - 使用 `puppeteer` 或 `playwright` 将 HTML 渲染为 PDF
  - 优点: 保留完整格式和样式
  - 缺点: 需要浏览器环境（Tauri 应用中可以集成）
- 方案 B: 通过 Canvas 转换
  - 参考现有的 `ExportToolbarButton` 实现
  - 使用 `html2canvas` 将编辑器内容转换为 Canvas
  - 使用 `pdf-lib` 将 Canvas 转换为 PDF
  - 优点: 纯前端实现，无需后端
  - 缺点: 可能丢失部分格式

**实现位置**:

- 转换函数: `packages/editor/src/utils/slate-to-pdf.ts` (新建)
- 参考实现: `packages/editor/src/components/ui/export-toolbar-button.tsx`

### 4. 纯文本格式

**用途**: 用于 Embedding 生成和语义搜索（已实现）

**转换策略**:

- 使用 Story 2.6 实现的 `slateToPlainText` 工具函数
- 已在 embedding 服务中使用

**实现位置**: `packages/editor/src/utils/slate-to-plaintext.ts`

## API 接口设计

### 1. 单个笔记导出 API

#### Tauri Command: `export_note`

**请求参数**:

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportNoteRequest {
    pub collection_id: i64,
    pub format: ExportFormat, // "markdown" | "html" | "pdf" | "plaintext"
}
```

**响应**:

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportNoteResponse {
    pub content: String, // Base64 编码的文件内容或直接文本内容
    pub filename: String, // 建议的文件名，如 "note-title.md"
    pub mime_type: String, // MIME 类型，如 "text/markdown"
}
```

**实现位置**: `apps/desktop/src-tauri/src/lib.rs`

**HTTP API 端点**: `POST /api/notes/:id/export`

**请求体**:

```typescript
{
  format: 'markdown' | 'html' | 'pdf' | 'plaintext'
}
```

**响应**:

```typescript
{
  success: true,
  data: {
    content: string, // Base64 编码或直接文本
    filename: string,
    mimeType: string
  }
}
```

### 2. 批量导出 API

#### Tauri Command: `export_notes_batch`

**请求参数**:

```rust
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportNotesBatchRequest {
    pub collection_ids: Vec<i64>,
    pub format: ExportFormat,
    pub zip: bool, // 是否打包为 ZIP 文件
}
```

**响应**:

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportNotesBatchResponse {
    pub content: String, // Base64 编码的 ZIP 文件或单个文件内容
    pub filename: String,
    pub mime_type: String,
    pub count: usize,
}
```

**实现位置**: `apps/desktop/src-tauri/src/lib.rs`

**HTTP API 端点**: `POST /api/notes/export/batch`

**请求体**:

```typescript
{
  collectionIds: number[],
  format: 'markdown' | 'html' | 'pdf' | 'plaintext',
  zip?: boolean // 默认 true
}
```

### 3. 前端 API 封装

**实现位置**: `packages/shared/src/apis/collections.ts`

```typescript
export function createCollectionsApi(adapter: RequestAdapter) {
  const api = {
    // ... 现有方法

    /** Export a single note */
    exportNote: (id: number, format: ExportFormat) =>
      adapter.post<ExportNoteResponse>('/api/notes/export', { collectionId: id, format }),

    /** Export multiple notes */
    exportNotesBatch: (ids: number[], format: ExportFormat, zip?: boolean) =>
      adapter.post<ExportNotesBatchResponse>('/api/notes/export/batch', {
        collectionIds: ids,
        format,
        zip: zip ?? true,
      }),
  }
}
```

## 实现路径

### Phase 1: 基础导出功能（单个笔记，Markdown 格式）

1. **创建转换工具函数**
   - 复用 `slateToMarkdown` 函数（已实现）
   - 创建 `exportNoteToMarkdown` 工具函数
   - 位置: `packages/editor/src/utils/export-note.ts`

2. **实现 Tauri Command**
   - 添加 `export_note` 命令
   - 调用转换工具函数
   - 返回文件内容和元数据
   - 位置: `apps/desktop/src-tauri/src/lib.rs`

3. **实现前端 API**
   - 添加 `exportNote` 方法到 collections API
   - 位置: `packages/shared/src/apis/collections.ts`

4. **实现 UI 组件**
   - 在笔记详情页添加导出按钮
   - 支持选择导出格式
   - 触发下载
   - 位置: `apps/desktop/src/components/pages/NoteDetailPage.tsx` (未来创建)

### Phase 2: 扩展导出格式（HTML、PDF）

1. **HTML 导出**
   - 创建 `slateToHtml` 转换函数
   - 参考 `ExportToolbarButton` 实现
   - 位置: `packages/editor/src/utils/slate-to-html.ts`

2. **PDF 导出**
   - 创建 `slateToPdf` 转换函数
   - 选择转换策略（HTML → PDF 或 Canvas → PDF）
   - 位置: `packages/editor/src/utils/slate-to-pdf.ts`

3. **更新 API**
   - 扩展 `export_note` 命令支持所有格式
   - 更新前端 API 类型定义

### Phase 3: 批量导出功能

1. **实现批量转换**
   - 创建 `exportNotesBatch` 工具函数
   - 支持 ZIP 打包
   - 位置: `packages/editor/src/utils/export-notes-batch.ts`

2. **实现 Tauri Command**
   - 添加 `export_notes_batch` 命令
   - 位置: `apps/desktop/src-tauri/src/lib.rs`

3. **实现前端 API**
   - 添加 `exportNotesBatch` 方法
   - 位置: `packages/shared/src/apis/collections.ts`

4. **实现 UI 组件**
   - 在笔记列表页添加批量导出功能
   - 支持选择多个笔记
   - 位置: `apps/desktop/src/components/pages/ArticlesPage.tsx`

## 技术决策

### 1. 转换工具的位置

**决策**: 将转换工具放在 `packages/editor` 包中

**理由**:

- 转换工具依赖 Plate.js 和 Slate 相关库
- `packages/editor` 包已经包含了这些依赖
- 保持转换逻辑与编辑器逻辑的紧密耦合

### 2. PDF 转换策略

**决策**: 优先使用 HTML → PDF 方案（通过 Puppeteer/Playwright）

**理由**:

- 保留完整的格式和样式
- 更好的打印效果
- Tauri 应用可以集成浏览器引擎

**备选方案**: 如果 HTML → PDF 方案不可行，使用 Canvas → PDF 方案

### 3. 文件下载方式

**决策**: 使用 Tauri 的文件保存对话框

**理由**:

- 更好的用户体验
- 支持选择保存位置
- 跨平台兼容

**实现**:

```typescript
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

const filePath = await save({
  defaultPath: 'note.md',
  filters: [{
    name: 'Markdown',
    extensions: ['md']
  }]
})

if (filePath) {
  await writeTextFile(filePath, markdownContent)
}
```

## 扩展性考虑

### 1. 自定义导出格式

**设计**: 使用插件模式支持自定义导出格式

**实现**:

```typescript
interface ExportFormatPlugin {
  name: string
  extension: string
  mimeType: string
  convert: (value: Value) => Promise<string>
}

const exportFormats: ExportFormatPlugin[] = [
  { name: 'Markdown', extension: 'md', mimeType: 'text/markdown', convert: slateToMarkdown },
  { name: 'HTML', extension: 'html', mimeType: 'text/html', convert: slateToHtml },
  // ...
]
```

### 2. 导出模板

**设计**: 支持自定义导出模板（如自定义 HTML 模板）

**实现**: 在转换函数中接受模板参数

```typescript
const html = slateToHtml(value, {
  template: customHtmlTemplate,
  includeStyles: true,
  includeScripts: false,
})
```

### 3. 导出选项

**设计**: 支持导出选项（如是否包含元数据、是否压缩等）

**实现**: 在 API 请求中传递选项

```typescript
{
  format: 'markdown',
  options: {
    includeMetadata: true,
    includeTags: true,
    includeCreatedAt: true,
  }
}
```

## 测试策略

### 1. 单元测试

- 测试每个转换函数（Markdown、HTML、PDF）
- 测试各种 Slate 节点类型（文本、标题、代码块、表格等）
- 测试边界情况（空内容、特殊字符等）

### 2. 集成测试

- 测试完整的导出流程（从数据库读取 → 转换 → 下载）
- 测试批量导出功能
- 测试错误处理

### 3. 端到端测试

- 测试用户导出流程
- 测试不同格式的导出结果
- 验证导出文件的内容和格式

## 参考实现

### 现有实现

1. **编辑器导出功能**: `packages/editor/src/components/ui/export-toolbar-button.tsx`
   - 实现了 HTML、PDF、Image、Markdown 导出
   - 可以作为参考实现

2. **Slate 到 Markdown 转换**: `packages/editor/src/utils/slate-to-markdown.ts`
   - 已实现，可以直接使用

3. **Slate 到纯文本转换**: `packages/editor/src/utils/slate-to-plaintext.ts`
   - 已实现，用于 Embedding 生成

### 相关文档

- Story 2.5: Slate 到 Markdown 转换工具
- Story 2.6: Slate 到纯文本转换工具
- Plate.js 文档: <https://platejs.org/docs/serializing>

## 总结

本架构设计为笔记导出功能提供了清晰的实现路径：

1. **导出格式**: 支持 Markdown、HTML、PDF、纯文本
2. **API 设计**: 单个导出和批量导出 API
3. **实现路径**: 分三个阶段逐步实现
4. **扩展性**: 支持自定义格式和模板
5. **测试策略**: 完整的测试覆盖

该设计确保了：

- 代码复用（复用现有的转换工具）
- 可扩展性（支持未来添加新格式）
- 用户体验（支持单个和批量导出）
- 维护性（清晰的代码组织和文档）
