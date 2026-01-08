# ChatInput @ 提及功能 - 快速入门

## 5分钟快速上手

### 步骤 1: 导入组件

```tsx
import { ChatInput, type MentionableItem } from '@memory-prosthetic/ai/components/message'
```

### 步骤 2: 准备数据

```tsx
const articles: MentionableItem[] = [
  {
    id: 1,
    title: 'React 最佳实践',
    content: 'React 是一个用于构建用户界面的 JavaScript 库...',
    type: '网页',
  },
  {
    id: 2,
    title: 'TypeScript 入门',
    content: 'TypeScript 添加了类型系统...',
    type: '文档',
  },
]
```

### 步骤 3: 使用组件

```tsx
function MyChat() {
  const [message, setMessage] = useState('')

  return (
    <ChatInput
      value={message}
      onChange={setMessage}
      onSubmit={(value) => {
        console.log('发送:', value)
        // value 包含了引用的文章内容
      }}
      enableMention={true}
      mentionItems={articles}
      placeholder="输入 @ 来引用文章..."
    />
  )
}
```

### 步骤 4: 测试

1. 在输入框中输入 `@`
2. 看到文章列表弹出
3. 选择一篇文章
4. 提交,查看控制台输出

## 与现有系统集成

### 场景 1: 在桌面应用中使用

```tsx
import { useCollections } from '@/hooks/use-collections'

function ChatPage() {
  const { collections } = useCollections({ status: 'active' })

  const mentionItems = collections.map(c => ({
    id: c.id,
    title: c.title,
    content: '', // 需要获取完整内容
    type: c.type,
  }))

  return (
    <ChatInput
      enableMention={true}
      mentionItems={mentionItems}
      {...props}
    />
  )
}
```

### 场景 2: 使用收藏夹分组

```tsx
import { useFavorites } from '@/hooks/use-favorites'
import { useCollections } from '@/hooks/use-collections'

function ChatWithFavorites() {
  const { favorites } = useFavorites()
  const { collections } = useCollections()

  const mentionGroups = favorites.map(fav => ({
    id: fav.id,
    name: fav.name,
    items: collections
      .filter(c => c.favoriteId === fav.id)
      .map(c => ({
        id: c.id,
        title: c.title,
        content: c.content,
        type: c.type,
      }))
  }))

  return (
    <ChatInput
      enableMention={true}
      mentionGroups={mentionGroups}
      {...props}
    />
  )
}
```

## 常见问题

### Q: 如何获取文章的完整内容?

A: `MentionableItem` 需要 `content` 字段。如果 API 列表不返回内容,有两种方案:

**方案 1: 选择时获取**
```tsx
const handleMentionSelect = async (item: MentionableItem) => {
  const fullContent = await fetchArticleContent(item.id)
  // 使用 fullContent
}
```

**方案 2: 预加载**
```tsx
const mentionItems = await Promise.all(
  collections.map(async (c) => ({
    ...c,
    content: await fetchContent(c.id)
  }))
)
```

### Q: 列表太长,如何优化性能?

A: 使用搜索回调实现懒加载:

```tsx
const [items, setItems] = useState([])

const handleSearch = async (query: string) => {
  const results = await searchArticles(query)
  setItems(results)
}

<ChatInput
  mentionItems={items}
  onMentionSearch={handleSearch}
  enableMention={true}
/>
```

### Q: 如何自定义引用格式?

A: 目前格式固定,如需自定义,可以修改 `handleSelectMention` 函数中的 `contextText` 变量。

### Q: 支持移动端吗?

A: 支持,但建议优化 Popover 的位置和大小:
- 设置 `side="bottom"` (移动端建议下方)
- 调整宽度适应屏幕

## 下一步

- 📖 查看完整文档: `packages/ai/src/components/message/README.md`
- 💡 查看示例代码: `packages/ai/src/components/message/chat-input-example.tsx`
- 🔧 查看实现细节: `docs/implementation-artifacts/chat-input-mention-feature.md`

## 效果预览

```
输入: @Rea[光标]
显示:
┌─────────────────────────────────┐
│ 文章                            │
├─────────────────────────────────┤
│ 📄 React 最佳实践               │
│    网页                          │
│ 📄 React Hooks 深度解析         │
│    文档                          │
└─────────────────────────────────┘

选择后:
输入框: @React 最佳实践 [光标]

提交内容:
--- 引用文章: React 最佳实践 ---
React 是一个用于构建用户界面的 JavaScript 库...
--- 引用结束 ---
```
