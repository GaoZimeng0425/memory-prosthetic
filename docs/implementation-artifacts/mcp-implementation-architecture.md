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
- ✅ 实现 `search` 工具，复用现有搜索 API
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
    // 工具注册表
    tools: HashMap<String, ToolHandler>,
    // 应用状态引用
    app_state: Arc<AppState>,
}

impl McpService {
    // 初始化服务
    pub fn new(app_state: Arc<AppState>) -> Self;

    // 注册工具
    pub fn register_tool(&mut self, name: String, handler: ToolHandler);

    // 处理协议消息
    pub async fn handle_request(&self, request: McpRequest) -> McpResponse;
}
```

#### `server/mcp/tools.rs` - 工具实现

**职责：**

- 实现 `search` 工具
- 解析自然语言搜索指令
- 调用现有搜索 API
- 格式化返回结果

**关键组件：**

```rust
pub struct SearchTool {
    app_state: Arc<AppState>,
}

impl SearchTool {
    // 执行搜索
    pub async fn execute(&self, args: SearchArgs) -> Result<String, McpError>;

    // 解析自然语言指令
    fn extract_query(&self, input: &str) -> String;

    // 格式化搜索结果
    fn format_results(&self, results: &[SearchResultItem], query: &str) -> String;
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

### Phase 3: Search 工具实现

**步骤 3.1：Search 工具实现**

- [ ] 实现 `SearchTool` 结构体
- [ ] 实现自然语言解析逻辑
- [ ] 调用现有 `handlers::search` 函数
- [ ] 实现结果格式化

**步骤 3.2：工具注册**

- [ ] 在 Service 初始化时注册 `search` 工具
- [ ] 实现工具调用路由

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

**工具调用请求：**

```json
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
- `handlers::search` - 复用搜索逻辑
- 数据库连接 - 共享连接池
- 错误处理模式 - 保持一致

**最小化改动：**

- 不修改现有 API 端点
- 不修改现有 handlers
- 仅添加新的 MCP 模块
- 仅在路由中添加新端点

---

## 验证清单

### MVP 验收标准

- [ ] 用户可以通过 URL `http://127.0.0.1:21890/mcp` 连接 MCP 服务
- [ ] MCP 服务支持 Streamable HTTP 传输方式
- [ ] `search` 工具正常工作，返回格式化的搜索结果
- [ ] 错误处理友好，返回标准 MCP 错误响应
- [ ] 配置简化，只需添加 URL，无需本地文件
- [ ] 独立的 `apps/mcp/` 项目已删除
- [ ] 文档已更新，移除独立 MCP 项目说明

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
   - 内容收集工具
   - 标签管理工具
   - 收藏管理工具

2. **MCP 资源（Resources）**
   - 提供知识库资源列表
   - 支持资源查询和访问

3. **性能优化**
   - 连接池管理
   - 请求缓存
   - 批量操作支持

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

**文档状态：** Ready for Implementation
**最后更新：** 2025-01-27
