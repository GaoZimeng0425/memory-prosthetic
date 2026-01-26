# Story 2.2: Plate.js 编辑器集成

Status: review

## Story

As a 用户,
I want 在笔记创建界面中使用 Plate.js 富文本编辑器,
So that 我可以输入和格式化文本内容（标题、粗体、斜体、列表、代码块、表格等）。

## Acceptance Criteria

1. **Given** 用户在笔记创建界面
   **When** 查看编辑器
   **Then** 编辑器采用延迟加载策略（仅在需要时加载，不影响主界面 300ms 唤起）
   **And** 显示 Plate.js 富文本编辑器（使用 `@memory-prosthetic/editor` 包中的 `PlateEditor` 组件）
   **And** 编辑器支持基本的格式化功能（标题、粗体、斜体、列表、代码块、表格、链接等）
   **And** 编辑器提供格式化工具栏
   **And** 编辑器支持键盘快捷键（如 Cmd+B 粗体、Cmd+I 斜体等）
   **And** 提供快捷键帮助提示（可通过 Cmd+? 或工具栏中的帮助按钮访问）
   **And** 首次使用时显示编辑器功能提示（可选，可通过设置关闭）
   **And** 编辑器界面遵循现有的 UX 设计规范
   **And** 编辑器加载时间不影响主界面性能（主界面保持 300ms 唤起响应）

## Tasks / Subtasks

- [x] Task 1: 集成 PlateEditor 组件 (AC: 1)
  - [x] Subtask 1.1: 检查 `@memory-prosthetic/editor` 包中的 `PlateEditor` 组件
  - [x] Subtask 1.2: 在笔记创建界面中引入 PlateEditor 组件
  - [x] Subtask 1.3: 配置编辑器基本设置

- [x] Task 2: 实现延迟加载策略 (AC: 1)
  - [x] Subtask 2.1: 使用 React.lazy 或动态导入延迟加载编辑器
  - [x] Subtask 2.2: 确保主界面 300ms 唤起不受影响
  - [x] Subtask 2.3: 显示加载状态

- [x] Task 3: 配置编辑器功能 (AC: 1)
  - [x] Subtask 3.1: 启用基本格式化功能（标题、粗体、斜体、列表、代码块、表格、链接）
  - [x] Subtask 3.2: 配置格式化工具栏
  - [x] Subtask 3.3: 配置键盘快捷键支持

- [x] Task 4: 实现帮助功能 (AC: 1)
  - [x] Subtask 4.1: 实现快捷键帮助提示（Cmd+?）
  - [x] Subtask 4.2: 在工具栏中添加帮助按钮
  - [x] Subtask 4.3: 实现首次使用提示（可选）

- [x] Task 5: 样式和 UX 集成 (AC: 1)
  - [x] Subtask 5.1: 确保编辑器样式遵循现有 UX 设计规范
  - [x] Subtask 5.2: 响应式设计适配
  - [x] Subtask 5.3: 性能测试（确保主界面性能不受影响）

## Dev Notes

### 技术要点

1. **Plate.js 编辑器**: 使用 `@memory-prosthetic/editor` 包中的组件
2. **延迟加载**: 使用 React.lazy 或动态导入避免影响主界面性能
3. **性能要求**: 主界面保持 300ms 唤起响应
4. **快捷键支持**: Plate.js 内置快捷键支持，需要配置

### 项目结构

- 编辑器包: `packages/editor/` (如果存在)
- 笔记创建组件: `apps/desktop/src/components/features/notes/` 或类似路径
- 路由: `apps/desktop/src/routes/`

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.2]
- Plate.js 文档: <https://platejs.org/>

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- ✅ 创建了 NoteEditor 组件，封装 PlateEditor 并支持受控的 value 和 onChange
- ✅ 使用 React.lazy 实现编辑器的延迟加载，避免阻塞主界面
- ✅ 添加了 Suspense 和加载状态显示
- ✅ 编辑器使用完整的 EditorKit，包含所有基本格式化功能（标题、粗体、斜体、列表、代码块、表格、链接等）
- ✅ 编辑器自动显示固定工具栏（FixedToolbar）和浮动工具栏（FloatingToolbar）
- ✅ Plate.js 内置键盘快捷键支持（Cmd+B 粗体、Cmd+I 斜体等）
- ✅ 实现了 Cmd+? 快捷键打开帮助对话框
- ✅ 在页面头部添加了帮助按钮
- ✅ 创建了 EditorShortcutsHelp 组件显示快捷键列表
- ✅ 创建了 EditorFirstTimeTip 组件显示首次使用提示
- ✅ 编辑器样式遵循现有 UX 设计规范，使用 shadcn/ui 组件
- ✅ 编辑器支持响应式设计，适配不同窗口大小
- ✅ 将 platejs 类型收束在 editor 包中，通过 `@memory-prosthetic/editor/types` 统一导出
- ✅ NoteEditor 组件移至 editor 包，所有 platejs 依赖收束在 editor 项目中

### File List

- `packages/editor/src/types.ts` - 新建：统一导出 platejs 类型，避免应用层直接依赖
- `packages/editor/src/components/note-editor.tsx` - 新建：受控的 PlateEditor 包装组件（在 editor 包中）
- `apps/desktop/src/components/features/EditorShortcutsHelp.tsx` - 新建：键盘快捷键帮助对话框
- `apps/desktop/src/components/features/EditorFirstTimeTip.tsx` - 新建：首次使用提示对话框
- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 修改：集成 PlateEditor，添加延迟加载和帮助功能

### Change Log

- 2025-01-27: 实现 Story 2.2 - Plate.js 编辑器集成
  - 创建受控的 NoteEditor 组件，支持 value 和 onChange
  - 使用 React.lazy 实现编辑器延迟加载，避免影响主界面性能
  - 集成完整的 EditorKit，支持所有基本格式化功能
  - 添加固定工具栏和浮动工具栏（通过 EditorKit 自动包含）
  - 实现 Cmd+? 快捷键和帮助按钮打开快捷键帮助对话框
  - 添加首次使用提示功能，帮助用户了解编辑器功能
  - 编辑器样式遵循现有 UX 设计规范，使用 TailwindCSS 和 shadcn/ui 组件
  - 将 platejs 类型收束在 editor 包中，创建 types.ts 统一导出类型
  - 将 NoteEditor 组件移至 editor 包，确保所有 platejs 依赖收束在 editor 项目中
