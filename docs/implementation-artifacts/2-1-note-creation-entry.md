# Story 2.1: 笔记创建入口和基础界面

Status: review

## Story

As a 用户,
I want 在主界面或搜索界面中看到"新建笔记"按钮或快捷键,
So that 我可以快速创建新的笔记。

## Acceptance Criteria

1. **Given** 用户在桌面应用主界面
   **When** 查看界面
   **Then** 显示"新建笔记"按钮（按钮位置明显，易于发现）
   **And** 提供快捷键（如 Cmd+N），快捷键提示在按钮上或工具提示中显示
   **And** 点击按钮或快捷键后打开笔记创建界面
   **And** 从点击到界面完全加载的时间 < 3 秒
   **And** 界面遵循现有的 UX 设计规范
   **And** 首次使用时显示简短的创建流程提示（可选，可通过设置关闭）

## Tasks / Subtasks

- [x] Task 1: 添加"新建笔记"按钮 (AC: 1)
  - [x] Subtask 1.1: 在主界面或搜索界面添加"新建笔记"按钮
  - [x] Subtask 1.2: 按钮位置明显，易于发现
  - [x] Subtask 1.3: 按钮样式遵循现有 UX 设计规范

- [x] Task 2: 实现快捷键支持 (AC: 1)
  - [x] Subtask 2.1: 注册全局快捷键（如 Cmd+N）
  - [x] Subtask 2.2: 在按钮上或工具提示中显示快捷键提示
  - [x] Subtask 2.3: 快捷键触发打开笔记创建界面

- [x] Task 3: 创建笔记创建界面路由 (AC: 1)
  - [x] Subtask 3.1: 创建笔记创建页面组件
  - [x] Subtask 3.2: 添加路由配置
  - [x] Subtask 3.3: 确保界面加载时间 < 3 秒

- [x] Task 4: 实现首次使用提示 (AC: 1)
  - [x] Subtask 4.1: 检测首次使用
  - [x] Subtask 4.2: 显示简短的创建流程提示
  - [x] Subtask 4.3: 提供关闭选项（可通过设置关闭）

## Dev Notes

### 技术要点

1. **路由配置**: 使用现有的路由系统添加笔记创建页面
2. **快捷键注册**: 使用 Tauri 的全局快捷键 API
3. **性能要求**: 界面加载时间 < 3 秒
4. **UX 一致性**: 遵循现有的 UX 设计规范

### 项目结构

- 主界面组件: `apps/desktop/src/components/` 或相关页面组件
- 路由配置: `apps/desktop/src/routes/`
- 快捷键注册: `apps/desktop/src-tauri/src/lib.rs` 或相关文件

### 参考

- [Source: docs/planning-artifacts/epics-user-notes.md#Story-2.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

- ✅ 在 ArticleList 组件中添加了"新建笔记"按钮，位置在过滤输入框下方，按钮样式遵循现有 UX 设计规范
- ✅ 在 SearchOverlay 组件中添加了"新建笔记"按钮，位于搜索界面底部工具栏
- ✅ 实现了 Cmd+N 快捷键，在 RootLayout 中使用 useHotkey hook 注册
- ✅ 在按钮上显示了快捷键提示（⌘N）
- ✅ 创建了 `/note/new` 路由和 NoteEditorPage 组件
- ✅ 笔记创建页面包含标题输入框和内容输入区域（临时使用 Textarea，富文本编辑器将在 Story 2-2 中实现）
- ✅ 实现了首次使用提示功能，使用 localStorage 跟踪提示状态
- ✅ 首次使用提示显示创建笔记的三种方式（按钮、搜索界面、快捷键）
- ✅ 提供了"不再显示"和"知道了"选项来关闭提示

### File List

- `apps/desktop/src/components/article-list/index.tsx` - 添加了"新建笔记"按钮
- `apps/desktop/src/components/SearchOverlay.tsx` - 添加了"新建笔记"按钮
- `apps/desktop/src/routes/__root.tsx` - 添加了 Cmd+N 快捷键处理
- `apps/desktop/src/routes/note.new.tsx` - 创建了笔记创建路由
- `apps/desktop/src/components/pages/NoteEditorPage.tsx` - 创建了笔记编辑器页面组件
- `apps/desktop/src/components/features/NoteCreationTip.tsx` - 创建了首次使用提示组件

### Change Log

- 2025-01-27: 实现 Story 2.1 - 笔记创建入口和基础界面
  - 在主界面和搜索界面添加"新建笔记"按钮
  - 实现 Cmd+N 快捷键支持
  - 创建笔记创建页面路由和基础组件
  - 实现首次使用提示功能，帮助用户了解如何创建笔记
