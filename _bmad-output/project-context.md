---
project_name: 'Memory Prosthetic'
user_name: 'Gao'
date: '2025-12-22'
status: 'complete'
---

# Project Context - Memory Prosthetic

> AI Agent 实现指南：本文档包含编写代码时必须遵循的关键规则。

## Technology Stack

| 层级 | 技术 | 版本 |
|------|------|------|
| Desktop | Tauri | 2.x |
| Frontend | React | 19.x |
| Type System | TypeScript | 5.8+ |
| Backend | Rust | 2021 Edition |
| Extension | WXT | 0.20.6 |
| Build | Vite | 7.x |
| Compiler | babel-plugin-react-compiler | latest |
| UI Library | shadcn/ui | 50+ 组件 |
| Styling | TailwindCSS | 4.x |
| Date/Time | date-fns | 4.x |
| Database | SQLite + sqlite-vec | latest |
| HTTP | Axum | latest |
| AI | all-MiniLM-L6-v2 | - |
| Content Extract | @mozilla/readability | latest |
| HTML to Markdown | turndown | latest |
| Markdown Render | streamdown | latest |

## Critical Implementation Rules

### Naming Conventions

- **TypeScript**: camelCase (变量/函数), PascalCase (类型/组件)
- **Rust**: snake_case (变量/函数), PascalCase (结构体)
- **Files**: kebab-case (TS), PascalCase (React 组件)
- **SQLite**: snake_case (表/列)
- **API endpoints**: kebab-case (`/api/health`)
- **JSON fields**: camelCase (TS) ↔ snake_case (Rust) 边界转换

### Code Style (Biome)

- Indent: 2 spaces
- Quotes: single `'`
- Semicolons: none (asNeeded)
- Trailing commas: ES5
- Line width: 120
- Import sorting: auto-organized

### TypeScript Rules

- 严格模式启用
- 避免 `any` (使用 `unknown` + 类型守卫)
- 共享类型从 `@memory-prosthetic/shared` 导入
- 不使用 `require()`，只用 ES modules
- **优先使用 `type`**: 类型定义使用 `type`，而非 `interface`
- **优先使用箭头函数**: 使用 `const fn = () => {}` 而非 `function fn() {}`

### React Patterns

- 函数组件 + Hooks (无 class 组件)
- 状态管理: Zustand (UI 状态)
- **网络请求**: 所有请求使用 `@tanstack/react-query`
- 路由: TanStack Router
- **React Compiler**: 已启用 `babel-plugin-react-compiler`，自动优化
- **禁止手动 memoization**: 不使用 `useMemo`, `useCallback`, `memo`
- shadcn/ui 组件: 从 `@memory-prosthetic/ui` 导入 (位于 `packages/ui/`)
- 功能组件位置: `components/features/`
- 自定义 Hook 命名: `use{Domain}.ts`

### Styling Rules

- **优先使用 TailwindCSS**: 所有样式通过 Tailwind 类实现
- **避免自定义 CSS**: 除非 Tailwind 无法实现
- **优先使用 shadcn/ui 组件**: 基础 UI 从 `@memory-prosthetic/ui` 导入
- **样式工具**: 使用 `cn()` (tailwind-merge) 合并类名

### Tauri IPC Patterns

```typescript
// ✅ 正确: 使用 invoke + 类型包装
const result = await invoke<CommandResult<SearchResult[]>>("search", { query })

// ❌ 错误: 直接返回，无类型
const result = await invoke("search", { query })
```

- Commands: 请求/响应操作
- Events: 后台通知 (`领域:动作` 格式)
- 永远使用 `CommandResult<T>` 包装响应

### API Response Format

```typescript
// Tauri Command
interface CommandResult<T> { data: T }
interface CommandError { code: string; message: string }

// HTTP API
interface ApiResponse<T> { success: true; data: T }
interface ApiError { success: false; error: { code: string; message: string } }
```

### Testing Rules

- 测试文件与源文件同级: `Component.tsx` + `Component.test.tsx`
- 使用 Vitest (配置中)
- 命名: `describe` 用模块名, `it` 用行为描述

### Error Handling

```typescript
// 用户层: Toast 简短消息
// 应用层: ErrorBoundary + TanStack Query onError
// 基础层: Rust tracing + console.error (开发)
```

### Anti-Patterns to Avoid

- ❌ 使用 `interface` 定义类型 (优先使用 `type`)
- ❌ 使用 `function` 声明函数 (优先使用 `const` 箭头函数)
- ❌ 使用 `useMemo`, `useCallback`, `memo` (React Compiler 自动处理)
- ❌ 编写自定义 CSS (优先 TailwindCSS)
- ❌ 自己写基础 UI 组件 (优先使用 shadcn/ui)
- ❌ 使用 moment.js 或原生 Date API (使用 date-fns)
- ❌ 使用 fetch/axios 直接请求 (使用 @tanstack/react-query)
- ❌ 直接保存原始 HTML (使用 @mozilla/readability + turndown 转 Markdown)
- ❌ 使用 dangerouslySetInnerHTML 渲染内容 (使用 MarkdownUI 组件)
- ❌ 直接修改 `packages/ui/src/components/ui/` (shadcn 组件)
- ❌ 在 app 目录复制 shadcn 组件 (应从 `@memory-prosthetic/ui` 导入)
- ❌ 在 React 组件中直接访问 SQLite
- ❌ 硬编码端口号 (使用配置)
- ❌ 混用 camelCase/snake_case 在同一层
- ❌ 忽略 Rust Result 错误处理
- ❌ 在 Event Payload 中省略 timestamp

### File Organization

```
apps/desktop/src/
├── components/{ui,features}/
├── hooks/
├── stores/           # use-{domain}-store.ts
├── routes/
├── lib/
└── types/

apps/desktop/src-tauri/src/
├── commands/
├── db/
├── embedding/
├── server/
└── utils/

apps/browser-extension/src/
├── entrypoints/      # popup/, background.ts, content.ts
├── components/
├── hooks/
├── styles/
├── types/
├── utils/            # @mozilla/readability, turndown
├── apis/             # API 请求
└── constants/

packages/shared/src/
├── types/
├── constants/
└── utils/            # typed.ts 类型检查工具

packages/ui/src/
├── components/
│   ├── ui/           # 50+ shadcn/ui 组件
│   └── markdown-ui/  # Markdown 渲染组件 (streamdown)
├── hooks/            # use-mobile.ts
├── styles/           # globals.css
└── utils/            # tw.ts (tailwind-merge)
```

## Quick Reference

| 场景 | 做法 |
|------|------|
| 使用 shadcn 组件 | 从 `@memory-prosthetic/ui` 导入 |
| 渲染 Markdown | 使用 `MarkdownUI` 组件 (from `@memory-prosthetic/ui`) |
| 提取网页内容 | 使用 `@mozilla/readability` + `turndown` 转 Markdown |
| 添加样式 | 使用 TailwindCSS 类，避免自定义 CSS |
| 时间处理 | 使用 date-fns，不使用 moment.js 或原生 Date |
| 网络请求 | 使用 @tanstack/react-query，不直接用 fetch/axios |
| 性能优化 | 无需手动 memo，React Compiler 自动处理 |
| 新增功能组件 | `components/features/` + PascalCase |
| 新增 Tauri Command | `commands/` + snake_case + CommandResult |
| 共享类型 | `packages/shared/src/types/` |
| 工具函数 | `packages/shared/src/utils/` |
| UI 状态管理 | `stores/use-{domain}-store.ts` (Zustand) |
| API 端点 | `/api/kebab-case` + ApiResponse |

### UI 组件使用

```typescript
// ✅ 从 packages/ui 导入 shadcn 组件
import { Button, Dialog, Input } from '@memory-prosthetic/ui'

// ❌ 不要直接复制组件到 app 目录
```

### React Compiler (禁止手动 memoization)

```typescript
// ✅ 正确: 直接写，Compiler 自动优化
const SearchBox = ({ onSearch }) => {
  const handleClick = () => onSearch(query)
  return <Button onClick={handleClick}>Search</Button>
}

// ❌ 错误: 手动 memoization
const SearchBox = memo(({ onSearch }) => {
  const handleClick = useCallback(() => onSearch(query), [onSearch, query])
  const expensiveValue = useMemo(() => compute(data), [data])
  return <Button onClick={handleClick}>Search</Button>
})
```

### TailwindCSS 样式

```typescript
// ✅ 正确: TailwindCSS 类
<div className="flex items-center gap-4 p-4 rounded-lg bg-background">
  <span className="text-sm text-muted-foreground">Label</span>
</div>

// ❌ 错误: 自定义 CSS
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
```

### date-fns 时间处理

```typescript
// ✅ 正确: 使用 date-fns
import { format, formatDistanceToNow, isToday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const formattedDate = format(date, 'yyyy-MM-dd HH:mm')
const relativeTime = formatDistanceToNow(date, { locale: zhCN, addSuffix: true })
const isNew = isToday(parseISO(dateString))

// ❌ 错误: moment.js 或原生 Date
import moment from 'moment' // ❌
new Date().toLocaleDateString() // ❌
```

### @tanstack/react-query 网络请求

```typescript
// ✅ 正确: 使用 useQuery 获取数据
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 查询数据
const { data, isLoading, error } = useQuery({
  queryKey: ['collections', filters],
  queryFn: () => fetchCollections(filters),
})

// 修改数据
const queryClient = useQueryClient()
const { mutate } = useMutation({
  mutationFn: createCollection,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['collections'] })
  },
})

// ❌ 错误: 直接使用 fetch/axios
const [data, setData] = useState(null)
useEffect(() => {
  fetch('/api/collections').then(r => r.json()).then(setData) // ❌
}, [])
```

### 内容提取与 Markdown

```typescript
// ✅ 正确: 使用 @mozilla/readability 提取主要内容
import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

// 提取网页主要内容 (移除导航、广告等)
const doc = new DOMParser().parseFromString(html, 'text/html')
const article = new Readability(doc).parse()
const mainContent = article?.content // 纯净 HTML

// 转换为 Markdown
const turndown = new TurndownService()
const markdown = turndown.turndown(mainContent)

// ❌ 错误: 直接保存原始 HTML
const rawHtml = document.body.innerHTML // ❌ 包含导航、广告等无关内容
```

```typescript
// ✅ 正确: 使用 MarkdownUI 渲染 Markdown
import { MarkdownUI } from '@memory-prosthetic/ui'

const ArticleView = ({ content }: { content: string }) => {
  return <MarkdownUI markdown={content} />
}

// ❌ 错误: 直接渲染 HTML
<div dangerouslySetInnerHTML={{ __html: rawHtml }} /> // ❌
```

### TypeScript 类型与函数声明

```typescript
// ✅ 正确: 使用 type
type User = {
  id: string
  name: string
}

type SearchResult = {
  title: string
  url: string
}

// ❌ 错误: 使用 interface
interface User {
  id: string
  name: string
}
```

```typescript
// ✅ 正确: const 箭头函数
const handleSearch = (query: string) => {
  return results.filter(r => r.includes(query))
}

const SearchBox = () => {
  return <div>...</div>
}

// ❌ 错误: function 声明
function handleSearch(query: string) {
  return results.filter(r => r.includes(query))
}

function SearchBox() {
  return <div>...</div>
}
```
