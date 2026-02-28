# Tech-Spec: Epic 8 - MCP 集成

**Created:** 2025-12-27
**Status:** Ready for Development
**Epic:** Epic 8
**Stories:** 8.1 - 8.8 (8 stories)

## Overview

### Problem Statement

AI 助手用户希望能够通过自然语言指令直接搜索已收集的内容，而无需切换到桌面应用。当前用户需要：

1. **自然语言交互** - 在与 AI 助手对话时，直接说"使用 MP 搜索 React 文章"就能搜索
2. **无缝集成** - AI 助手（如 Claude Desktop、Cursor）可以通过标准协议调用应用功能
3. **错误处理** - 当桌面应用未运行时，提供友好的提示信息

**用户价值：**

- 在 AI 助手对话中直接查询知识库，无需切换应用
- 通过自然语言指令搜索，更符合对话式交互习惯
- 标准化协议支持，兼容多种 AI 助手

### Solution

实现 MCP (Model Context Protocol) 服务器，提供搜索工具供 AI 助手调用：

1. **MCP 服务器** - 实现 MCP 协议标准接口，支持 stdio/SSE 传输
2. **搜索工具** - 提供 `search` 工具，解析自然语言指令，调用桌面应用 API
3. **HTTP API 客户端** - 与桌面应用的 HTTP Server 通信
4. **配置管理** - 支持环境变量、配置文件、默认值配置
5. **错误处理** - 检测桌面应用状态，提供友好的错误提示

### Scope (In/Out)

**In:**

- MCP 服务器项目初始化（Story 8.1）
- MCP 服务器基础框架（Story 8.2）
- HTTP API 客户端实现（Story 8.3）
- 搜索工具实现（Story 8.4）
- 配置管理（Story 8.5）
- 桌面应用状态检测与错误处理（Story 8.6）
- MCP 服务器打包与分发（Story 8.7）
- MCP 服务器测试与验证（Story 8.8）

**Out:**

- 其他 MCP 工具（如内容收集、标签管理） - 未来扩展
- MCP 资源（Resources） - 未来扩展
- 多实例支持 - 未来扩展
- 认证和授权 - 当前使用 localhost，未来可扩展

## Context for Development

### Codebase Patterns

**Monorepo 结构：**

```text
memory-prosthetic/
├── apps/
│   ├── desktop/          # Tauri 桌面应用
│   ├── browser-extension/ # WXT 浏览器插件
│   └── mcp/              # MCP 服务器（新增，TypeScript）
│       ├── package.json   # 项目配置和依赖
│       ├── tsconfig.json  # TypeScript 配置
│       ├── .env.example   # 环境变量示例
│       ├── README.md      # 使用说明
│       ├── src/           # 源代码
│       │   ├── index.ts   # 服务器入口
│       │   ├── config/    # 配置管理
│       │   │   └── settings.ts
│       │   ├── utils/     # 工具函数
│       │   │   └── api-client.ts
│       │   └── tools/     # MCP 工具
│       │       └── search.ts
│       └── tests/         # 测试文件
│           ├── config.test.ts
│           ├── api-client.test.ts
│           └── search.test.ts
├── packages/
│   ├── shared/           # 共享类型定义
│   └── ui/               # UI 组件库
```

**TypeScript 项目模式：**

```typescript
// apps/mcp/package.json
{
  "name": "@memory-prosthetic/mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastmcp": "^0.1.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "@types/node": "^20.0.0"
  }
}
```

**FastMCP 使用模式：**

```typescript
// apps/mcp/src/index.ts
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "Memory Prosthetic",
  version: "0.1.0",
});

server.addTool({
  name: "search",
  description: "在 Memory Prosthetic 中搜索已收集的内容",
  parameters: z.object({
    query: z.string().describe("搜索关键词"),
    limit: z.number().optional().default(10).describe("结果数量限制"),
  }),
  execute: async (args) => {
    // 实现搜索逻辑
    const { query, limit } = args;
    // 调用 HTTP API 客户端
    return JSON.stringify({ results: [], total: 0 });
  },
});

server.start({
  transportType: "stdio",
});
```

**HTTP API 客户端模式：**

```typescript
// apps/mcp/src/utils/api-client.ts
import axios, { AxiosError } from "axios";

type ApiClientConfig = {
  baseUrl: string;
  timeout?: number;
};

const createApiClient = (config: ApiClientConfig) => {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout ?? 5000,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const search = async (
  client: ReturnType<typeof createApiClient>,
  query: string,
  limit?: number
) => {
  try {
    const response = await client.post("/api/search", { query, limit });
    return { success: true, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED") {
        return {
          success: false,
          error: {
            code: "DESKTOP_APP_NOT_RUNNING",
            message: "Memory Prosthetic 桌面应用未运行，请先启动应用",
          },
        };
      }
      if (error.code === "ETIMEDOUT") {
        return {
          success: false,
          error: {
            code: "TIMEOUT",
            message: "连接超时，请检查桌面应用是否正常运行",
          },
        };
      }
      if (error.response) {
        return {
          success: false,
          error: {
            code: "API_ERROR",
            message: `API 错误: ${error.response.status}`,
          },
        };
      }
    }
    throw error;
  }
};

export const healthCheck = async (
  client: ReturnType<typeof createApiClient>
): Promise<boolean> => {
  try {
    const response = await client.get("/api/health", { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
};
```

### Files to Reference

**架构文档：**

- `docs/architecture.md` - MCP 应用架构设计（第 1124-1320 行）

**Epics 文档：**

- `docs/epics.md` - Epic 8: MCP 集成（第 1852-2155 行）

**PRD 文档：**

- `docs/prd.md` - MCP 应用需求（第 460-522 行，FR317-FR324）

**桌面应用 HTTP API：**

- `apps/desktop/src-tauri/src/server/` - HTTP Server 实现
- `apps/desktop/src-tauri/src/server/routes.rs` - API 路由定义
- `apps/desktop/src-tauri/src/server/handlers.rs` - 请求处理

**共享类型：**

- `packages/shared/src/types/api.ts` - API 类型定义
- `packages/shared/src/types/search.ts` - 搜索相关类型

### Technical Decisions

**1. MCP SDK 选择**

- **决策**: 使用 `fastmcp` (npm 包)
- **理由**: 简化的 TypeScript MCP 框架，API 简洁，使用 Zod 进行参数验证，自动处理 MCP 协议细节
- **版本**: 最新稳定版本（当前 v0.1.0+）
- **文档**: [fastmcp npm](https://www.npmjs.com/package/fastmcp), [GitHub](https://github.com/punkpeye/fastmcp)

**2. 传输方式**

- **决策**: 使用 stdio（fastmcp 默认）
- **理由**: stdio 是 MCP 的标准传输方式，适合本地进程通信
- **实现**: `server.start({ transportType: "stdio" })`

**3. HTTP 客户端选择**

- **决策**: 使用 `axios`
- **理由**: 功能完整，错误处理完善，支持超时配置，与项目其他部分一致
- **备选**: `node-fetch`（更轻量，但功能较少）

**4. 配置管理策略**

- **决策**: 环境变量 > 配置文件 > 默认值
- **理由**: 灵活适应不同部署环境，支持 CI/CD
- **实现**: 使用 `process.env` 读取环境变量，可选 JSON 配置文件

**5. 错误处理策略**

- **决策**: 区分错误类型，返回友好提示
- **理由**: 提升用户体验，帮助用户快速定位问题
- **实现**: 捕获 HTTP 错误，映射为业务错误码

**6. 自然语言解析**

- **决策**: 简单字符串处理（去除前缀）
- **理由**: MVP 阶段，简单实现即可；未来可扩展为更智能的解析
- **实现**: 正则表达式或字符串替换

## Implementation Plan

### Tasks

#### Story 8.1: MCP 服务器项目初始化

- [ ] 创建 `apps/mcp/` 目录结构
- [ ] 创建 `package.json`，配置依赖和脚本
- [ ] 创建 `tsconfig.json`，配置 TypeScript
- [ ] 创建 `.env.example`，提供配置示例
- [ ] 创建 `README.md`，提供安装和使用说明
- [ ] 创建基础目录结构：`src/`, `src/tools/`, `src/utils/`, `src/config/`
- [ ] 安装依赖：`fastmcp`, `zod`, `axios`, `typescript`（使用 `bun install` 或 `npm install`）

#### Story 8.2: MCP 服务器基础框架

- [ ] 创建 `src/index.ts`，实现 MCP 服务器入口
- [ ] 初始化 FastMCP 实例（`new FastMCP({ name, version })`）
- [ ] 配置服务器信息（名称、版本）
- [ ] 使用 `server.addTool()` 注册工具
- [ ] 使用 Zod 定义工具参数 schema
- [ ] 实现工具执行函数
- [ ] 设置错误处理
- [ ] 实现 `server.start({ transportType: "stdio" })` 启动服务器
- [ ] 测试服务器启动和基本连接

#### Story 8.3: HTTP API 客户端实现

- [ ] 创建 `src/utils/api-client.ts`
- [ ] 实现 `createApiClient` 函数
- [ ] 实现 `search` 函数，调用 `/api/search` 端点
- [ ] 实现 `healthCheck` 函数，调用 `/api/health` 端点
- [ ] 实现错误处理：连接错误（`ECONNREFUSED`）、超时错误（`ETIMEDOUT`）、API 错误（HTTP 状态码）
- [ ] 实现错误类型映射（HTTP 错误 → 业务错误）
- [ ] 添加请求/响应日志（可选）

#### Story 8.4: 搜索工具实现

- [ ] 在 `src/index.ts` 中使用 `server.addTool()` 注册搜索工具
- [ ] 使用 Zod 定义工具参数 schema（`query: z.string()`, `limit: z.number().optional()`）
- [ ] 实现工具执行函数（`execute`）
- [ ] 实现自然语言解析（提取搜索关键词）
- [ ] 调用 HTTP API 客户端执行搜索
- [ ] 格式化搜索结果为字符串（fastmcp 自动处理 MCP 协议）
- [ ] 处理空结果情况
- [ ] 处理错误情况，返回友好提示

#### Story 8.5: 配置管理

- [ ] 创建 `src/config/settings.ts`
- [ ] 定义 `McpServerConfig` 类型
- [ ] 实现配置读取函数（环境变量 → 配置文件 → 默认值）
- [ ] 实现配置文件读取（`~/.memory-prosthetic/mcp-config.json`）
- [ ] 实现配置验证（端口范围、主机格式）
- [ ] 实现配置合并逻辑
- [ ] 在 `src/index.ts` 中使用配置

#### Story 8.6: 桌面应用状态检测与错误处理

- [ ] 在 `src/utils/api-client.ts` 中增强错误处理
- [ ] 实现连接错误检测（`ECONNREFUSED`）
- [ ] 实现超时错误检测（`ETIMEDOUT`）
- [ ] 实现错误消息映射
- [ ] 在 `src/index.ts` 的 `search` 工具中使用错误处理
- [ ] 可选：实现启动时健康检查
- [ ] 添加错误日志记录（使用 `console` 或日志库）

#### Story 8.7: MCP 服务器打包与分发

- [ ] 配置 TypeScript 编译选项
- [ ] 添加 `build` 脚本
- [ ] 测试编译后的 JavaScript 文件
- [ ] 更新 `README.md`，添加安装和配置说明
- [ ] 添加使用示例（Claude Desktop 配置示例，使用 `bun run src/index.ts` 或 `node dist/index.js`）
- [ ] 创建 `.env.example` 文件

#### Story 8.8: MCP 服务器测试与验证

- [ ] 创建测试文件结构（使用 `vitest` 或 `jest`）
- [ ] 编写单元测试：配置管理（`tests/config.test.ts`）
- [ ] 编写单元测试：HTTP API 客户端（`tests/api-client.test.ts`）
- [ ] 编写单元测试：搜索工具（`tests/search.test.ts`）
- [ ] 编写集成测试：MCP 服务器启动（`tests/server.test.ts`）
- [ ] 编写集成测试：工具调用流程
- [ ] 编写集成测试：错误处理
- [ ] 验证与桌面应用的集成（真实环境测试）

### Acceptance Criteria

#### Story 8.1: MCP 服务器项目初始化

- [ ] **Given** Monorepo 结构已存在
- [ ] **When** 创建 `apps/mcp/` 目录
- [ ] **Then** 项目结构包含所有必需文件和目录
- [ ] **And** `package.json` 配置正确
- [ ] **And** `tsconfig.json` 配置正确
- [ ] **And** 依赖安装成功

#### Story 8.2: MCP 服务器基础框架

- [ ] **Given** MCP 服务器已初始化
- [ ] **When** 启动服务器
- [ ] **Then** 服务器通过 stdio 传输方式启动
- [ ] **And** 实现 MCP 协议标准接口
- [ ] **And** AI 助手可以连接并获取工具列表

#### Story 8.3: HTTP API 客户端实现

- [ ] **Given** MCP 服务器已启动
- [ ] **When** 调用桌面应用 API
- [ ] **Then** HTTP 客户端可以发送请求
- [ ] **And** 支持配置自定义地址和端口
- [ ] **And** 正确处理连接错误和超时错误

#### Story 8.4: 搜索工具实现

- [ ] **Given** AI 助手已连接到 MCP 服务器
- [ ] **When** 用户输入"使用 MP 搜索 React 文章"
- [ ] **Then** MCP 服务器接收搜索工具调用
- [ ] **And** 解析指令提取搜索关键词
- [ ] **And** 调用桌面应用 API 执行搜索
- [ ] **And** 返回格式化的搜索结果

#### Story 8.5: 配置管理

- [ ] **Given** MCP 服务器启动
- [ ] **When** 读取配置
- [ ] **Then** 按优先级读取（环境变量 → 配置文件 → 默认值）
- [ ] **And** 配置验证通过
- [ ] **And** 使用正确的配置值

#### Story 8.6: 桌面应用状态检测与错误处理

- [ ] **Given** MCP 服务器尝试调用桌面应用 API
- [ ] **When** 桌面应用未运行
- [ ] **Then** 返回友好错误信息
- [ ] **And** 错误信息提示用户启动应用

#### Story 8.7: MCP 服务器打包与分发

- [ ] **Given** MCP 项目已实现
- [ ] **When** 构建项目
- [ ] **Then** TypeScript 编译为 JavaScript
- [ ] **And** 生成可执行的入口文件
- [ ] **And** 文档完整

#### Story 8.8: MCP 服务器测试与验证

- [ ] **Given** MCP 服务器已实现
- [ ] **When** 运行测试
- [ ] **Then** 所有测试通过
- [ ] **And** 与桌面应用集成正常

## Additional Context

### Dependencies

**外部依赖：**

- `fastmcp` - FastMCP 框架（MCP 协议实现）
- `zod` - 参数验证库（fastmcp 使用）
- `axios` - HTTP 客户端
- `typescript` - TypeScript 编译器（开发依赖）

**内部依赖：**

- 桌面应用 HTTP Server - 必须运行在 `localhost:21890`（或配置的端口）

**依赖关系：**

```text
MCP Server
  ├─ fastmcp (必需)
  ├─ zod (必需，用于参数验证)
  ├─ axios (必需)
  ├─ typescript (开发依赖)
  └─ Desktop App HTTP Server (运行时依赖)
```

### Testing Strategy

**单元测试：**

- 配置管理：测试配置读取、验证、合并逻辑
- HTTP API 客户端：测试请求发送、错误处理、超时处理
- 搜索工具：测试自然语言解析、结果格式化

**集成测试：**

- MCP 服务器启动：测试服务器初始化、工具注册
- 工具调用流程：测试完整的搜索工具调用流程
- 错误处理：测试各种错误场景的处理

**端到端测试：**

- 与桌面应用集成：测试真实环境下的搜索功能
- AI 助手集成：测试与 Claude Desktop 或 Cursor 的集成

**测试工具：**

- `vitest` - 现代测试框架（推荐，与项目技术栈一致）
- 或 `jest`（备选）

### Notes

**开发顺序建议：**

1. 先实现 Story 8.1-8.2（项目初始化和基础框架）
2. 然后实现 Story 8.3（HTTP API 客户端），可以独立测试
3. 接着实现 Story 8.4（搜索工具），依赖 Story 8.3
4. 然后实现 Story 8.5（配置管理），完善功能
5. 最后实现 Story 8.6-8.8（错误处理、打包、测试）

**关键实现细节：**

1. **自然语言解析**：MVP 阶段使用简单实现，如：

```typescript
const extractQuery = (input: string): string => {
  // 去除常见前缀
  return input
    .replace(/^使用\s*MP\s*搜索\s*/i, '')
    .replace(/^搜索\s*/i, '')
    .trim();
};
```

1. **错误处理**：确保所有错误都返回友好的用户提示，符合 MCP 协议格式

2. **配置优先级**：严格按照环境变量 > 配置文件 > 默认值的顺序

3. **日志记录**：建议添加日志记录，便于调试和问题排查

**未来扩展：**

- 添加更多 MCP 工具（如内容收集、标签管理）
- 实现 MCP 资源（Resources）
- 支持认证和授权
- 更智能的自然语言解析（使用 LLM）

**参考资源：**

- [FastMCP npm 包](https://www.npmjs.com/package/fastmcp)
- [FastMCP GitHub](https://github.com/punkpeye/fastmcp)
- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Claude Desktop MCP 配置](https://claude.ai/docs/mcp)
- [Zod 文档](https://zod.dev/) - 参数验证
- [Axios 文档](https://axios-http.com/)
