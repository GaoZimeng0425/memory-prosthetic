# MCP 实现架构文档

**Created:** 2025-01-27
**Status:** Ready for Implementation
**Based on:** PRD - MCP 重构：从独立项目到后端 HTTP Server 实现

---

## 架构概述

### 设计原则

基于 Workflow Architecture 的 Micro-File Design 原则，MCP 实现采用模块化、自包含的设计：

1. **模块化设计** - 每个功能模块独立，职责清晰
2. **自包含** - 每个模块包含完整的实现逻辑
3. **最小化依赖** - 复用现有基础设施，避免重复
4. **渐进式集成** - 分步骤实现，每步可独立验证

### 核心目标

- ✅ 在现有 HTTP Server 中添加 `/mcp` 端点
- ✅ 使用官方 MCP Rust SDK (rmcp) 实现协议
- ✅ 支持 Streamable HTTP 传输方式
- ✅ 实现 `search` 工具，复用现有搜索 API，支持自然语言解析（如"搜索 react 收藏夹"）
- ✅ 实现 `list_collections` 工具，列出收集的文章，支持按收藏夹、标签、状态筛选
- ✅ 实现 `list_tags` 工具，列出所有标签
- ✅ 实现 `list_favorites` 工具，列出所有收藏夹
- ✅ 删除独立的 `apps/mcp/` Node.js 项目

---

## 模块结构

### 目录结构

```
apps/desktop/src-tauri/src/
├── server/
│   ├── mod.rs              # HTTP Server 模块入口
│   ├── routes.rs           # 路由定义（添加 /mcp 路由）
│   ├── handlers.rs         # 现有 API handlers
│   └── mcp/                # MCP 模块（新增）
│       ├── mod.rs          # MCP 模块入口
│       ├── service.rs      # MCP Service 实现
│       ├── tools.rs        # 工具实现（search）
│       ├── transport.rs    # HTTP 传输适配
│       └── error.rs        # MCP 错误处理
```

### 模块职责

#### `server/mcp/mod.rs` - MCP 模块入口

**职责：**

- 导出 MCP 模块的公共接口
- 定义模块级类型和常量
- 协调子模块

**关键导出：**

```rust
pub mod service;
pub mod tools;
pub mod transport;
pub mod error;

pub use service::McpService;
pub use transport::create_mcp_router;
```

#### `server/mcp/service.rs` - MCP Service 实现

**职责：**

- 实现 MCP 协议核心逻辑
- 管理工具注册和调用
- 处理协议消息（初始化、工具列表、工具调用）

**关键组件：**

```rust
pub struct McpService {
    // 工具实例
    search_tool: SearchTool,
    list_collections_tool: ListCollectionsTool,
    list_tags_tool: ListTagsTool,
    list_favorites_tool: ListFavoritesTool,
    // 应用状态引用
    app_state: Arc<AppState>,
}

impl McpService {
    // 初始化服务，创建所有工具实例
    pub fn new(app_state: Arc<AppState>) -> Self;

    // 处理工具列表请求
    pub async fn handle_list_tools(&self) -> Result<Value, McpModuleError>;

    // 处理工具调用请求
    pub async fn handle_call_tool(&self, name: &str, arguments: Value) -> Result<Value, McpModuleError>;
}
```

#### `server/mcp/tools.rs` - 工具实现

**职责：**

- 实现 `search` 工具，支持自然语言解析和复杂筛选
- 实现 `list_collections` 工具，列出收集的文章
- 实现 `list_tags` 工具，列出所有标签
- 实现 `list_favorites` 工具，列出所有收藏夹
- 调用现有 API handlers
- 格式化返回结果

**关键组件：**

```rust
// Search Tool - 支持自然语言解析和筛选
pub struct SearchTool {
    app_state: Arc<AppState>,
}

impl SearchTool {
    // 执行搜索，支持自然语言指令解析
    pub async fn execute(&self, args: SearchParams) -> Result<SearchToolResult, McpError>;

    // 解析自然语言指令，提取搜索关键词和筛选条件
    // 例如："搜索 react 收藏夹" -> query: "react", favorite_filter: "react"
    fn parse_natural_language(&self, input: &str) -> ParsedSearchQuery;

    // 格式化搜索结果
    fn format_results(&self, results: &[SearchResultItem], query: &str) -> String;
}

// List Collections Tool
pub struct ListCollectionsTool {
    app_state: Arc<AppState>,
}

impl ListCollectionsTool {
    // 列出收集的文章，支持筛选
    pub async fn execute(&self, args: ListCollectionsParams) -> Result<ListToolResult, McpError>;
}

// List Tags Tool
pub struct ListTagsTool {
    app_state: Arc<AppState>,
}

impl ListTagsTool {
    // 列出所有标签
    pub async fn execute(&self, args: ListTagsParams) -> Result<ListToolResult, McpError>;
}

// List Favorites Tool
pub struct ListFavoritesTool {
    app_state: Arc<AppState>,
}

impl ListFavoritesTool {
    // 列出所有收藏夹
    pub async fn execute(&self, args: ListFavoritesParams) -> Result<ListToolResult, McpError>;
}
```

**自然语言解析示例：**

```rust
// 解析自然语言指令，提取意图和参数
fn parse_natural_language(&self, input: &str) -> ParsedQuery {
    // "搜索 react 收藏夹" ->
    //   query: "react",
    //   favorite_filter: Some("react")

    // "列出所有标签" ->
    //   intent: ListTags

    // "显示 react 收藏夹中的文章" ->
    //   intent: ListCollections,
    //   favorite_filter: Some("react")

    // "搜索 react" ->
    //   query: "react"
}
```

#### `server/mcp/transport.rs` - HTTP 传输适配

**职责：**

- 实现 Streamable HTTP 传输
- 将 HTTP 请求转换为 MCP 协议消息
- 将 MCP 响应转换为 HTTP 响应
- 集成到 Axum 路由系统

**关键组件：**

```rust
pub fn create_mcp_router(service: Arc<McpService>) -> Router {
    Router::new()
        .route("/mcp", post(handle_mcp_request))
        .with_state(service)
}

async fn handle_mcp_request(
    State(service): State<Arc<McpService>>,
    body: axum::body::Body,
) -> Result<Response, StatusCode> {
    // 解析 HTTP 请求为 MCP 消息
    // 调用 MCP Service 处理
    // 返回 HTTP 响应
}
```

#### `server/mcp/error.rs` - 错误处理

**职责：**

- 定义 MCP 错误类型
- 映射业务错误到 MCP 错误码
- 提供友好的错误消息

**关键组件：**

```rust
pub enum McpError {
    InvalidRequest(String),
    MethodNotFound(String),
    InvalidParams(String),
    InternalError(String),
    DesktopAppNotRunning,
    SearchError(String),
}

impl From<McpError> for McpResponse {
    // 转换为标准 MCP 错误响应
}
```

---

## 集成方案

### 1. 路由集成

**修改 `server/routes.rs`：**

```rust
use super::mcp;

pub fn create_router(state: Arc<AppState>) -> Router {
    // 创建 MCP Service
    let mcp_service = Arc::new(mcp::McpService::new(state.clone()));

    Router::new()
        // 现有路由
        .route("/api/health", get(handlers::health))
        .route("/api/collect", post(handlers::collect))
        .route("/api/search", post(handlers::search))
        // MCP 路由
        .merge(mcp::transport::create_mcp_router(mcp_service))
        .with_state(state)
}
```

### 2. 依赖添加

**修改 `Cargo.toml`：**

```toml
[dependencies]
# 现有依赖...
rmcp = { version = "0.12.0", features = ["server"] }
```

### 3. 模块导出

**修改 `server/mod.rs`：**

```rust
mod routes;
mod handlers;
mod mcp;  // 新增

pub use routes::create_router;
```

---

## 实现步骤

### Phase 1: 基础框架搭建

**步骤 1.1：创建模块结构**

- [ ] 创建 `server/mcp/` 目录
- [ ] 创建 `mod.rs`, `service.rs`, `tools.rs`, `transport.rs`, `error.rs`
- [ ] 定义基础类型和接口

**步骤 1.2：添加依赖**

- [ ] 在 `Cargo.toml` 中添加 `rmcp` 依赖
- [ ] 验证依赖安装成功

**步骤 1.3：基础 Service 实现**

- [ ] 实现 `McpService` 结构体
- [ ] 实现工具注册机制
- [ ] 实现基础协议消息处理

### Phase 2: HTTP 传输实现

**步骤 2.1：HTTP 传输适配**

- [ ] 实现 `create_mcp_router` 函数
- [ ] 实现 HTTP 请求到 MCP 消息的转换
- [ ] 实现 MCP 响应到 HTTP 响应的转换
- [ ] 支持 Streamable HTTP

**步骤 2.2：路由集成**

- [ ] 在 `routes.rs` 中集成 MCP 路由
- [ ] 测试 `/mcp` 端点可访问

### Phase 3: 工具实现

**步骤 3.1：Search 工具实现**

- [ ] 实现 `SearchTool` 结构体
- [ ] 实现自然语言解析逻辑（支持"搜索 react 收藏夹"等复杂指令）
- [ ] 实现收藏夹名称匹配和筛选
- [ ] 调用现有 `handlers::search` 函数或直接使用数据库查询
- [ ] 实现结果格式化

**步骤 3.2：List Collections 工具实现**

- [ ] 实现 `ListCollectionsTool` 结构体
- [ ] 支持按收藏夹名称筛选（模糊匹配）
- [ ] 支持按标签筛选
- [ ] 支持按状态筛选（active, archived, deleted）
- [ ] 支持分页参数
- [ ] 调用现有 `handlers::get_collections` 或直接使用数据库查询
- [ ] 实现结果格式化

**步骤 3.3：List Tags 工具实现**

- [ ] 实现 `ListTagsTool` 结构体
- [ ] 支持排序参数（name, created_at, usage）
- [ ] 调用现有 `handlers::get_tags` 或直接使用数据库查询
- [ ] 实现结果格式化

**步骤 3.4：List Favorites 工具实现**

- [ ] 实现 `ListFavoritesTool` 结构体
- [ ] 调用现有 `handlers::get_favorites` 或直接使用数据库查询
- [ ] 实现结果格式化（包含每个收藏夹的文章数量）

**步骤 3.5：工具注册**

- [ ] 在 Service 初始化时创建所有工具实例
- [ ] 在 `handle_list_tools` 中注册所有工具定义
- [ ] 在 `handle_call_tool` 中实现所有工具的路由

### Phase 4: 错误处理

**步骤 4.1：错误类型定义**

- [ ] 定义 `McpError` 枚举
- [ ] 实现错误到 MCP 错误码的映射
- [ ] 实现友好的错误消息

**步骤 4.2：错误处理集成**

- [ ] 在工具调用中集成错误处理
- [ ] 处理桌面应用未运行的情况
- [ ] 处理搜索 API 错误

### Phase 5: 测试和验证

**步骤 5.1：单元测试**

- [ ] 测试 MCP Service 初始化
- [ ] 测试工具注册和调用
- [ ] 测试错误处理

**步骤 5.2：集成测试**

- [ ] 测试 `/mcp` 端点连接
- [ ] 测试 `search` 工具调用
- [ ] 测试错误场景

**步骤 5.3：端到端测试**

- [ ] 使用 Claude Desktop 或 Cursor 测试连接
- [ ] 验证搜索功能正常工作
- [ ] 验证错误处理友好

### Phase 6: 代码清理

**步骤 6.1：删除独立项目**

- [ ] 删除 `apps/mcp/` 目录
- [ ] 删除相关依赖和配置

**步骤 6.2：文档更新**

- [ ] 更新 README，移除独立 MCP 项目说明
- [ ] 更新配置示例，使用 URL 配置方式
- [ ] 更新架构文档

---

## 技术细节

### MCP 协议消息格式

**初始化请求：**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**工具调用请求示例：**

```json
// Search 工具 - 基础搜索
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "React 文章",
      "limit": 10
    }
  }
}

// Search 工具 - 自然语言指令（支持筛选）
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "搜索 react 收藏夹",
      "limit": 20
    }
  }
}

// List Collections 工具
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "list_collections",
    "arguments": {
      "favorite_name": "react",
      "limit": 50,
      "offset": 0,
      "status": "active"
    }
  }
}

// List Tags 工具
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "list_tags",
    "arguments": {
      "sort": "usage"
    }
  }
}

// List Favorites 工具
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "list_favorites",
    "arguments": {}
  }
}
```

### Streamable HTTP 传输

**请求格式：**

- Method: POST
- Path: `/mcp`
- Content-Type: `application/json`
- Body: JSON-RPC 2.0 消息

**响应格式：**

- Status: 200 OK
- Content-Type: `application/json`
- Body: JSON-RPC 2.0 响应

### 与现有代码集成

**复用现有资源：**

- `AppState` - 共享应用状态
- `handlers::search` - 复用搜索逻辑（或直接使用数据库查询）
- `handlers::get_collections` - 复用列表查询逻辑（或直接使用数据库查询）
- `handlers::get_tags` - 复用标签查询逻辑（或直接使用数据库查询）
- `handlers::get_favorites` - 复用收藏夹查询逻辑（或直接使用数据库查询）
- 数据库连接 - 共享连接池
- Repository 模式 - 直接使用 `CollectionRepository`, `TagRepository`, `FavoriteRepository`
- 错误处理模式 - 保持一致

**最小化改动：**

- 不修改现有 API 端点
- 不修改现有 handlers
- 仅添加新的 MCP 模块和工具
- 仅在路由中添加新端点
- MCP 工具可以直接调用 Repository，无需通过 HTTP handlers

### 自然语言解析策略

**Search 工具的自然语言解析：**

支持以下自然语言模式：

1. **基础搜索：** "搜索 react" → `query: "react"`
2. **收藏夹筛选：** "搜索 react 收藏夹" → `query: "react"`, `favorite_filter: "react"`
3. **标签筛选：** "搜索带标签 react 的内容" → `query: "react"`, `tag_filter: "react"`
4. **组合筛选：** "在 react 收藏夹中搜索 hooks" → `query: "hooks"`, `favorite_filter: "react"`

**解析实现：**

```rust
fn parse_natural_language(&self, input: &str) -> ParsedSearchQuery {
    let mut query = input.to_string();
    let mut favorite_filter: Option<String> = None;
    let mut tag_filter: Option<String> = None;

    // 移除常见前缀
    query = query.replace("使用MP搜索", "")
                .replace("使用 MP 搜索", "")
                .replace("搜索", "")
                .replace("查找", "");

    // 检测收藏夹筛选关键词
    if query.contains("收藏夹") {
        // 提取收藏夹名称（在"收藏夹"前后的词）
        // 例如："react 收藏夹" -> favorite_filter: "react"
        if let Some(captures) = regex::Regex::new(r"(\w+)\s*收藏夹")
            .unwrap()
            .captures(&query) {
            favorite_filter = captures.get(1).map(|m| m.as_str().to_string());
            query = query.replace(&format!("{} 收藏夹", favorite_filter.as_ref().unwrap()), "");
        }
    }

    // 检测标签筛选关键词
    if query.contains("标签") {
        // 类似处理标签筛选
    }

    ParsedSearchQuery {
        query: query.trim().to_string(),
        favorite_filter,
        tag_filter,
    }
}
```

**List Collections 工具的参数解析：**

支持以下查询模式：

1. **列出所有文章：** "列出所有文章" → 无筛选条件
2. **按收藏夹筛选：** "列出 react 收藏夹中的文章" → `favorite_name: "react"`
3. **按标签筛选：** "列出带 react 标签的文章" → `tag_name: "react"`
4. **组合筛选：** "列出 react 收藏夹中已归档的文章" → `favorite_name: "react"`, `status: "archived"`

**实现方式：**

- 支持直接传递结构化参数（推荐）
- 也支持自然语言参数解析（可选，作为增强功能）

---

## 验证清单

### MVP 验收标准

- [ ] 用户可以通过 URL `http://127.0.0.1:21890/mcp` 连接 MCP 服务
- [ ] MCP 服务支持 Streamable HTTP 传输方式
- [ ] `search` 工具正常工作，支持自然语言解析（如"搜索 react 收藏夹"）
- [ ] `list_collections` 工具正常工作，支持按收藏夹、标签、状态筛选
- [ ] `list_tags` 工具正常工作，返回所有标签列表
- [ ] `list_favorites` 工具正常工作，返回所有收藏夹列表
- [ ] 所有工具返回格式化的、易读的结果
- [ ] 错误处理友好，返回标准 MCP 错误响应
- [ ] 配置简化，只需添加 URL，无需本地文件
- [ ] 独立的 `apps/mcp/` 项目已删除
- [ ] 文档已更新，移除独立 MCP 项目说明

### 功能验证场景

**场景 1：自然语言搜索**

- 用户输入："搜索 react 收藏夹"
- 预期：解析出搜索关键词 "react" 和收藏夹筛选条件 "react"
- 预期：返回 react 收藏夹中与 "react" 相关的文章列表

**场景 2：列出收藏夹内容**

- 用户输入："列出 react 收藏夹中的所有文章"
- 预期：调用 `list_collections` 工具，筛选条件为收藏夹名称包含 "react"
- 预期：返回完整的文章列表，包含标题、URL、创建时间等信息

**场景 3：列出所有标签**

- 用户输入："显示所有标签"
- 预期：调用 `list_tags` 工具
- 预期：返回所有标签的列表，包含标签名称、颜色、使用次数等信息

**场景 4：列出所有收藏夹**

- 用户输入："有哪些收藏夹？"
- 预期：调用 `list_favorites` 工具
- 预期：返回所有收藏夹的列表，包含收藏夹名称、图标、文章数量等信息

### 性能验证

- [ ] MCP 端点响应时间 < 100ms（不含搜索时间）
- [ ] 连接建立时间 < 2 秒
- [ ] 与现有 API 性能一致，无性能退化

### 兼容性验证

- [ ] 兼容 Claude Desktop
- [ ] 兼容 Cursor
- [ ] 遵循 MCP 协议标准
- [ ] 与现有 API 端点兼容

---

## 风险缓解

### 技术风险

**风险：rmcp SDK 集成复杂度**

- **缓解**：使用官方 SDK，参考示例代码，分步实现
- **备选**：如果 SDK 集成困难，可以考虑手动实现协议核心部分

**风险：HTTP 传输方式实现**

- **缓解**：参考 MCP 协议规范和 SDK 文档
- **备选**：先实现基础功能，再优化传输方式

**风险：与现有代码集成**

- **缓解**：复用现有 `AppState` 和 handlers，最小化改动
- **备选**：保持现有 API 不变，MCP 作为适配层

### 范围控制

- **严格 MVP 边界**：只实现"能联通使用"所需的功能
- **延后非核心功能**：认证、多工具等功能放到 Phase 2
- **保持简单**：避免过度设计，优先可用性

---

## 后续扩展

### Phase 2 功能（Post-MVP）

1. **更多 MCP 工具**
   - 内容收集工具（通过 MCP 收集网页内容）
   - 标签管理工具（创建、更新、删除标签）
   - 收藏夹管理工具（创建、更新、删除收藏夹）
   - 文章管理工具（归档、删除、更新文章）

2. **增强自然语言解析**
   - 更智能的意图识别
   - 支持更复杂的查询组合
   - 支持模糊匹配和同义词

3. **MCP 资源（Resources）**
   - 提供知识库资源列表
   - 支持资源查询和访问
   - 支持资源订阅和更新通知

4. **性能优化**
   - 连接池管理
   - 请求缓存
   - 批量操作支持
   - 搜索结果缓存

### Phase 3 功能（未来扩展）

1. **认证和授权**
   - API Key 认证
   - OAuth 认证支持
   - 多用户支持

2. **跨平台支持**
   - 支持远程连接（非 localhost）
   - 支持 HTTPS
   - 支持多实例部署

---

## 参考资源

- [MCP Specification](https://modelcontextprotocol.github.io/specification/)
- [MCP Rust SDK (rmcp)](https://github.com/modelcontextprotocol/rust-sdk)
- [PRD - MCP 重构](docs/planning-artifacts/prd-mcp-refactor.md)
- [Axum Documentation](https://docs.rs/axum/)

---

---

## MCP 工具详细设计

### 1. Search 工具

**工具名称：** `search`

**描述：** 在 Memory Prosthetic 中执行语义搜索，支持自然语言查询和筛选条件。

**参数：**

```json
{
  "query": "搜索关键词或自然语言指令（如'搜索 react 收藏夹'）",
  "limit": 10,
  "favorite_name": "可选，按收藏夹名称筛选",
  "tag_name": "可选，按标签名称筛选",
  "status": "可选，按状态筛选：active, archived, deleted"
}
```

**自然语言解析示例：**

| 用户输入 | 解析结果 |
|---------|---------|
| "搜索 react" | `query: "react"` |
| "搜索 react 收藏夹" | `query: "react"`, `favorite_name: "react"` |
| "在 react 收藏夹中搜索 hooks" | `query: "hooks"`, `favorite_name: "react"` |
| "搜索带 react 标签的内容" | `query: "react"`, `tag_name: "react"` |

**返回格式：**

```json
{
  "content": [{
    "type": "text",
    "text": "找到 5 条与\"react\"相关的内容：\n\n1. [React Hooks 指南](https://example.com/react-hooks) (相似度: 95%)\n2. [React 最佳实践](https://example.com/react-best-practices) (相似度: 88%)\n..."
  }]
}
```

### 2. List Collections 工具

**工具名称：** `list_collections`

**描述：** 列出收集的文章列表，支持按收藏夹、标签、状态筛选。

**参数：**

```json
{
  "favorite_name": "可选，收藏夹名称（支持模糊匹配）",
  "tag_name": "可选，标签名称（支持模糊匹配）",
  "status": "可选，状态筛选：active, archived, deleted",
  "limit": 50,
  "offset": 0
}
```

**使用示例：**

- "列出所有文章" → 无筛选条件
- "列出 react 收藏夹中的文章" → `favorite_name: "react"`
- "列出带 react 标签的文章" → `tag_name: "react"`
- "列出已归档的文章" → `status: "archived"`

**返回格式：**

```json
{
  "content": [{
    "type": "text",
    "text": "找到 10 篇文章：\n\n1. [React Hooks 指南](https://example.com/react-hooks)\n   收藏夹: React\n   标签: react, hooks\n   创建时间: 2024-01-01\n\n2. [React 最佳实践](https://example.com/react-best-practices)\n   ..."
  }]
}
```

### 3. List Tags 工具

**工具名称：** `list_tags`

**描述：** 列出所有标签，支持排序。

**参数：**

```json
{
  "sort": "可选，排序方式：name（按名称）, created_at（按创建时间）, usage（按使用次数）"
}
```

**返回格式：**

```json
{
  "content": [{
    "type": "text",
    "text": "共有 15 个标签：\n\n1. react (使用次数: 42, 颜色: #3b82f6)\n2. javascript (使用次数: 38, 颜色: #f59e0b)\n3. typescript (使用次数: 25, 颜色: #3178c6)\n..."
  }]
}
```

### 4. List Favorites 工具

**工具名称：** `list_favorites`

**描述：** 列出所有收藏夹，包含每个收藏夹的文章数量。

**参数：** 无

**返回格式：**

```json
{
  "content": [{
    "type": "text",
    "text": "共有 8 个收藏夹：\n\n1. React (文章数: 15, 图标: folder)\n2. JavaScript (文章数: 23, 图标: folder)\n3. 未分类 (文章数: 5, 图标: folder)\n..."
  }]
}
```

---

**文档状态：** Ready for Implementation
**最后更新：** 2025-01-27
**更新内容：** 添加 list_collections, list_tags, list_favorites 工具设计，增强 search 工具的自然语言解析能力
