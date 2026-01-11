# API参考

<cite>
**本文档中引用的文件**   
- [handlers.rs](file://apps/desktop/src-tauri/src/server/handlers.rs)
- [routes.rs](file://apps/desktop/src-tauri/src/server/routes.rs)
- [transport.rs](file://apps/desktop/src-tauri/src/server/mcp/transport.rs)
- [service.rs](file://apps/desktop/src-tauri/src/server/mcp/service.rs)
- [tools.rs](file://apps/desktop/src-tauri/src/server/mcp/tools.rs)
- [error.rs](file://apps/desktop/src-tauri/src/server/mcp/error.rs)
- [api.ts](file://packages/shared/src/types/api.ts)
- [mcp-refactor.md](file://docs/planning-artifacts/prd-mcp-refactor.md)
</cite>

## 目录
1. [简介](#简介)
2. [/api/health](#apihealth)
3. [/api/collect](#apicollect)
4. [/api/search](#apisearch)
5. [/mcp](#mcp)

## 简介
本API参考文档详细描述了Memory Prosthetic应用暴露的所有公共接口。文档涵盖了健康检查、内容收集、语义搜索以及MCP（Model Context Protocol）协议端点。每个API端点都提供了HTTP方法、URL路径、请求参数、请求头、响应格式（包括成功和错误状态码）以及示例。特别关注/mcp端点，因为它遵循特定的协议规范，允许AI助手与本地知识库进行交互。

**Section sources**
- [handlers.rs](file://apps/desktop/src-tauri/src/server/handlers.rs#L1-L50)
- [mcp-refactor.md](file://docs/planning-artifacts/prd-mcp-refactor.md#L1-L100)

## /api/health
健康检查端点，用于验证服务器是否正常运行。

### HTTP方法
`GET`

### URL路径
`/api/health`

### 请求参数
无

### 请求头
无

### 响应格式
成功响应返回200状态码和JSON对象，包含服务状态和版本信息。

```json
{
  "status": "ok",
  "version": "string"
}
```

### 成功状态码
- `200 OK` - 服务器正常运行

### 错误状态码
无

### 示例
```bash
curl http://127.0.0.1:21890/api/health
```

响应：
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

**Section sources**
- [handlers.rs](file://apps/desktop/src-tauri/src/server/handlers.rs#L108-L117)
- [routes.rs](file://apps/desktop/src-tauri/src/server/routes.rs#L23)

## /api/collect
从浏览器扩展收集网页内容的端点。

### HTTP方法
`POST`

### URL路径
`/api/collect`

### 请求参数
请求体为JSON格式，包含以下字段：

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `url` | string | 是 | 收集内容的URL |
| `title` | string | 是 | 内容标题 |
| `content` | string | 是 | HTML内容或文本内容 |
| `favoriteId` | number | 否 | 关联的收藏夹ID |
| `tags` | number[] | 否 | 关联的标签ID数组 |

### 请求头
- `Content-Type: application/json`

### 响应格式
成功响应返回200状态码和包含新创建内容ID的JSON对象。

```json
{
  "success": true,
  "data": {
    "id": 123
  }
}
```

错误响应返回相应的错误状态码和错误信息。

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "URL is required"
  }
}
```

### 成功状态码
- `200 OK` - 内容收集成功

### 错误状态码
- `400 Bad Request` - 请求参数无效（如缺少必需字段）
- `500 Internal Server Error` - 服务器内部错误

### 示例
```bash
curl -X POST http://127.0.0.1:21890/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "title": "示例文章",
    "content": "<html>文章内容</html>"
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "id": 456
  }
}
```

**Section sources**
- [handlers.rs](file://apps/desktop/src-tauri/src/server/handlers.rs#L119-L203)
- [routes.rs](file://apps/desktop/src-tauri/src/server/routes.rs#L25)
- [api.ts](file://packages/shared/src/types/api.ts#L28-L65)

## /api/search
执行语义搜索以查找与查询最相似的内容。

### HTTP方法
`POST`

### URL路径
`/api/search`

### 请求参数
请求体为JSON格式，包含以下字段：

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `query` | string | 是 | 搜索查询字符串 |
| `limit` | number | 否 | 返回结果的最大数量（默认10，最大100） |

### 请求头
- `Content-Type: application/json`

### 响应格式
成功响应返回200状态码和包含搜索结果的JSON对象。

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
        "created_at": "2024-01-01T00:00:00Z",
        "type": "网页"
      }
    ],
    "query": "搜索查询"
  }
}
```

错误响应返回相应的错误状态码和错误信息。

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Query is required"
  }
}
```

### 成功状态码
- `200 OK` - 搜索成功，返回结果

### 错误状态码
- `400 Bad Request` - 请求参数无效（如查询为空）
- `503 Service Unavailable` - 嵌入模型不可用
- `500 Internal Server Error` - 搜索失败

### 示例
```bash
curl -X POST http://127.0.0.1:21890/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "前端框架",
    "limit": 5
  }'
```

响应：
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 123,
        "url": "https://react.dev",
        "title": "React - 用于构建用户界面的JavaScript库",
        "similarity": 0.98,
        "created_at": "2024-01-01T00:00:00Z",
        "type": "网页"
      }
    ],
    "query": "前端框架"
  }
}
```

**Section sources**
- [handlers.rs](file://apps/desktop/src-tauri/src/server/handlers.rs#L206-L313)
- [routes.rs](file://apps/desktop/src-tauri/src/server/routes.rs#L27)
- [api.ts](file://packages/shared/src/types/api.ts#L74-L103)

## /mcp
MCP（Model Context Protocol）端点，允许AI助手通过标准协议与本地知识库进行交互。

### HTTP方法
- `POST` - 发送JSON-RPC 2.0请求
- `GET` - 建立SSE连接（可选，用于通知）
- `DELETE` - 关闭会话
- `OPTIONS` - CORS预检请求

### URL路径
`/mcp`

### 请求参数
使用JSON-RPC 2.0协议格式。请求体为JSON对象，包含以下字段：

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `jsonrpc` | string | 是 | 协议版本，必须为"2.0" |
| `id` | string/number/null | 否 | 请求ID，用于匹配响应（通知时为null） |
| `method` | string | 是 | 调用的方法名 |
| `params` | object | 否 | 方法参数 |

### 请求头
- `Content-Type: application/json`

### 响应格式
遵循JSON-RPC 2.0协议格式。响应体为JSON对象，包含以下字段：

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": { /* 方法返回结果 */ },
  "error": { /* 错误信息 */ }
}
```

对于错误响应：
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

### 支持的方法
#### `initialize`
初始化MCP客户端会话。

**参数：**
```json
{
  "clientInfo": {
    "name": "string",
    "version": "string"
  }
}
```

**返回结果：**
```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {
    "tools": {}
  },
  "serverInfo": {
    "name": "Memory Prosthetic",
    "version": "string"
  }
}
```

#### `tools/list`
获取可用工具列表。

**参数：** 无

**返回结果：**
```json
{
  "tools": [
    {
      "name": "search",
      "description": "在 Memory Prosthetic 中搜索用户已收集的内容。",
      "inputSchema": { /* JSON Schema 定义 */ }
    },
    {
      "name": "list_collections",
      "description": "列出收集的文章列表。",
      "inputSchema": { /* JSON Schema 定义 */ }
    },
    {
      "name": "list_tags",
      "description": "列出所有标签。",
      "inputSchema": { /* JSON Schema 定义 */ }
    },
    {
      "name": "list_favorites",
      "description": "列出所有收藏夹。",
      "inputSchema": { /* JSON Schema 定义 */ }
    }
  ]
}
```

#### `tools/call`
调用指定工具。

**参数：**
```json
{
  "name": "工具名称",
  "arguments": { /* 工具参数 */ }
}
```

**返回结果：** 工具执行结果

### 成功状态码
- `200 OK` - JSON-RPC请求处理成功

### 错误状态码
- `400 Bad Request` - 请求格式无效
- `405 Method Not Allowed` - HTTP方法不支持
- `500 Internal Server Error` - 服务器内部错误

### MCP错误码
遵循JSON-RPC 2.0标准错误码：

| 错误码 | 描述 |
|-------|------|
| `-32700` | Parse error - JSON解析错误 |
| `-32600` | Invalid Request - 无效请求 |
| `-32601` | Method not found - 方法未找到 |
| `-32602` | Invalid params - 参数无效 |
| `-32603` | Internal error - 内部错误 |

### 示例
```bash
curl -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list",
    "params": null
  }'
```

响应：
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "tools": [
      {
        "name": "search",
        "description": "在 Memory Prosthetic 中搜索用户已收集的内容。",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "搜索关键词或自然语言指令"
            },
            "limit": {
              "type": "integer",
              "description": "返回结果的最大数量",
              "default": 10,
              "minimum": 1,
              "maximum": 100
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

**Section sources**
- [transport.rs](file://apps/desktop/src-tauri/src/server/mcp/transport.rs#L48-L276)
- [service.rs](file://apps/desktop/src-tauri/src/server/mcp/service.rs#L39-L166)
- [tools.rs](file://apps/desktop/src-tauri/src/server/mcp/tools.rs#L17-L704)
- [error.rs](file://apps/desktop/src-tauri/src/server/mcp/error.rs#L6-L22)
- [mcp-refactor.md](file://docs/planning-artifacts/prd-mcp-refactor.md#L456-L458)