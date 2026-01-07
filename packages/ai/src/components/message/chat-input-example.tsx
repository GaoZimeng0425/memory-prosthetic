/**
 * ChatInput 使用示例
 *
 * 展示如何集成带有 @ 提及功能的 ChatInput 组件
 */

import { useState } from 'react'

import { ChatInput, type MentionableItem, type MentionGroup } from './input'

/**
 * 示例 1: 基础用法 - 使用文章列表
 */
export function ChatInputWithMentions() {
  const [message, setMessage] = useState('')

  // 从 API 获取文章列表 (示例数据)
  const articles: MentionableItem[] = [
    {
      id: 1,
      title: 'React 最佳实践',
      content: 'React 是一个用于构建用户界面的 JavaScript 库...',
      type: '网页',
    },
    {
      id: 2,
      title: 'TypeScript 入门指南',
      content: 'TypeScript 是 JavaScript 的超集，添加了类型系统...',
      type: '文档',
    },
    {
      id: 3,
      title: 'Tailwind CSS 使用技巧',
      content: 'Tailwind CSS 是一个功能类优先的 CSS 框架...',
      type: '笔记',
    },
  ]

  const handleSubmit = (value: string) => {
    console.log('提交消息:', value)
    // 这里会收到包含文章内容的完整消息
    setMessage('')
  }

  const handleMentionSearch = (query: string) => {
    console.log('搜索文章:', query)
    // 可以在这里触发 API 搜索
  }

  return (
    <ChatInput
      enableMention={true}
      mentionItems={articles}
      onChange={setMessage}
      onMentionSearch={handleMentionSearch}
      onSubmit={handleSubmit}
      placeholder="输入消息，使用 @ 来引用文章..."
      value={message}
    />
  )
}

/**
 * 示例 2: 使用分组
 */
export function ChatInputWithGroups() {
  const [message, setMessage] = useState('')

  // 按知识库分组的文章
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
          favoriteId: 1,
        },
        {
          id: 102,
          title: 'API 接口文档',
          content: 'RESTful API 设计规范...',
          type: '文档',
          favoriteId: 1,
        },
      ],
    },
    {
      id: 2,
      name: 'PRD 需求文档',
      items: [
        {
          id: 201,
          title: '用户认证需求',
          content: '用户登录、注册、密码重置等功能需求...',
          type: '文档',
          favoriteId: 2,
        },
        {
          id: 202,
          title: '数据分析需求',
          content: '用户行为分析、数据可视化需求...',
          type: '文档',
          favoriteId: 2,
        },
      ],
    },
  ]

  const handleSubmit = (value: string) => {
    console.log('提交消息:', value)
    setMessage('')
  }

  return (
    <ChatInput
      enableMention={true}
      mentionGroups={groups}
      onChange={setMessage}
      onSubmit={handleSubmit}
      placeholder="输入问题，将基于上方选中的知识库/文件回答"
      value={message}
    />
  )
}

/**
 * 示例 3: 集成到实际应用 (使用 useCollections hook)
 */
export function ChatInputWithCollections() {
  const [message, setMessage] = useState('')

  // 注意: 这需要在 desktop app 中使用
  // 在 ai package 中需要通过 props 传入
  // const { collections } = useCollections({ status: 'active', limit: 100 })

  // 将 collections 转换为 MentionableItem 格式
  const mentionItems: MentionableItem[] = [] // collections.map(...)

  const handleSubmit = (value: string) => {
    console.log('提交消息:', value)
    // 发送到 AI 服务
    setMessage('')
  }

  return (
    <ChatInput
      enableMention={true}
      mentionItems={mentionItems}
      onChange={setMessage}
      onSubmit={handleSubmit}
      placeholder="输入消息，使用 @ 来引用收藏的文章..."
      value={message}
    />
  )
}

/**
 * 使用说明:
 *
 * 1. 在输入框中输入 "@" 会自动弹出文章列表
 * 2. 可以继续输入来过滤文章
 * 3. 点击或使用键盘选择文章
 * 4. 选中后会在输入框中显示 "@文章标题"
 * 5. 实际提交时会包含文章的完整内容作为上下文
 *
 * Props 说明:
 * - enableMention: 是否启用提及功能
 * - mentionItems: 文章列表 (扁平结构)
 * - mentionGroups: 分组的文章列表 (知识库/收藏夹分组)
 * - onMentionSearch: 搜索回调，可用于实时搜索
 *
 * 数据转换示例:
 *
 * // 从 CollectionListItem 转换为 MentionableItem
 * const toMentionItem = (collection: CollectionListItem): MentionableItem => ({
 *   id: collection.id,
 *   title: collection.title,
 *   content: '', // 需要额外获取 content
 *   type: collection.type,
 *   url: collection.url,
 *   favoriteId: collection.favoriteId,
 * })
 */
