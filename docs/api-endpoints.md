# Memory Prosthetic - API 接口文档

本文档列出了 Memory Prosthetic 后端暴露的所有接口，包括 HTTP API 端点和 Tauri Commands。

---

## 目录

- [HTTP API 端点](#http-api-端点)
- [Tauri Commands](#tauri-commands)
- [Tauri Events](#tauri-events)
- [类型定义](#类型定义)
- [响应格式](#响应格式)
- [使用示例](#使用示例)

---

## HTTP API 端点

HTTP 服务器运行在 `localhost:21890`（默认端口，可配置），主要用于浏览器插件和 MCP 服务器通信。

**服务器配置：**
- 框架：Axum 0.8
- 地址：`http://localhost:21890`
- 认证：可选 Bearer Token
- CORS：允许浏览器插件源
- 异步运行时：Tokio 1.x

### 1. GET /api/health

**健康检查端点**

用于检测桌面应用是否正在运行。

**响应示例：**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

**调用方：** 浏览器插件、MCP 服务器

---

### 2. POST /api/collect

**收集内容（从浏览器插件）**

将网页内容保存到本地数据库。

**请求体：**

```json
{
  "url": "https://example.com/article",
  "title": "文章标题",
  "content": "Markdown 格式的文章内容",
  "favorite_id": "optional-favorite-id",
  "tags": ["tag1", "tag2"]
}
```

**响应格式：**

```typescript
// 成功
{
  "success": true,
  "data": {
    "id": "collection-id",
    "url": "https://example.com/article",
    "title": "文章标题"
  }
}

// 错误
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL is required"
  }
}
```

**HTTP 状态码：**
- `200` - 成功
- `400` - 参数错误
- `500` - 服务器错误

**调用方：** 浏览器插件

---

### 3. POST /api/search

**语义搜索**

在本地数据库中执行语义搜索。

**请求体：**

```json
{
  "query": "搜索关键词",
  "limit": 10,
  "filters": {
    "favorite_id": "optional-favorite-id",
    "tag_ids": ["tag1", "tag2"],
    "status": "active"
  }
}
```

**响应格式：**

```typescript
// 成功
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "collection-id",
        "url": "https://example.com/article",
        "title": "文章标题",
        "snippet": "内容摘要...",
        "score": 0.95
      }
    ],
    "total": 42
  }
}

// 错误
{
  "success": false,
  "error": {
    "code": "SEARCH_FAILED",
    "message": "搜索失败，请重试"
  }
}
```

**HTTP 状态码：**
- `200` - 成功
- `400` - 参数错误
- `500` - 服务器错误

**调用方：** MCP 服务器（可选，供插件预览）

---

### 4. GET /api/collections

**获取收集列表**

支持分页和多种筛选条件。

**查询参数：**

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `limit` | number | 结果数量限制 | 50 |
| `offset` | number | 分页偏移量 | 0 |
| `favorite_id` | number | 按收藏夹筛选 | - |
| `tag_id` | number | 按标签筛选 | - |
| `status` | string | 按状态筛选: `active`, `archived`, `deleted` | `active` |

**响应格式：**

```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/article",
      "title": "文章标题",
      "domain": "example.com",
      "starred": false,
      "favoriteId": 1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 5. GET /api/collections/:id

**获取单个收集**

**路径参数：**
- `id` (number) - 收集 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com/article",
    "title": "文章标题",
    "content": "Markdown 格式内容...",
    "summary": "摘要",
    "starred": false,
    "embeddingStatus": "completed",
    "favoriteId": 1,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 6. POST /api/collections

**创建新的收集**

**请求体：**

```json
{
  "url": "https://example.com/article",
  "title": "文章标题",
  "content": "Markdown 格式内容...",
  "favoriteId": 1,
  "tags": [1, 2, 3]
}
```

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com/article",
    "title": "文章标题",
    // ... 完整收集对象
  }
}
```

---

### 7. PUT /api/collections/:id

**更新收集**

**路径参数：**
- `id` (number) - 收集 ID

**请求体：**

```json
{
  "title": "新标题",
  "favoriteId": 2,
  "tags": [1, 2],
  "status": "archived"
}
```

所有字段都是可选的。

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    // 更新后的完整收集对象
  }
}
```

---

### 8. DELETE /api/collections/:id

**删除收集**

**路径参数：**
- `id` (number) - 收集 ID

**查询参数：**
- `permanent` (boolean, 可选) - 是否永久删除，默认 `false`（软删除）

**响应格式：**

```typescript
{
  "success": true,
  "data": true  // 是否成功删除
}
```

---

### 9. POST /api/collections/:id/archive

**归档收集**

**路径参数：**
- `id` (number) - 收集 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": null
}
```

---

### 10. POST /api/collections/:id/restore

**恢复收集**

**路径参数：**
- `id` (number) - 收集 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": null
}
```

---

### 11. GET /api/favorites

**获取所有收藏夹列表**

**响应格式：**

```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "收藏夹名称",
      "icon": "folder",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 12. GET /api/favorites/:id

**获取单个收藏夹**

**路径参数：**
- `id` (number) - 收藏夹 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "收藏夹名称",
    "icon": "folder",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 13. POST /api/favorites

**创建收藏夹**

**请求体：**

```json
{
  "name": "收藏夹名称",
  "icon": "folder"
}
```

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    // 创建的收藏夹对象
  }
}
```

---

### 14. PUT /api/favorites/:id

**更新收藏夹**

**路径参数：**
- `id` (number) - 收藏夹 ID

**请求体：**

```json
{
  "name": "新名称",
  "icon": "new-icon"
}
```

所有字段都是可选的。

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    // 更新后的收藏夹对象
  }
}
```

---

### 15. DELETE /api/favorites/:id

**删除收藏夹**

**路径参数：**
- `id` (number) - 收藏夹 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": true  // 是否成功删除
}
```

**注意：** 默认收藏夹"未分类"不能被删除。

---

### 16. GET /api/tags

**获取所有标签列表**

**查询参数：**
- `sort` (string, 可选) - 排序方式: `name`, `created_at`, `usage`，默认 `name`

**响应格式：**

```typescript
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "标签名称",
      "color": "#3b82f6",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 17. GET /api/tags/:id

**获取单个标签**

**路径参数：**
- `id` (number) - 标签 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    "id": 1,
    "name": "标签名称",
    "color": "#3b82f6",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### 18. POST /api/tags

**创建标签**

**请求体：**

```json
{
  "name": "标签名称",
  "color": "#3b82f6"
}
```

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    // 创建的标签对象
  }
}
```

---

### 19. PUT /api/tags/:id

**更新标签**

**路径参数：**
- `id` (number) - 标签 ID

**请求体：**

```json
{
  "name": "新名称",
  "color": "#ef4444"
}
```

所有字段都是可选的。

**响应格式：**

```typescript
{
  "success": true,
  "data": {
    // 更新后的标签对象
  }
}
```

---

### 20. DELETE /api/tags/:id

**删除标签**

**路径参数：**
- `id` (number) - 标签 ID

**响应格式：**

```typescript
{
  "success": true,
  "data": true  // 是否成功删除
}
```

**注意：** 删除标签会自动移除所有收集与该标签的关联关系。

---

## Tauri Commands

Tauri Commands 通过 Tauri IPC 机制从前端调用，使用 `invoke()` 方法。所有命令都支持类型安全的 TypeScript 调用。

### 搜索相关

#### `search`

执行语义搜索。

**参数：**

```typescript
{
  query: string                    // 搜索关键词（必需）
  filters?: SearchFilters          // 可选筛选条件
}
```

**返回：**

```typescript
CommandResult<SearchResult[]>
```

**示例：**

```typescript
const results = await invoke<CommandResult<SearchResult[]>>("search", {
  query: "React hooks",
  filters: {
    favoriteId: "favorite-123",
    tagIds: ["tag-1", "tag-2"],
    status: "active"
  }
})
```

---

### 内容收集管理

#### `get_collections`

获取收集列表，支持分页和筛选。

**参数：**

```typescript
{
  favorite_id?: string      // 按收藏夹筛选
  tag_id?: string          // 按标签筛选
  status?: string          // 按状态筛选: 'active' | 'archived' | 'deleted'
  limit?: number           // 结果数量限制
  offset?: number          // 分页偏移量
}
```

**返回：**

```typescript
CommandResult<Collection[]>
```

---

#### `create_collection`

创建新的内容收集。

**参数：**

```typescript
{
  url: string              // 内容 URL（必需）
  title: string            // 标题（必需）
  content: string          // Markdown 格式内容（必需）
  favorite_id?: string     // 所属收藏夹 ID（可选）
  tags?: string[]          // 标签 ID 数组（可选）
}
```

**返回：**

```typescript
CommandResult<Collection>
```

---

#### `update_collection`

更新现有内容收集。

**参数：**

```typescript
{
  id: string               // 收集 ID（必需）
  title?: string           // 新标题（可选）
  favorite_id?: string     // 新收藏夹 ID（可选）
  tags?: string[]          // 新标签数组（可选）
  status?: string          // 新状态（可选）
}
```

**返回：**

```typescript
CommandResult<Collection>
```

---

#### `delete_collection`

删除内容收集（软删除或永久删除）。

**参数：**

```typescript
{
  id: string               // 收集 ID（必需）
  permanent?: boolean      // 是否永久删除（默认 false）
}
```

**返回：**

```typescript
CommandResult<boolean>
```

---

#### `archive_collection`

归档内容收集。

**参数：**

```typescript
{
  id: string               // 收集 ID（必需）
}
```

**返回：**

```typescript
CommandResult<void>
```

---

#### `restore_collection`

恢复已归档或已删除的内容收集。

**参数：**

```typescript
{
  id: string               // 收集 ID（必需）
}
```

**返回：**

```typescript
CommandResult<void>
```

---

### 收藏夹管理

#### `get_favorites`

获取所有收藏夹列表。

**参数：**

```typescript
{}                        // 无参数
```

**返回：**

```typescript
CommandResult<Favorite[]>
```

---

#### `create_favorite`

创建新收藏夹。

**参数：**

```typescript
{
  name: string            // 收藏夹名称（必需）
  icon?: string           // 图标标识符（可选）
}
```

**返回：**

```typescript
CommandResult<Favorite>
```

---

#### `update_favorite`

更新收藏夹信息。

**参数：**

```typescript
{
  id: string              // 收藏夹 ID（必需）
  name?: string           // 新名称（可选）
  icon?: string          // 新图标（可选）
}
```

**返回：**

```typescript
CommandResult<Favorite>
```

---

#### `delete_favorite`

删除收藏夹。

**参数：**

```typescript
{
  id: string              // 收藏夹 ID（必需）
}
```

**返回：**

```typescript
CommandResult<boolean>
```

---

### 标签管理

#### `get_tags`

获取所有标签列表。

**参数：**

```typescript
{
  sort?: 'name' | 'created_at'    // 排序方式（可选）
}
```

**返回：**

```typescript
CommandResult<Tag[]>
```

---

#### `create_tag`

创建新标签。

**参数：**

```typescript
{
  name: string            // 标签名称（必需）
  color?: string          // 标签颜色（可选）
}
```

**返回：**

```typescript
CommandResult<Tag>
```

---

#### `update_tag`

更新标签信息。

**参数：**

```typescript
{
  id: string              // 标签 ID（必需）
  name?: string           // 新名称（可选）
  color?: string         // 新颜色（可选）
}
```

**返回：**

```typescript
CommandResult<Tag>
```

---

#### `delete_tag`

删除标签。

**参数：**

```typescript
{
  id: string              // 标签 ID（必需）
}
```

**返回：**

```typescript
CommandResult<boolean>
```

---

### 设置管理

#### `get_settings`

获取所有应用设置。

**参数：**

```typescript
{}                        // 无参数
```

**返回：**

```typescript
CommandResult<AppSettings>
```

---

#### `set_settings`

保存应用设置。

**参数：**

```typescript
{
  key: string             // 设置键（必需）
  value: unknown          // 设置值（必需）
}
```

**返回：**

```typescript
CommandResult<void>
```

---

## Tauri Events

Tauri Events 是后端主动向前端推送的事件，通过 `listen()` 方法监听。

### 事件命名规范

事件名称使用 `领域:动作` 格式，例如 `collection:completed`。

### 事件列表

| 事件名称 | 说明 | Payload 类型 |
|---------|------|-------------|
| `collection:started` | 收集开始 | `EventPayload<{ url: string }>` |
| `collection:completed` | 收集完成 | `EventPayload<{ id: string, url: string }>` |
| `collection:failed` | 收集失败 | `EventPayload<{ url: string, error: string }>` |
| `embedding:progress` | Embedding 处理进度 | `EventPayload<{ progress: number }>` |
| `favorite:created` | 收藏夹创建 | `EventPayload<Favorite>` |
| `tag:created` | 标签创建 | `EventPayload<Tag>` |
| `collection:archived` | 收集归档 | `EventPayload<{ id: string }>` |
| `collection:deleted` | 收集删除 | `EventPayload<{ id: string }>` |

### EventPayload 格式

```typescript
type EventPayload<T> = {
  timestamp: number        // 事件时间戳
  data: T                 // 事件数据
}
```

### 监听事件示例

```typescript
import { listen } from '@tauri-apps/api/event'

// 监听收集完成事件
const unlisten = await listen<EventPayload<{ id: string, url: string }>>(
  'collection:completed',
  (event) => {
    console.log('收集完成:', event.payload.data)
  }
)

// 取消监听
unlisten()
```

---

## 类型定义

### 核心类型

```typescript
// 收集状态
type CollectionStatus = 'active' | 'archived' | 'deleted'

// 内容收集
type Collection = {
  id: string
  url: string
  title: string
  content: string                    // Markdown 格式
  favoriteId: string | null
  status: CollectionStatus
  tags: Tag[]
  createdAt: number                 // Unix 时间戳
  updatedAt: number                 // Unix 时间戳
}

// 收藏夹
type Favorite = {
  id: string
  name: string
  icon?: string
  count?: number                     // 内容数量（计算字段）
  createdAt: number
  updatedAt: number
}

// 标签
type Tag = {
  id: string
  name: string
  color?: string
  count?: number                     // 使用该标签的内容数量（计算字段）
  createdAt: number
  updatedAt: number
}

// 搜索筛选条件
type SearchFilters = {
  favoriteId?: string
  tagIds?: string[]
  status?: CollectionStatus
}

// 搜索结果
type SearchResult = {
  id: string
  title: string
  url: string
  snippet: string
  score: number                      // 相似度分数 (0-1)
}
```

---

## 响应格式

### Tauri Command 响应格式

**成功响应：**

```typescript
type CommandResult<T> = {
  data: T
}
```

**错误响应：**

```typescript
type CommandError = {
  code: string                      // 错误代码，如 "DB_ERROR", "EMBEDDING_FAILED"
  message: string                   // 用户可读的错误消息
  details?: unknown                 // 调试信息（可选）
}
```

### HTTP API 响应格式

**成功响应：**

```typescript
type ApiResponse<T> = {
  success: true
  data: T
}
```

**错误响应：**

```typescript
type ApiError = {
  success: false
  error: {
    code: string                    // 错误代码
    message: string                // 错误消息
  }
}
```

**HTTP 状态码：**
- `200` - 成功
- `400` - 参数错误
- `401` - 未授权
- `404` - 资源不存在
- `500` - 服务器错误

---

## 使用示例

### 前端调用 Tauri Command

```typescript
import { invoke } from '@tauri-apps/api/core'
import type { Collection, Favorite, Tag, SearchResult } from '@memory-prosthetic/shared'

// 搜索
const { data: results } = await invoke<CommandResult<SearchResult[]>>("search", {
  query: "React hooks",
  filters: {
    favoriteId: "favorite-123",
    status: "active"
  }
})

// 获取收藏夹列表
const { data: favorites } = await invoke<CommandResult<Favorite[]>>("get_favorites", {})

// 创建标签
const { data: tag } = await invoke<CommandResult<Tag>>("create_tag", {
  name: "前端开发",
  color: "#3b82f6"
})

// 创建收集
const { data: collection } = await invoke<CommandResult<Collection>>("create_collection", {
  url: "https://example.com/article",
  title: "文章标题",
  content: "# 文章内容\n\n这是 Markdown 格式的内容...",
  favorite_id: "favorite-123",
  tags: ["tag-1", "tag-2"]
})
```

### HTTP API 调用

```typescript
// 健康检查
const healthResponse = await fetch('http://localhost:21890/api/health')
const healthData = await healthResponse.json()
console.log(healthData) // { status: "ok", version: "1.0.0" }

// 收集内容
const collectResponse = await fetch('http://localhost:21890/api/collect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 'Authorization': 'Bearer token' // 如果启用了认证
  },
  body: JSON.stringify({
    url: 'https://example.com/article',
    title: '文章标题',
    content: '# 文章内容\n\nMarkdown 格式...',
    favorite_id: 'favorite-123',
    tags: ['tag-1', 'tag-2']
  })
})

const collectData = await collectResponse.json()
if (collectData.success) {
  console.log('收集成功:', collectData.data)
} else {
  console.error('收集失败:', collectData.error)
}

// 语义搜索
const searchResponse = await fetch('http://localhost:21890/api/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'React hooks',
    limit: 10,
    filters: {
      favorite_id: 'favorite-123',
      status: 'active'
    }
  })
})

const searchData = await searchResponse.json()
if (searchData.success) {
  console.log('搜索结果:', searchData.data.results)
  console.log('总数:', searchData.data.total)
}
```

### 监听 Tauri Events

```typescript
import { listen } from '@tauri-apps/api/event'

// 监听收集完成事件
const unlistenCompleted = await listen('collection:completed', (event) => {
  console.log('收集完成:', event.payload.data)
  // 刷新列表或显示通知
})

// 监听收集失败事件
const unlistenFailed = await listen('collection:failed', (event) => {
  console.error('收集失败:', event.payload.data.error)
  // 显示错误提示
})

// 组件卸载时取消监听
// unlistenCompleted()
// unlistenFailed()
```

---

## 接口统计

- **HTTP API 端点：** 20 个
  - 基础接口：3 个（health, collect, search）
  - Collections：7 个（list, get, create, update, delete, archive, restore）
  - Favorites：5 个（list, get, create, update, delete）
  - Tags：5 个（list, get, create, update, delete）
- **Tauri Commands：** 17 个
- **Tauri Events：** 8 个
- **总计：** 45 个接口

---

## 注意事项

1. **HTTP 服务器**主要用于浏览器插件和 MCP 服务器通信，默认端口为 `21890`（可在设置中配置）
2. **Tauri Commands** 是桌面应用内部的主要通信方式，提供类型安全的 IPC
3. 所有命令都支持错误处理，返回 `CommandError` 格式的错误信息
4. HTTP 端点使用 CORS，允许跨域请求（生产环境建议限制来源）
5. 事件命名遵循 `领域:动作` 格式，便于理解和维护
6. 所有时间戳使用 Unix 时间戳（毫秒）

---

## 相关文档

- [架构文档](./architecture.md) - 完整的架构设计和决策记录
- [开发指南](./development-guide.md) - 开发环境设置和开发流程
