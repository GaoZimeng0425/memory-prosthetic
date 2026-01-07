# ChatInput @ 提及功能

## 功能概述

为 ChatInput 组件添加了 `@` 提及功能,允许用户在输入时通过 `@` 符号快速引用知识库中的文章内容。

## 主要特性

✅ **自动触发**: 输入 `@` 时自动弹出文章选择菜单
✅ **实时搜索**: 支持输入关键词过滤文章列表
✅ **分组显示**: 可按知识库/收藏夹分组展示文章
✅ **内容注入**: 选择文章后自动将内容作为上下文注入到消息中
✅ **键盘导航**: 支持 ESC 键关闭菜单
✅ **灵活配置**: 可选启用,支持自定义数据源

## 使用方法

### 1. 基础用法

```tsx
import { ChatInput, type MentionableItem } from '@memory-prosthetic/ai/components/message'

function MyChat() {
  const [message, setMessage] = useState('')

  const articles: MentionableItem[] = [
    {
      id: 1,
      title: 'React 最佳实践',
      content: 'React 是一个用于构建用户界面的 JavaScript 库...',
      type: '网页',
    },
    // ... 更多文章
  ]

  return (
    <ChatInput
      value={message}
      onChange={setMessage}
      onSubmit={(value) => console.log(value)}
      enableMention={true}
      mentionItems={articles}
    />
  )
}
```

### 2. 使用分组 (知识库/收藏夹)

```tsx
import { ChatInput, type MentionGroup } from '@memory-prosthetic/ai/components/message'

function MyChatWithGroups() {
  const groups: MentionGroup[] = [
    {
      id: 1,
      name: 'Prime 前端项目',
      items: [
        {
          id: 101,
          title: '组件设计规范',
          content: '组件设计应遵循单一职责原则...',
          type: '文档',
        },
        // ... 更多文章
      ],
    },
    {
      id: 2,
      name: 'PRD 需求文档',
      items: [
        // ... 文章列表
      ],
    },
  ]

  return (
    <ChatInput
      value={message}
      onChange={setMessage}
      onSubmit={handleSubmit}
      enableMention={true}
      mentionGroups={groups}
    />
  )
}
```

### 3. 集成搜索功能

```tsx
function MyChatWithSearch() {
  const [message, setMessage] = useState('')
  const [articles, setArticles] = useState<MentionableItem[]>([])

  const handleMentionSearch = (query: string) => {
    // 调用 API 搜索文章
    searchArticles(query).then(setArticles)
  }

  return (
    <ChatInput
      value={message}
      onChange={setMessage}
      onSubmit={handleSubmit}
      enableMention={true}
      mentionItems={articles}
      onMentionSearch={handleMentionSearch}
    />
  )
}
```

## Props 说明

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enableMention` | `boolean` | `false` | 是否启用 @ 提及功能 |
| `mentionItems` | `MentionableItem[]` | `[]` | 文章列表(扁平结构) |
| `mentionGroups` | `MentionGroup[]` | `[]` | 分组的文章列表 |
| `onMentionSearch` | `(query: string) => void` | - | 搜索回调函数 |

### 其他继承的 Props

所有 ChatInput 原有的 props 都保持兼容:
- `value`, `onChange`, `onSubmit`
- `placeholder`, `disabled`
- `submitButtonText`, `stopButtonText`, `showStopButton`

## 类型定义

```typescript
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

## 工作原理

1. **触发检测**: 当用户输入 `@` 时,组件检测到并显示下拉菜单
2. **实时过滤**: 继续输入会实时过滤文章列表
3. **选择文章**: 点击或使用键盘选择文章
4. **内容注入**:
   - 输入框中显示: `@文章标题`
   - 实际提交的内容包含:
     ```
     --- 引用文章: 文章标题 ---
     文章内容(最多500字符)
     --- 引用结束 ---
     ```
5. **提交**: 父组件收到的是包含完整引用内容的消息

## 数据转换示例

从现有的 Collection 数据转换为 MentionableItem:

```typescript
import type { Collection } from '@memory-prosthetic/shared/types'
import type { MentionableItem } from '@memory-prosthetic/ai/components/message'

function toMentionItem(collection: Collection): MentionableItem {
  return {
    id: collection.id,
    title: collection.title,
    content: collection.content,
    type: collection.type,
    url: collection.url,
    favoriteId: collection.favoriteId,
  }
}

// 使用示例
const { collections } = useCollections({ status: 'active' })
const mentionItems = collections.map(toMentionItem)
```

从 Favorite 分组:

```typescript
import type { Favorite } from '@memory-prosthetic/shared/types'
import type { MentionGroup } from '@memory-prosthetic/ai/components/message'

function groupByFavorite(
  collections: Collection[],
  favorites: Favorite[]
): MentionGroup[] {
  return favorites.map(fav => ({
    id: fav.id,
    name: fav.name,
    items: collections
      .filter(c => c.favoriteId === fav.id)
      .map(toMentionItem)
  }))
}
```

## UI 展示

提及菜单的 UI 特性:
- ✅ 显示文章标题和类型
- ✅ 使用图标区分文章和文件夹
- ✅ 最多显示 10 个结果(扁平列表)或每组 5 个(分组列表)
- ✅ 支持滚动查看更多
- ✅ 空状态提示

## 注意事项

1. **性能优化**: 建议限制 `mentionItems` 数量(如最多 100 条),或使用 `onMentionSearch` 实现懒加载
2. **内容长度**: 引用的文章内容会被截断为 500 字符,避免消息过长
3. **数据获取**: `MentionableItem` 需要包含 `content` 字段,如果 API 返回的列表数据不含 content,需要在选择时额外获取
4. **兼容性**: 如果不启用 `enableMention`,组件行为与原来完全一致

## 下一步优化建议

- [ ] 支持多选文章
- [ ] 添加文章预览功能
- [ ] 支持拖拽排序引用顺序
- [ ] 添加最近使用的文章快捷列表
- [ ] 支持 @ 引用收藏夹(将整个收藏夹的文章都作为上下文)

## 相关文件

- `packages/ai/src/components/message/input.tsx` - 主组件实现
- `packages/ai/src/components/message/chat-input-example.tsx` - 使用示例
- `packages/ai/src/components/message/index.ts` - 导出定义
