# Memory Prosthetic - API 端点列表

## HTTP 服务器端点

HTTP 服务器运行在 `http://127.0.0.1:21890`（默认端口），主要用于浏览器扩展通信。

### 1. GET /api/health

**健康检查端点**

**响应示例：**

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### 2. POST /api/collect

**收集内容（从浏览器扩展）**

**请求体：**

```json
{
  "url": "https://example.com/article",
  "title": "文章标题",
  "content": "文章内容"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": 123
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL is required"
  }
}
```

### 3. POST /api/search

**语义搜索**

**请求体：**

```json
{
  "query": "搜索关键词",
  "limit": 10
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 123,
        "url": "https://example.com/article",
        "title": "文章标题",
        "similarity": 0.95,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "query": "搜索关键词"
  }
}
```

---

## Tauri Commands (IPC)

这些命令通过 Tauri 的 IPC 机制从前端调用，使用 `invoke()` 方法。

### 窗口管理

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `toggle_search_window` | - | `void` | 切换搜索窗口显示/隐藏 |
| `hide_search_window` | - | `void` | 隐藏搜索窗口 |
| `show_search_window` | - | `void` | 显示搜索窗口 |
| `show_main_window` | - | `void` | 显示并聚焦主窗口 |

### 设置管理

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `get_settings` | - | `CommandResult<AppSettings>` | 获取所有设置 |
| `get_setting` | `key: string` | `CommandResult<Value>` | 获取单个设置项 |
| `set_setting` | `key: string, value: Value` | `CommandResult<void>` | 设置单个设置项 |
| `update_shortcut` | `shortcut: ShortcutConfig` | `CommandResult<ShortcutConfig>` | 更新快捷键配置 |
| `set_auto_start` | `enabled: boolean` | `CommandResult<boolean>` | 设置开机自启动 |
| `update_theme` | `theme: Theme` | `CommandResult<Theme>` | 更新主题 |
| `update_auto_cleanup_deleted` | `cleanup: AutoCleanupDeleted` | `CommandResult<AutoCleanupDeleted>` | 更新自动清理已删除项设置 |

### 收藏夹 (Favorites)

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `create_favorite` | `request: CreateFavorite` | `CommandResult<number>` | 创建收藏夹 |
| `update_favorite` | `id: number, request: UpdateFavorite` | `CommandResult<void>` | 更新收藏夹 |
| `delete_favorite` | `id: number` | `CommandResult<boolean>` | 删除收藏夹 |
| `get_favorites` | - | `CommandResult<Favorite[]>` | 获取所有收藏夹 |
| `get_favorite` | `id: number` | `CommandResult<Favorite \| null>` | 获取单个收藏夹 |

### 标签 (Tags)

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `create_tag` | `request: CreateTag` | `CommandResult<number>` | 创建标签 |
| `update_tag` | `id: number, request: UpdateTag` | `CommandResult<void>` | 更新标签 |
| `delete_tag` | `id: number` | `CommandResult<boolean>` | 删除标签 |
| `get_tags` | `sort?: string` | `CommandResult<Tag[]>` | 获取所有标签（支持排序） |
| `get_tag` | `id: number` | `CommandResult<Tag \| null>` | 获取单个标签 |

### 内容集合 (Collections)

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `collect` | `request: CollectRequest` | `CommandResult<CollectResponse>` | 收集内容（插入或更新） |
| `get_collection` | `request: GetCollectionRequest` | `CommandResult<Collection \| null>` | 获取单个集合 |
| `get_collections` | `request: GetCollectionsRequest` | `CommandResult<CollectionListItem[]>` | 获取集合列表（支持分页和过滤） |
| `delete_collection` | `id: number` | `CommandResult<boolean>` | 软删除集合 |
| `permanently_delete_collection` | `request: CollectionOperationRequest` | `CommandResult<boolean>` | 永久删除集合 |
| `archive_collection` | `request: CollectionOperationRequest` | `CommandResult<void>` | 归档集合 |
| `restore_collection` | `request: CollectionOperationRequest` | `CommandResult<void>` | 恢复集合 |
| `toggle_collection_star` | `request: CollectionOperationRequest` | `CommandResult<boolean>` | 切换收藏状态 |
| `set_collection_favorite` | `request: SetCollectionFavoriteRequest` | `CommandResult<void>` | 设置集合所属收藏夹 |
| `get_collection_stats` | - | `CommandResult<CollectionStats>` | 获取集合统计信息 |

### 集合标签关联

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `add_collection_tags` | `request: AddCollectionTagsRequest` | `CommandResult<void>` | 为集合添加标签 |
| `remove_collection_tag` | `request: RemoveCollectionTagRequest` | `CommandResult<void>` | 移除集合的标签 |
| `get_collection_tags` | `request: GetCollectionTagsRequest` | `CommandResult<Tag[]>` | 获取集合的所有标签 |

### 搜索

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `search` | `request: SearchRequest` | `CommandResult<SearchResponse>` | 语义搜索 |
| `get_search_suggestions` | `query: string, limit?: number` | `CommandResult<SearchSuggestion[]>` | 获取搜索建议 |

### AI 元数据

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `update_collection_ai_metadata` | `id: number, aiMetadata: Value` | `CommandResult<void>` | 更新集合的 AI 元数据 |
| `get_collection_ai_metadata` | `collectionId: number` | `CommandResult<Value>` | 获取集合的完整 AI 元数据（包括分类、关键词、主题等） |
| `get_collection_keywords` | `collectionId: number` | `CommandResult<Keyword[]>` | 获取集合的关键词 |
| `get_collection_topics` | `collectionId: number` | `CommandResult<Topic[]>` | 获取集合的主题 |
| `get_ai_processing_logs` | `collectionId: number` | `CommandResult<AiProcessingLog[]>` | 获取 AI 处理日志 |

### 知识图谱 (Graph)

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `get_graph_data` | `filters: GraphFiltersRequest` | `CommandResult<GraphData>` | 获取图谱数据（用于可视化） |
| `discover_all_associations` | - | `CommandResult<number>` | 批量发现所有关联（异步） |
| `get_association_stats` | - | `CommandResult<Value>` | 获取关联统计信息（调试用） |

---

## 请求/响应格式

### CommandResult 包装

所有 Tauri 命令的响应都使用 `CommandResult<T>` 包装：

```typescript
type CommandResult<T> = {
  data: T
}
```

### CommandError

错误响应格式：

```typescript
type CommandError = {
  code: string
  message: string
}
```

---

## 使用示例

### 前端调用 Tauri Command

```typescript
import { invoke } from '@tauri-apps/api/core'

// 获取所有标签
const tags = await invoke<{ data: Tag[] }>('get_tags', { sort: 'name' })

// 创建标签
const tagId = await invoke<{ data: number }>('create_tag', {
  request: { name: '新标签' }
})

// 获取集合
const collection = await invoke<{ data: Collection | null }>('get_collection', {
  request: { id: 123 }
})
```

### HTTP 请求示例

```typescript
// 健康检查
const response = await fetch('http://127.0.0.1:21890/api/health')
const data = await response.json()

// 收集内容
const response = await fetch('http://127.0.0.1:21890/api/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    title: '标题',
    content: '内容'
  })
})
```

---

## 注意事项

1. **HTTP 服务器**主要用于浏览器扩展通信，默认端口为 `21890`
2. **Tauri Commands** 是应用内部的主要通信方式，提供类型安全的 IPC
3. 所有命令都支持错误处理，返回 `CommandError` 格式的错误信息
4. HTTP 端点使用 CORS，允许跨域请求（生产环境建议限制来源）
