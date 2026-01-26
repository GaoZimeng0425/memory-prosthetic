---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - docs/project-context.md
  - docs/architecture.md
  - docs/implementation-artifacts/tech-spec-epic-8-mcp-integration.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 3
workflowType: 'prd'
lastStep: 11
revision: 1
revisionDate: '2025-01-27'
project_name: 'Memory Prosthetic'
user_name: 'Gao'
date: '2025-01-27'
status: 'complete'
---

# Product Requirements Document - MCP 重构：从独立项目到后端 HTTP Server 实现

**Author:** Gao
**Date:** 2025-01-27

---

## Executive Summary

### 重构目标

将 Memory Prosthetic 的 MCP（Model Context Protocol）实现从独立的 Node.js 项目重构为集成在桌面应用 HTTP Server 中的纯后端实现。这一重构将消除对本地文件路径的依赖，简化用户配置流程，并统一系统架构。

### 核心问题

当前 MCP 实现存在以下问题：

1. **本地路径依赖** - 用户需要在 `mcp.json` 配置文件中指定本地 JavaScript 文件路径，需要手动下载和管理文件
2. **部署复杂** - 独立的 Node.js 项目增加了部署和维护成本
3. **架构分离** - MCP 功能与桌面应用 HTTP Server 分离，增加了系统复杂度

### 解决方案

在桌面应用的 Rust HTTP Server（Axum）中直接实现 MCP 协议，提供 HTTP 端点供 AI 助手通过 URL 连接：

1. **统一架构** - MCP 功能集成到现有 HTTP Server（`localhost:21890`）
2. **URL 访问** - 通过 `http://127.0.0.1:21890/mcp` 端点提供服务
3. **简化配置** - AI 助手配置从本地路径改为 URL：

   ```json
   {
     "memory-prosthetic": {
       "url": "http://127.0.0.1:21890/mcp"
     }
   }
   ```

4. **传输方式** - 使用 Streamable HTTP（MCP 协议推荐的 HTTP 传输方式）

### What Makes This Special

**消除本地文件依赖**

用户不再需要：

- 下载 JavaScript 文件到本地
- 在配置文件中指定文件路径
- 管理文件版本和更新

只需在 AI 助手配置中添加一个 URL，即可自动连接。

**统一架构优势**

- **简化部署** - 无需单独部署和维护 Node.js 项目
- **减少依赖** - 消除对 Node.js 运行时的依赖
- **更好集成** - MCP 功能与现有 HTTP API 统一管理
- **性能优化** - Rust 实现的性能优势

**用户体验提升**

- **零配置** - 桌面应用启动后即可通过 URL 访问
- **自动发现** - AI 助手可以通过健康检查端点自动检测服务状态
- **统一端口** - 所有功能（浏览器扩展、MCP）通过同一 HTTP Server 访问

## Project Classification

**Technical Type:** API Backend Enhancement
**Domain:** General Software Tools
**Complexity:** Low
**Project Context:** Brownfield - extending existing HTTP Server with MCP protocol support

### 技术分类说明

**项目类型：** API Backend Enhancement

- 在现有 HTTP Server 中添加新的协议端点
- 实现 MCP 协议标准接口
- 提供工具（Tools）和资源（Resources）支持

**领域：** General Software Tools

- 通用软件工具，无特殊领域要求
- 标准的安全和性能要求
- 遵循 MCP 协议规范

**复杂度：** Low

- 在现有 HTTP Server 基础上添加端点
- 使用成熟的 Rust HTTP 框架（Axum）
- 协议实现相对直接

**项目上下文：** Brownfield

- 扩展现有桌面应用的 HTTP Server
- 删除独立的 `apps/mcp/` 项目
- 保持与现有 API 端点的兼容性

---

## Success Criteria

### User Success

**核心目标：能联通使用就可以**

用户成功的关键指标：

1. **连接成功**
   - 用户在 AI 助手配置中添加 URL `http://127.0.0.1:21890/mcp` 后，能够成功连接
   - 连接成功率：100%（桌面应用运行时）
   - 连接时间：< 2 秒

2. **功能可用**
   - 用户可以通过 AI 助手调用 MCP 搜索工具
   - 搜索功能正常工作，返回结果
   - 错误处理友好，当桌面应用未运行时给出明确提示

3. **配置简化**
   - 用户无需下载或管理任何本地文件
   - 配置步骤从"下载文件 + 配置路径"简化为"添加 URL"
   - 配置时间：< 1 分钟

**用户成功时刻：**

- 用户在 Claude Desktop 或 Cursor 中添加 URL 配置后，立即能够使用搜索功能
- 用户意识到不再需要管理本地文件时的轻松感

### Business Success

**业务成功指标：**

1. **采用率提升**
   - 配置简化后，MCP 功能采用率提升（相比需要下载文件的版本）
   - 目标：降低配置门槛，提高使用率

2. **维护成本降低**
   - 删除独立的 Node.js 项目，减少维护负担
   - 统一架构，减少部署复杂度
   - 消除对 Node.js 运行时的依赖

3. **用户满意度**
   - 用户反馈配置过程更简单
   - 减少因配置问题导致的用户支持请求

**业务成功定义：**

- 用户能够顺利使用 MCP 功能
- 维护成本降低，架构更统一
- 为未来扩展 MCP 功能打下良好基础

### Technical Success

**技术成功标准：**

1. **协议实现**
   - 成功实现 MCP 协议标准接口
   - 支持 Streamable HTTP 传输方式
   - 兼容 Claude Desktop 和 Cursor 等 AI 助手

2. **功能完整性**
   - MCP 搜索工具功能与现有独立实现保持一致
   - 支持自然语言搜索指令
   - 返回格式化的搜索结果

3. **代码质量**
   - 成功删除 `apps/mcp/` 项目
   - 在 Rust HTTP Server 中实现 MCP 端点
   - 代码结构清晰，易于维护

4. **性能指标**
   - MCP 端点响应时间：< 100ms（不含搜索时间）
   - 与现有 HTTP API 性能一致
   - 无内存泄漏或性能退化

**技术成功定义：**

- 功能正常工作，协议实现正确
- 代码质量良好，架构统一
- 性能满足要求

### Measurable Outcomes

**可衡量的结果：**

1. **连接成功率**
   - 目标：100%（桌面应用运行时）
   - 测量：AI 助手成功连接到 MCP 端点

2. **功能可用性**
   - 目标：搜索工具调用成功率 > 99%
   - 测量：MCP 搜索工具正常返回结果

3. **配置简化**
   - 目标：配置步骤从 3+ 步减少到 1 步
   - 测量：用户配置时间 < 1 分钟

4. **代码减少**
   - 目标：删除 `apps/mcp/` 项目（~500+ 行代码）
   - 测量：代码库中不再存在独立 MCP 项目

5. **依赖减少**
   - 目标：消除 Node.js 运行时依赖
   - 测量：项目不再需要 Node.js 来运行 MCP 功能

## Product Scope

### MVP - Minimum Viable Product

**核心目标：能联通使用就可以**

**MVP 范围：**

1. **MCP 协议端点实现**
   - 在 Rust HTTP Server 中实现 `/mcp` 端点
   - 支持 Streamable HTTP 传输方式
   - 实现 MCP 协议标准接口（初始化、工具列表、工具调用）

2. **搜索工具实现**
   - 实现 `search` 工具，与现有功能保持一致
   - 支持自然语言搜索指令解析
   - 调用现有 `/api/search` 端点执行搜索
   - 返回格式化的搜索结果

3. **错误处理**
   - 当桌面应用未运行时，返回友好错误提示
   - 处理搜索 API 错误，返回适当错误信息

4. **删除独立项目**
   - 删除 `apps/mcp/` 目录及其所有文件
   - 更新文档，移除 MCP 独立项目的说明

**MVP 验收标准：**

- ✅ 用户可以通过 URL 连接 MCP 服务
- ✅ 搜索工具正常工作
- ✅ 配置简化（只需添加 URL）
- ✅ 独立 MCP 项目已删除

### Growth Features (Post-MVP)

**未来可扩展的功能：**

1. **更多 MCP 工具**
   - 内容收集工具（通过 MCP 收集内容）
   - 标签管理工具
   - 收藏管理工具

2. **MCP 资源（Resources）**
   - 提供知识库资源列表
   - 支持资源查询和访问

3. **认证和授权**
   - 支持 API Key 认证
   - 多用户支持

4. **性能优化**
   - 连接池管理
   - 请求缓存
   - 批量操作支持

### Vision (Future)

**长期愿景：**

1. **完整的 MCP 生态系统**
   - 提供完整的 MCP 工具集
   - 支持 MCP 资源
   - 成为 MCP 协议的参考实现

2. **跨平台支持**
   - 支持远程连接（非 localhost）
   - 支持 HTTPS
   - 支持多实例部署

3. **开发者体验**
   - 提供 MCP 开发工具
   - 支持自定义工具扩展
   - 完善的文档和示例

---

## User Journeys

### Journey 1: AI 助手用户 - 配置和使用 MCP

**用户类型：** AI 助手用户（使用 Claude Desktop、Cursor 等）

**步骤：**

1. **启动桌面应用**
   - 用户启动 Memory Prosthetic 桌面应用
   - HTTP Server 自动启动在 `localhost:21890`
   - MCP 端点 `/mcp` 自动可用

2. **配置 AI 助手**
   - 用户在 AI 助手配置文件中添加：

     ```json
     {
       "memory-prosthetic": {
         "url": "http://127.0.0.1:21890/mcp"
       }
     }
     ```

   - 无需下载任何文件或指定本地路径
   - 配置完成

3. **使用搜索功能**
   - 用户在 AI 助手对话中输入："使用 MP 搜索 React 文章"
   - AI 助手通过 MCP 协议调用 `search` 工具
   - MCP 端点接收请求，调用 `/api/search` 执行搜索
   - 返回格式化的搜索结果给 AI 助手
   - AI 助手将结果呈现给用户

**关键需求：**

- MCP 端点 `/mcp` 必须可用
- 支持 Streamable HTTP 传输
- 搜索工具正常工作
- 错误处理友好

### Journey 2: 开发者 - 实现和维护

**用户类型：** 开发者/维护者

**步骤：**

1. **实现 MCP 端点**
   - 在 Rust HTTP Server 中添加 `/mcp` 路由
   - 实现 MCP 协议标准接口
   - 实现 `search` 工具处理逻辑

2. **测试和验证**
   - 测试 MCP 端点连接
   - 验证搜索工具功能
   - 测试错误处理场景

3. **删除独立项目**
   - 删除 `apps/mcp/` 目录
   - 更新文档和配置
   - 验证功能完整性

**关键需求：**

- 代码结构清晰
- 易于维护和扩展
- 文档完整

### Journey Requirements Summary

**从用户旅程中揭示的功能需求：**

1. **MCP 协议实现**
   - 实现 MCP 协议标准接口
   - 支持 Streamable HTTP 传输方式
   - 处理初始化、工具列表、工具调用等协议消息

2. **搜索工具**
   - 实现 `search` 工具
   - 解析自然语言搜索指令
   - 调用现有搜索 API
   - 格式化返回结果

3. **错误处理**
   - 处理连接错误
   - 处理 API 错误
   - 返回友好错误信息

4. **配置简化**
   - 支持 URL 配置方式
   - 无需本地文件依赖

5. **代码清理**
   - 删除独立 MCP 项目
   - 统一架构

---

## API Backend Specific Requirements

### Project-Type Overview

这是一个 API Backend Enhancement 项目，在现有 Rust HTTP Server（Axum）中添加 MCP 协议端点。项目使用官方的 MCP Rust SDK ([rmcp](https://github.com/modelcontextprotocol/rust-sdk)) 实现 MCP 协议。

### Technical Architecture Considerations

**MCP Rust SDK 集成：**

- **SDK 选择**：使用官方 [MCP Rust SDK (rmcp)](https://github.com/modelcontextprotocol/rust-sdk)
- **版本**：使用最新稳定版本（当前 v0.12.0+）
- **核心依赖**：
  - `rmcp` crate（核心协议实现）
  - `rmcp-macros` crate（工具实现宏，可选）
  - `tokio`（异步运行时，已存在）
  - `serde`（JSON 序列化，已存在）

**架构集成：**

- 在现有 Axum HTTP Server 中集成 MCP 端点
- 使用 `rmcp` SDK 处理 MCP 协议消息
- 将 MCP 工具调用转发到现有 HTTP API 端点

### Endpoint Specifications

**MCP 端点：**

- **路径**：`/mcp`
- **方法**：POST（Streamable HTTP）
- **协议**：MCP Protocol over HTTP
- **传输方式**：Streamable HTTP（MCP 协议标准）

**端点职责：**

1. **初始化**：处理 MCP 客户端初始化请求
2. **工具列表**：返回可用工具列表（当前：`search`）
3. **工具调用**：处理工具调用请求，执行搜索并返回结果

### Authentication Model

**当前阶段：**

- **认证方式**：无需认证（localhost 使用）
- **安全考虑**：仅监听 `127.0.0.1`，不对外暴露

**未来扩展：**

- 支持 API Key 认证
- 支持 OAuth 认证（rmcp SDK 支持 OAuth）

### Data Schemas

**MCP 协议消息格式：**

- **请求格式**：MCP 协议标准 JSON-RPC 2.0
- **响应格式**：MCP 协议标准 JSON-RPC 2.0
- **工具参数**：使用 JSON Schema 定义（rmcp SDK 自动生成）

**搜索工具 Schema：**

```json
{
  "query": {
    "type": "string",
    "description": "搜索关键词或自然语言指令"
  },
  "limit": {
    "type": "number",
    "optional": true,
    "default": 10,
    "description": "结果数量限制"
  }
}
```

### Error Codes

**MCP 协议错误码：**

- `-32600`：Invalid Request（无效请求）
- `-32601`：Method Not Found（工具不存在）
- `-32602`：Invalid Params（参数错误）
- `-32603`：Internal Error（内部错误）
- `-32000`：Server Error（服务器错误）

**业务错误码：**

- `DESKTOP_APP_NOT_RUNNING`：桌面应用未运行
- `SEARCH_ERROR`：搜索执行失败
- `INVALID_QUERY`：搜索查询无效

### Rate Limits

**当前阶段：**

- **速率限制**：暂不实施（本地使用，低风险）

**未来考虑：**

- 如果需要，可以添加基于 IP 的速率限制
- 使用 Axum 中间件实现

### API Documentation

**文档需求：**

- MCP 端点使用 MCP 协议标准，遵循 [MCP Specification](https://modelcontextprotocol.github.io/specification/)
- 工具定义使用 JSON Schema（rmcp SDK 自动生成）
- 提供配置示例和集成指南

### Implementation Considerations

**rmcp SDK 集成步骤：**

1. **添加依赖**：

   ```toml
   [dependencies]
   rmcp = { version = "0.12.0", features = ["server"] }
   tokio = { version = "1", features = ["full"] }
   serde = { version = "1", features = ["derive"] }
   ```

2. **创建 MCP Service**：
   - 使用 `rmcp::ServerHandler` 或自定义 handler
   - 实现工具处理逻辑
   - 集成到 Axum 路由

3. **HTTP 传输集成**：
   - 使用 rmcp SDK 的 HTTP 传输支持
   - 或使用 `rmcp-actix-web` 扩展（如果适用）
   - 在 Axum 中实现 Streamable HTTP 端点

4. **工具实现**：
   - 使用 `rmcp-macros` 简化工具定义（可选）
   - 或手动实现工具处理函数
   - 调用现有 `/api/search` 端点

**与现有代码集成：**

- MCP 端点使用现有的 `AppState` 和数据库连接
- 搜索工具调用现有的 `handlers::search` 函数
- 复用现有的错误处理逻辑

**代码结构：**

```
apps/desktop/src-tauri/src/
├── server/
│   ├── routes.rs          # 添加 /mcp 路由
│   ├── handlers.rs        # 现有 API handlers
│   └── mcp/               # 新增 MCP 模块
│       ├── mod.rs          # MCP 模块入口
│       ├── service.rs      # MCP Service 实现
│       ├── tools.rs        # 工具实现（search）
│       └── transport.rs    # HTTP 传输适配

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP 方法：** Problem-Solving MVP（解决问题 MVP）

**核心原则：** 能联通使用就可以

**MVP 目标：**
- 用户能够通过 URL 配置连接 MCP 服务
- 搜索工具正常工作
- 配置简化（无需本地文件）
- 删除独立 MCP 项目

**资源需求：**
- **团队规模**：1-2 名开发者
- **技能要求**：Rust、HTTP Server 开发、MCP 协议理解
- **时间估算**：1-2 周（基于复杂度 Low）

### MVP Feature Set (Phase 1)

**核心用户旅程支持：**
- ✅ AI 助手用户 - 配置和使用 MCP（完整支持）
- ✅ 开发者 - 实现和维护（基础支持）

**必须拥有的能力：**

1. **MCP 协议端点实现**
   - `/mcp` 端点可用
   - 支持 Streamable HTTP 传输
   - 实现 MCP 协议标准接口（初始化、工具列表、工具调用）

2. **搜索工具实现**
   - `search` 工具正常工作
   - 支持自然语言搜索指令解析
   - 调用现有 `/api/search` 端点
   - 返回格式化的搜索结果

3. **错误处理**
   - 友好的错误提示
   - 处理连接错误和 API 错误

4. **代码清理**
   - 删除 `apps/mcp/` 项目
   - 更新文档

**MVP 验收标准：**
- ✅ 用户可以通过 URL 连接 MCP 服务
- ✅ 搜索工具正常工作
- ✅ 配置简化（只需添加 URL）
- ✅ 独立 MCP 项目已删除

### Post-MVP Features

**Phase 2 (Post-MVP - 可选增强)：**

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

**Phase 3 (Expansion - 未来扩展)：**

1. **认证和授权**
   - API Key 认证
   - OAuth 认证支持
   - 多用户支持

2. **跨平台支持**
   - 支持远程连接（非 localhost）
   - 支持 HTTPS
   - 支持多实例部署

3. **开发者体验**
   - 提供 MCP 开发工具
   - 支持自定义工具扩展
   - 完善的文档和示例

### Risk Mitigation Strategy

**技术风险：**

- **风险**：rmcp SDK 集成复杂度
  - **缓解**：使用官方 SDK，参考示例代码，分步实现
  - **备选**：如果 SDK 集成困难，可以考虑手动实现协议核心部分

- **风险**：HTTP 传输方式实现
  - **缓解**：参考 MCP 协议规范和 SDK 文档
  - **备选**：先实现基础功能，再优化传输方式

- **风险**：与现有代码集成
  - **缓解**：复用现有 `AppState` 和 handlers，最小化改动
  - **备选**：保持现有 API 不变，MCP 作为适配层

**市场风险：**

- **风险**：用户配置仍然复杂
  - **缓解**：提供清晰的配置示例和文档
  - **验证**：MVP 阶段收集用户反馈

**资源风险：**

- **风险**：开发时间超出预期
  - **缓解**：优先实现核心功能，其他功能可延后
  - **备选**：如果时间紧张，可以先实现基础连接，再完善功能

**范围控制策略：**

- **严格 MVP 边界**：只实现"能联通使用"所需的功能
- **延后非核心功能**：认证、多工具等功能放到 Phase 2
- **保持简单**：避免过度设计，优先可用性

---

## Functional Requirements

### MCP Protocol Support

- **FR1**: AI 助手可以通过 URL (`http://127.0.0.1:21890/mcp`) 连接到 MCP 服务
- **FR2**: MCP 服务支持 Streamable HTTP 传输方式
- **FR3**: MCP 服务实现协议初始化接口，处理客户端初始化请求
- **FR4**: MCP 服务提供工具列表接口，返回可用工具信息
- **FR5**: MCP 服务处理工具调用请求，执行相应操作并返回结果
- **FR6**: MCP 服务遵循 MCP 协议标准（JSON-RPC 2.0）
- **FR7**: MCP 端点与现有 HTTP Server 集成，使用同一端口和路由系统

### Search Tool

- **FR8**: MCP 服务提供 `search` 工具供 AI 助手调用
- **FR9**: `search` 工具接收搜索查询参数（query 和可选的 limit）
- **FR10**: `search` 工具解析自然语言搜索指令，提取搜索关键词
- **FR11**: `search` 工具调用现有 `/api/search` 端点执行语义搜索
- **FR12**: `search` 工具返回格式化的搜索结果给 AI 助手
- **FR13**: `search` 工具支持结果数量限制（默认 10 条）
- **FR14**: `search` 工具处理空结果情况，返回友好提示信息

### Error Handling

- **FR15**: MCP 服务检测桌面应用运行状态
- **FR16**: MCP 服务在桌面应用未运行时返回友好错误提示
- **FR17**: MCP 服务处理搜索 API 错误，返回适当的错误信息
- **FR18**: MCP 服务处理无效的 MCP 协议消息，返回标准错误响应
- **FR19**: MCP 服务处理参数验证错误，返回清晰的错误提示
- **FR20**: MCP 服务使用标准 MCP 错误码（-32600, -32601, -32602 等）
- **FR21**: MCP 服务使用业务错误码（DESKTOP_APP_NOT_RUNNING, SEARCH_ERROR 等）

### Configuration & Integration

- **FR22**: AI 助手可以通过 URL 配置方式连接 MCP 服务（无需本地文件）
- **FR23**: MCP 服务在桌面应用启动时自动可用
- **FR24**: MCP 端点使用现有 HTTP Server 的配置和状态管理
- **FR25**: MCP 服务复用现有的数据库连接和 AppState
- **FR26**: MCP 服务与现有 API 端点（/api/search, /api/health）兼容

### Code Cleanup & Architecture

- **FR27**: 删除独立的 `apps/mcp/` Node.js 项目
- **FR28**: MCP 功能集成到 Rust HTTP Server 代码库中
- **FR29**: 更新项目文档，移除独立 MCP 项目的说明
- **FR30**: 更新配置示例，使用 URL 配置方式
- **FR31**: 消除对 Node.js 运行时的依赖（MCP 功能相关）

---

## Non-Functional Requirements

### Performance

**响应时间要求：**

- **NFR1**: MCP 端点响应时间（协议处理）应 < 100ms（不含搜索执行时间）
- **NFR2**: MCP 端点连接建立时间应 < 2 秒
- **NFR3**: MCP 工具调用总响应时间（包含搜索）应与现有 `/api/search` 端点性能一致
- **NFR4**: MCP 协议消息处理不应引入明显的性能开销

**性能基准：**

- MCP 端点性能应与现有 HTTP API 端点保持一致
- 不应因 MCP 协议层导致性能退化
- 无内存泄漏或资源占用异常

### Security

**当前阶段（localhost）：**

- **NFR5**: MCP 端点仅监听 `127.0.0.1`，不对外暴露
- **NFR6**: 无需认证机制（本地使用场景）

**未来扩展考虑：**

- **NFR7**: 支持 API Key 认证（Phase 2）
- **NFR8**: 支持 OAuth 认证（Phase 3）
- **NFR9**: 支持 HTTPS 传输（Phase 3）

**数据安全：**

- **NFR10**: MCP 协议消息传输使用标准 JSON-RPC 2.0，不涉及敏感数据泄露风险
- **NFR11**: 搜索查询和结果不包含敏感信息（与现有搜索 API 一致）

### Integration

**协议兼容性：**

- **NFR12**: MCP 服务必须遵循 [MCP Specification](https://modelcontextprotocol.github.io/specification/) 标准
- **NFR13**: MCP 服务必须兼容 Claude Desktop 和 Cursor 等主流 AI 助手
- **NFR14**: MCP 服务支持 Streamable HTTP 传输方式（MCP 协议标准）

**API 集成：**

- **NFR15**: MCP 服务与现有 HTTP API（/api/search, /api/health）无缝集成
- **NFR16**: MCP 工具调用复用现有搜索 API 逻辑，保持行为一致性
- **NFR17**: MCP 服务使用现有的 AppState 和数据库连接，不创建重复资源

### Reliability

**可用性：**

- **NFR18**: MCP 服务在桌面应用运行时自动可用
- **NFR19**: MCP 端点连接成功率应达到 100%（桌面应用运行时）
- **NFR20**: MCP 服务应检测桌面应用状态，在未运行时返回友好错误提示

**错误处理：**

- **NFR21**: MCP 服务应处理所有协议错误，返回标准 MCP 错误响应
- **NFR22**: MCP 服务应处理业务错误（搜索失败等），返回友好的错误信息
- **NFR23**: MCP 服务不应因单个工具调用失败而影响整体服务可用性

**稳定性：**

- **NFR24**: MCP 服务应与现有 HTTP Server 共享生命周期，随应用启动和关闭
- **NFR25**: MCP 服务不应影响现有 API 端点的稳定性
