# 集成架构 (Integration Architecture)

**项目:** Memory Prosthetic
**更新日期:** 2025-12-22
**仓库类型:** Monorepo

---

## 🔗 系统概览

Memory Prosthetic 是一个多部分系统，由桌面应用、浏览器插件和共享包组成。

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Prosthetic System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Browser Extension (WXT)                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐│    │
│  │  │ Popup    │  │ Content  │  │ Background             ││    │
│  │  │ (React)  │  │ Script   │  │ (Service Worker)       ││    │
│  │  └──────────┘  └──────────┘  └────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              │ HTTP (localhost:21890)            │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Desktop App (Tauri)                      │    │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐│    │
│  │  │    React Frontend    │  │      Rust Backend        ││    │
│  │  │  ┌────────────────┐ │  │  ┌──────────────────────┐││    │
│  │  │  │ SearchBar      │ │  │  │ HTTP Server (Axum)   │││    │
│  │  │  │ SearchResults  │ │  │  │   /api/health        │││    │
│  │  │  │ CollectionList │ │  │  │   /api/collect       │││    │
│  │  │  │ SettingsPanel  │ │◄─IPC─►│   /api/search        │││    │
│  │  │  └────────────────┘ │  │  └──────────────────────┘││    │
│  │  │                      │  │  ┌──────────────────────┐││    │
│  │  │                      │  │  │ SQLite + sqlite-vec  │││    │
│  │  │                      │  │  └──────────────────────┘││    │
│  │  │                      │  │  ┌──────────────────────┐││    │
│  │  │                      │  │  │ Embedding (ONNX)     │││    │
│  │  │                      │  │  └──────────────────────┘││    │
│  │  └──────────────────────┘  └──────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Shared Packages                       │    │
│  │  ┌─────────────────────┐  ┌───────────────────────────┐│    │
│  │  │ @mp/shared          │  │ @mp/ui                    ││    │
│  │  │ - Types (API, Tauri)│  │ - 56 shadcn/ui 组件       ││    │
│  │  │ - Utils             │  │ - Tailwind 样式           ││    │
│  │  └─────────────────────┘  └───────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 通信协议

### Browser Extension → Desktop App

| 协议 | 端点 | 方法 | 用途 |
|------|------|------|------|
| HTTP | `localhost:21890/api/health` | GET | 检测应用是否运行 |
| HTTP | `localhost:21890/api/collect` | POST | 收集网页内容 |
| HTTP | `localhost:21890/api/search` | GET | 搜索 (可选) |

### React Frontend ↔ Rust Backend

| 协议 | 方向 | 用途 |
|------|------|------|
| Tauri IPC Commands | Frontend → Backend | 调用 Rust 函数 |
| Tauri Events | Backend → Frontend | 推送事件通知 |

---

## 🔄 数据流

### 内容收集流程

```
1. 用户点击浏览器插件
      │
      ▼
2. content.ts 提取页面内容
   - URL
   - 标题
   - 正文 (使用 Readability)
      │
      ▼
3. background.ts 发送 HTTP 请求
   POST /api/collect
   { url, title, content }
      │
      ▼
4. Rust HTTP Server 接收
   handlers.rs → collect_handler()
      │
      ├──────────────────────────┐
      ▼                          ▼
5. db/collections.rs        embedding/service.rs
   存储到 SQLite             生成 384 维向量
      │                          │
      ▼                          ▼
6. collections 表            embeddings 表
      │                          │
      └──────────┬───────────────┘
                 ▼
7. 返回 { success: true, id: <collection_id> }
      │
      ▼
8. 插件显示 "已收集 ✓"
```

### 搜索流程

```
1. 用户按下全局快捷键 (Cmd+Shift+Space)
      │
      ▼
2. Tauri 显示搜索窗口 (SearchWindow.tsx)
      │
      ▼
3. 用户输入搜索词
      │
      ▼
4. use-search.ts 调用
   invoke("search", { query })
      │
      ▼
5. Rust lib.rs search() 命令
      │
      ├──────────────────────────┐
      ▼                          ▼
6. embedding/service.rs      db/embeddings.rs
   query → 384 维向量        向量相似度搜索
                                  │
                                  ▼
7.                           db/collections.rs
                             获取匹配的内容
      │
      ▼
8. 返回 Vec<SearchResult>
   { id, title, url, snippet, score }
      │
      ▼
9. SearchResults.tsx 显示结果
      │
      ▼
10. 用户点击结果 → 跳转原文
```

---

## 📊 集成点详情

### 1. Browser Extension → Desktop HTTP Server

**请求格式:**

```typescript
// 健康检查
GET /api/health
Response: { status: "ok", version: "0.1.0" }

// 收集内容
POST /api/collect
Content-Type: application/json
{
  "url": "https://example.com/article",
  "title": "文章标题",
  "content": "文章正文内容..."
}
Response: { success: true, id: 123 }
```

**错误处理:**

```typescript
// 连接失败
{ error: "Connection refused" }

// 服务器错误
{ success: false, error: { code: "DB_ERROR", message: "..." } }
```

### 2. React Frontend ↔ Rust Backend (Tauri IPC)

**Commands:**

```typescript
// 搜索
invoke<SearchResult[]>("search", { query: "react 状态管理" })

// 获取收集列表
invoke<Collection[]>("get_collections")

// 删除收集
invoke<void>("delete_collection", { id: 123 })

// 获取设置
invoke<Settings>("get_settings")

// 保存设置
invoke<void>("set_settings", { settings })
```

**Events:**

```typescript
// 收集完成
listen<CollectionCompletedPayload>("collection:completed", (event) => {
  console.log("新收集:", event.payload)
})

// Embedding 进度
listen<EmbeddingProgressPayload>("embedding:progress", (event) => {
  console.log("进度:", event.payload.progress)
})
```

### 3. 共享包依赖

```typescript
// @memory-prosthetic/shared
export type CollectRequest = {
  url: string
  title: string
  content: string
}

export type SearchResult = {
  id: number
  title: string
  url: string
  snippet: string
  score: number
}

// 使用
import type { CollectRequest, SearchResult } from '@memory-prosthetic/shared/types'
```

```typescript
// @memory-prosthetic/ui
import { Button, Dialog, Input, Command } from '@memory-prosthetic/ui'
```

---

## 🔐 安全考虑

### HTTP Server 安全

| 措施 | 说明 |
|------|------|
| **localhost only** | 仅监听 127.0.0.1 |
| **CORS 配置** | 仅允许浏览器插件源 |
| **Token 验证 (可选)** | Bearer Token 认证 |

### 数据安全

| 措施 | 说明 |
|------|------|
| **本地存储** | 所有数据存储在 `~/Library/Application Support/` |
| **无遥测** | 不收集用户数据 |
| **无外部 API** | 核心功能完全本地 |

---

## 🔧 配置

### HTTP Server 端口

默认: `21890`

可通过设置页面修改，修改后需重启应用。

### 全局快捷键

默认: `Cmd+Shift+Space` (macOS)

可通过设置页面自定义。

---

## 📁 相关文件

| 部分 | 关键文件 | 说明 |
|------|----------|------|
| **Browser Extension** | `src/utils/api.ts` | HTTP 客户端 |
| **Browser Extension** | `src/entrypoints/background.ts` | 请求转发 |
| **Desktop** | `src-tauri/src/server/` | HTTP Server |
| **Desktop** | `src-tauri/src/lib.rs` | Tauri Commands |
| **Shared** | `src/types/api.ts` | API 类型定义 |

---

*本文档由 BMAD Document Project Workflow 自动生成*
