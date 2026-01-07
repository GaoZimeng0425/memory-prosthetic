# ChatInput @ 提及功能实现文档

## 实现概述

为 `packages/ai/src/components/message/input.tsx` 的 ChatInput 组件添加了 "@" 提及功能,用户可以通过输入 "@" 来快速引用知识库中的文章内容。

## 实现时间

2026-01-06

## 需求来源

用户需求:在 ChatInput 中增加图片中的特性,可以通过 "@" 来调用文章,并将文章内容插入到 AI 文本中。

参考图片显示的功能:
- 知识库选择器(Prime 前端项目、PRD 等)
- 文件选择器(PRD、metalpha-PRIME-1806 等)
- 输入框提示:"输入问题,将基于上方选中的知识库/文件回答"

## 主要改动

### 1. 文件修改

**packages/ai/src/components/message/input.tsx**
- 新增导入: Command, Popover, ScrollArea 等 UI 组件
- 新增接口: `MentionableItem`, `MentionGroup`
- 扩展 `ChatInputProps` 接口,添加 mention 相关 props
- 实现 @ 触发逻辑
- 实现文章选择和内容注入逻辑

**新增文件:**
- `packages/ai/src/components/message/index.ts` - 组件导出
- `packages/ai/src/components/message/chat-input-example.tsx` - 使用示例
- `packages/ai/src/components/message/README.md` - 功能文档

## 核心功能

### 1. @ 触发检测

```typescript
// 检测用户输入的 @ 符号
const textBeforeCursor = newValue.slice(0, cursorPos)
const lastAtIndex = textBeforeCursor.lastIndexOf('@')

// 验证 @ 前是否是空格或开头
const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
const isValidTrigger = charBeforeAt === ' ' || lastAtIndex === 0
```

### 2. 实时搜索过滤

```typescript
const filteredItems = mentionQuery
  ? mentionItems.filter(
      (item) =>
        item.title.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (item.content && item.content.toLowerCase().includes(mentionQuery.toLowerCase()))
    )
  : mentionItems
```

### 3. 内容注入

选择文章后:
- **输入框显示**: `@文章标题`
- **实际提交内容**:
  ```
  --- 引用文章: 文章标题 ---
  文章内容(最多500字符)...
  --- 引用结束 ---
  ```

### 4. 分组支持

支持两种数据结构:
- `mentionItems`: 扁平的文章列表
- `mentionGroups`: 按知识库/收藏夹分组的列表

## Props 接口

```typescript
interface ChatInputProps {
  // ... 原有 props

  // Mention 新增 props
  mentionItems?: MentionableItem[]
  mentionGroups?: MentionGroup[]
  onMentionSearch?: (query: string) => void
  enableMention?: boolean
}

export interface MentionableItem {
  id: number
  title: string
  content: string
  type?: string
  url?: string
  favoriteId?: number
}

export interface MentionGroup {
  id: number
  name: string
  items: MentionableItem[]
}
```

## 使用示例

### 基础用法

```tsx
<ChatInput
  value={message}
  onChange={setMessage}
  onSubmit={handleSubmit}
  enableMention={true}
  mentionItems={articles}
/>
```

### 使用分组

```tsx
<ChatInput
  value={message}
  onChange={setMessage}
  onSubmit={handleSubmit}
  enableMention={true}
  mentionGroups={[
    {
      id: 1,
      name: 'Prime 前端项目',
      items: [...],
    },
    {
      id: 2,
      name: 'PRD 需求文档',
      items: [...],
    },
  ]}
/>
```

### 集成到现有系统

```tsx
// 在 desktop app 中
function ChatPage() {
  const { collections } = useCollections({ status: 'active' })
  const { favorites } = useFavorites()

  // 转换数据格式
  const mentionGroups = favorites.map(fav => ({
    id: fav.id,
    name: fav.name,
    items: collections
      .filter(c => c.favoriteId === fav.id)
      .map(c => ({
        id: c.id,
        title: c.title,
        content: c.content, // 需要完整的 Collection 对象
        type: c.type,
        url: c.url,
        favoriteId: c.favoriteId,
      }))
  }))

  return (
    <ChatInput
      enableMention={true}
      mentionGroups={mentionGroups}
      {...otherProps}
    />
  )
}
```

## UI 展现

### Popover 菜单
- 位置: 输入框上方 (side="top")
- 宽度: 400px
- 内容: Command 组件实现搜索和列表

### 列表项
- 图标: FileText (文章) / Folder (分组)
- 标题: 粗体显示
- 类型: 次要文字显示 (网页、文档、笔记等)

### 交互
- 输入 "@" 自动弹出
- 继续输入实时过滤
- 点击或回车选择
- ESC 关闭菜单

## 技术细节

### 状态管理

```typescript
const [inputValue, setInputValue] = useState(value)
const [showMentionPopover, setShowMentionPopover] = useState(false)
const [mentionQuery, setMentionQuery] = useState('')
const [cursorPosition, setCursorPosition] = useState(0)
const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
```

### 依赖组件

来自 `@memory-prosthetic/ui`:
- Button
- Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty
- Input
- Popover, PopoverContent
- ScrollArea

图标来自 `lucide-react`:
- FileText
- Folder

## 兼容性

- ✅ 向后兼容: 如果不设置 `enableMention={true}`,组件行为与之前完全一致
- ✅ 可选功能: 所有 mention 相关 props 都是可选的
- ✅ 类型安全: 使用 TypeScript 提供完整类型支持

## 已知限制

1. **内容截断**: 引用的文章内容限制为 500 字符
2. **数据要求**: MentionableItem 需要包含完整的 content 字段
3. **性能**: 建议限制列表项数量在 100 条以内,或使用懒加载

## 后续优化建议

### 短期
- [ ] 添加加载状态显示
- [ ] 支持键盘上下导航选择
- [ ] 优化移动端体验

### 长期
- [ ] 支持多选文章
- [ ] 添加文章预览功能
- [ ] 支持自定义引用格式
- [ ] 添加最近使用列表
- [ ] 支持语义搜索集成

## 测试建议

### 单元测试
```typescript
describe('ChatInput with Mention', () => {
  it('should show mention popover when typing @', () => {})
  it('should filter items by query', () => {})
  it('should insert mention text on select', () => {})
  it('should close popover on ESC', () => {})
})
```

### 集成测试
- 测试与 useCollections hook 集成
- 测试与 AI 服务集成
- 测试分组数据展示

## 相关文件

- ✅ `packages/ai/src/components/message/input.tsx` - 主实现
- ✅ `packages/ai/src/components/message/chat-input-example.tsx` - 使用示例
- ✅ `packages/ai/src/components/message/README.md` - 功能文档
- ✅ `packages/ai/src/components/message/index.ts` - 导出定义
- ✅ `docs/implementation-artifacts/chat-input-mention-feature.md` - 实现文档

## 总结

成功为 ChatInput 组件添加了功能完整的 @ 提及特性,支持:
- ✅ 自动触发和实时搜索
- ✅ 扁平列表和分组展示
- ✅ 内容自动注入
- ✅ 完整的 TypeScript 类型支持
- ✅ 向后兼容
- ✅ 详细的文档和示例

该功能可以无缝集成到现有的 AI 聊天界面中,提升用户引用知识库内容的效率。
