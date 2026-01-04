# Markdown 统一后的文件清理建议

## 文件使用情况分析

### ✅ 需要保留

1. **`markdown-storage.ts`**
   - `isMarkdownFormat()` - 在 `NoteEditorView.tsx` 中被使用 ✅
   - `serializeEditorToMarkdown()` - 目前未使用，但作为工具函数可保留
   - `deserializeMarkdownToEditor()` - 目前未使用，但作为工具函数可保留
   - **建议**: 保留整个文件，但可以考虑简化（移除未使用的函数，或保留作为工具函数）

### ❌ 可以删除

1. **`slate-to-markdown.ts`**
   - 只在 `slate-to-plaintext.ts` 中被使用
   - 现在内容已经是 Markdown，不再需要从 Slate 转换
   - **建议**: 删除

2. **`slate-to-plaintext.ts`**
   - 没有找到任何地方在使用
   - 现在内容已经是 Markdown，Embedding 生成使用 Rust 的 `markdown_to_plaintext`
   - **建议**: 删除

3. **`markdown-joiner-transform.ts`**
   - 没有找到任何地方在使用
   - 这是用于 AI 流式输出的工具，但目前代码中没有使用
   - **建议**: 删除（如果将来需要 AI 流式输出功能，可以重新添加）

## 清理步骤

1. 删除 `slate-to-markdown.ts`
2. 删除 `slate-to-plaintext.ts`
3. 删除 `markdown-joiner-transform.ts`
4. 保留 `markdown-storage.ts`（至少保留 `isMarkdownFormat` 函数）

## 注意事项

- 删除前确保没有其他地方间接使用这些文件
- `markdown-storage.ts` 中的 `serializeEditorToMarkdown` 和 `deserializeMarkdownToEditor` 虽然目前未使用，但它们是合理的工具函数，可以考虑保留以备将来使用
