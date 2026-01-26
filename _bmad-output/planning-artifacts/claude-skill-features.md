# Claude Skill 功能规划

**创建日期:** 2025-01-27
**状态:** 规划中
**基于:** Memory Prosthetic PRD 和现有 MCP 集成

---

## 概述

本文档基于 Memory Prosthetic 应用的核心功能，规划应该实现的 Claude Skill 功能。Claude Skill 允许用户通过自然语言与 Claude AI 助手交互，调用应用的各种功能。

### 设计原则

1. **自然语言优先** - 所有功能都支持自然语言指令
2. **增强 AI 能力** - 让 Claude 能够访问和操作用户的知识库
3. **渐进式实现** - 从核心功能开始，逐步扩展
4. **复用现有 API** - 基于现有的 HTTP API 和 MCP 实现

---

## 功能分类与优先级

### P0 - 核心功能（必须实现）

这些功能是 Claude Skill 的核心价值，让 Claude 能够帮助用户管理知识库。

#### 1. 内容搜索 (Search Content)

**功能描述：**
让 Claude 能够搜索用户已收集的内容，回答"我之前收集过关于 X 的文章吗？"这类问题。

**实现方式：**
- 复用现有 MCP `search` 工具
- 支持自然语言查询解析
- 支持按收藏夹、标签、状态筛选

**使用场景：**
```
用户: "帮我找一下我之前收集的关于 React Hooks 的文章"
Claude: [调用 search 工具] 找到了 3 篇相关文章：
1. 《深入理解 React Hooks》- https://example.com/react-hooks
2. 《React Hooks 最佳实践》- https://example.com/hooks-best-practices
...
```

**技术实现：**
- 复用 `apps/desktop/src-tauri/src/server/mcp/tools.rs` 中的 `SearchTool`
- 支持自然语言解析（如"搜索 react 收藏夹"）

---

#### 2. 内容收集 (Collect Content)

**功能描述：**
让 Claude 能够帮用户收集内容到知识库。用户可以提供 URL 或内容，Claude 自动提取并保存。

**实现方式：**
- 创建新的 MCP 工具 `collect_content`
- 调用 `/api/collect` 端点
- 支持 URL 和直接内容两种方式

**使用场景：**
```
用户: "帮我把这篇文章保存到我的知识库：https://example.com/article"
Claude: [调用 collect_content 工具] 已成功保存文章《文章标题》到知识库。

用户: "保存这段内容到'前端开发'收藏夹：React 是一个用于构建用户界面的库..."
Claude: [调用 collect_content 工具] 已保存内容到"前端开发"收藏夹。
```

**技术实现：**
- 创建 `CollectContentTool` 结构体
- 支持 URL 提取（如果用户提供 URL）
- 支持内容提取（如果用户提供文本）
- 支持指定收藏夹和标签

**工具定义：**
```rust
{
    "name": "collect_content",
    "description": "收集内容到 Memory Prosthetic 知识库。支持 URL 和直接内容两种方式。可以指定收藏夹和标签。",
    "inputSchema": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "要收集的网页 URL（如果提供 URL，将自动提取内容）"
            },
            "title": {
                "type": "string",
                "description": "内容标题（如果提供 URL，可以自动提取）"
            },
            "content": {
                "type": "string",
                "description": "要保存的内容（Markdown 格式，如果提供 URL 则自动提取）"
            },
            "favorite_name": {
                "type": "string",
                "description": "目标收藏夹名称（可选，支持模糊匹配）"
            },
            "tags": {
                "type": "array",
                "items": { "type": "string" },
                "description": "标签列表（可选，如果标签不存在会自动创建）"
            }
        },
        "required": []
    }
}
```

---

#### 3. 内容查询 (List Collections)

**功能描述：**
让 Claude 能够列出用户已收集的内容，支持按收藏夹、标签、状态筛选。

**实现方式：**
- 创建新的 MCP 工具 `list_collections`
- 调用 `/api/collections` 端点
- 支持自然语言筛选条件解析

**使用场景：**
```
用户: "我收集了多少篇文章？"
Claude: [调用 list_collections 工具] 您目前收集了 127 篇文章。

用户: "显示'前端开发'收藏夹里的所有文章"
Claude: [调用 list_collections 工具] "前端开发"收藏夹中有 23 篇文章：
1. 《React Hooks 详解》- https://example.com/react-hooks
...
```

**技术实现：**
- 创建 `ListCollectionsTool` 结构体
- 支持自然语言筛选条件解析（如"前端开发收藏夹"）
- 返回格式化的列表

**工具定义：**
```rust
{
    "name": "list_collections",
    "description": "列出已收集的内容。支持按收藏夹、标签、状态筛选。",
    "inputSchema": {
        "type": "object",
        "properties": {
            "favorite_name": {
                "type": "string",
                "description": "按收藏夹名称筛选（支持模糊匹配）"
            },
            "tag_name": {
                "type": "string",
                "description": "按标签名称筛选（支持模糊匹配）"
            },
            "status": {
                "type": "string",
                "enum": ["active", "archived", "deleted"],
                "description": "按状态筛选"
            },
            "limit": {
                "type": "integer",
                "description": "返回结果的最大数量",
                "default": 50,
                "minimum": 1,
                "maximum": 100
            }
        }
    }
}
```

---

#### 4. 内容详情 (Get Collection)

**功能描述：**
让 Claude 能够获取特定内容的详细信息，包括标题、内容、标签等。

**实现方式：**
- 创建新的 MCP 工具 `get_collection`
- 调用 `/api/collections/:id` 端点
- 支持通过标题、URL 或 ID 查找

**使用场景：**
```
用户: "告诉我那篇关于 React Hooks 的文章的详细内容"
Claude: [调用 search 找到文章，然后调用 get_collection]
文章标题：《深入理解 React Hooks》
URL: https://example.com/react-hooks
内容摘要：...
标签：React, Hooks, 前端开发
```

**技术实现：**
- 创建 `GetCollectionTool` 结构体
- 支持通过 ID、标题或 URL 查找
- 返回完整内容信息

---

### P1 - 管理功能（重要功能）

这些功能让 Claude 能够帮助用户管理知识库的组织结构。

#### 5. 标签管理 (Tag Management)

**功能描述：**
让 Claude 能够管理标签：创建、列出、为内容添加/移除标签。

**实现方式：**
- 创建多个 MCP 工具：`list_tags`, `create_tag`, `add_tags_to_collection`, `remove_tag_from_collection`
- 调用相应的 `/api/tags` 端点

**使用场景：**
```
用户: "为那篇 React 文章添加'前端开发'标签"
Claude: [调用 add_tags_to_collection] 已为文章添加"前端开发"标签。

用户: "列出我所有的标签"
Claude: [调用 list_tags] 您有 15 个标签：React, Vue, TypeScript, ...
```

**工具列表：**
- `list_tags` - 列出所有标签
- `create_tag` - 创建新标签
- `add_tags_to_collection` - 为内容添加标签
- `remove_tag_from_collection` - 从内容移除标签

---

#### 6. 收藏夹管理 (Favorite Management)

**功能描述：**
让 Claude 能够管理收藏夹：创建、列出、将内容移动到收藏夹。

**实现方式：**
- 创建多个 MCP 工具：`list_favorites`, `create_favorite`, `move_collection_to_favorite`
- 调用相应的 `/api/favorites` 端点

**使用场景：**
```
用户: "创建一个叫'AI 学习'的收藏夹"
Claude: [调用 create_favorite] 已创建收藏夹"AI 学习"。

用户: "把那篇关于 GPT 的文章移到'AI 学习'收藏夹"
Claude: [调用 move_collection_to_favorite] 已将文章移动到"AI 学习"收藏夹。
```

**工具列表：**
- `list_favorites` - 列出所有收藏夹
- `create_favorite` - 创建新收藏夹
- `move_collection_to_favorite` - 将内容移动到收藏夹

---

#### 7. 内容更新 (Update Collection)

**功能描述：**
让 Claude 能够更新已收集的内容：修改标题、添加备注、归档等。

**实现方式：**
- 创建 MCP 工具 `update_collection`
- 调用 `/api/collections/:id` PUT 端点

**使用场景：**
```
用户: "把那篇 React 文章的标题改成'React Hooks 完全指南'"
Claude: [调用 update_collection] 已更新文章标题。

用户: "归档那篇旧文章"
Claude: [调用 archive_collection] 已归档文章。
```

**工具列表：**
- `update_collection` - 更新内容信息
- `archive_collection` - 归档内容
- `restore_collection` - 恢复归档内容

---

### P2 - 高级功能（可选功能）

这些功能增强 Claude 的能力，提供更高级的知识管理功能。

#### 8. 知识图谱查询 (Knowledge Graph Query)

**功能描述：**
让 Claude 能够查询知识图谱，发现内容之间的关联。

**实现方式：**
- 创建 MCP 工具 `query_knowledge_graph`
- 调用知识图谱查询 API（如果已实现）

**使用场景：**
```
用户: "找出与 React Hooks 相关的所有文章"
Claude: [调用 query_knowledge_graph] 找到了 5 篇相关文章，它们通过以下方式关联：
- 语义相似：3 篇
- 标签共享：2 篇
...
```

**注意：** 此功能需要知识图谱功能已实现（Beta 阶段）。

---

#### 9. 统计分析 (Statistics)

**功能描述：**
让 Claude 能够提供知识库的统计信息。

**实现方式：**
- 创建 MCP 工具 `get_statistics`
- 调用 `/api/collections/stats` 端点

**使用场景：**
```
用户: "我的知识库有什么统计信息？"
Claude: [调用 get_statistics]
- 总文章数：127
- 收藏夹数：8
- 标签数：15
- 最近收集：3 天前
...
```

---

#### 10. AI 内容分析 (AI Content Analysis)

**功能描述：**
让 Claude 能够触发 AI 内容分析（生成摘要、标签、分类等）。

**实现方式：**
- 创建 MCP 工具 `analyze_content`
- 调用 AI 分析 API（如果已实现）

**使用场景：**
```
用户: "为那篇新文章生成摘要和标签"
Claude: [调用 analyze_content]
已生成摘要：...
已生成标签：React, Hooks, 前端开发
```

**注意：** 此功能需要 AI 分类功能已实现（Alpha 阶段）。

---

## 实现计划

### 阶段 1：核心功能（P0）

**目标：** 实现最基本的 Claude Skill 功能，让 Claude 能够搜索和收集内容。

**任务：**
1. ✅ 复用现有 `search` 工具（已完成）
2. 实现 `collect_content` 工具
3. 实现 `list_collections` 工具
4. 实现 `get_collection` 工具

**预计时间：** 1-2 周

---

### 阶段 2：管理功能（P1）

**目标：** 实现内容管理功能，让 Claude 能够帮助用户组织知识库。

**任务：**
1. 实现标签管理工具（`list_tags`, `create_tag`, `add_tags_to_collection`, `remove_tag_from_collection`）
2. 实现收藏夹管理工具（`list_favorites`, `create_favorite`, `move_collection_to_favorite`）
3. 实现内容更新工具（`update_collection`, `archive_collection`, `restore_collection`）

**预计时间：** 2-3 周

---

### 阶段 3：高级功能（P2）

**目标：** 实现高级功能，增强 Claude 的知识管理能力。

**任务：**
1. 实现知识图谱查询工具（需要知识图谱功能已实现）
2. 实现统计分析工具
3. 实现 AI 内容分析工具（需要 AI 分类功能已实现）

**预计时间：** 根据依赖功能实现情况

---

## 技术实现细节

### 工具注册

所有 Claude Skill 工具都通过 MCP 协议注册，复用现有的 MCP 实现：

```rust
// apps/desktop/src-tauri/src/server/mcp/service.rs
impl McpService {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self {
            search_tool: SearchTool::new(app_state.clone()),
            collect_content_tool: CollectContentTool::new(app_state.clone()),
            list_collections_tool: ListCollectionsTool::new(app_state.clone()),
            // ... 其他工具
        }
    }
}
```

### 自然语言解析

所有工具都支持自然语言指令解析，例如：

- "搜索 react 收藏夹" → `{ query: "react", favorite_name: "react" }`
- "保存这篇文章到前端开发收藏夹" → `{ url: "...", favorite_name: "前端开发" }`

### 错误处理

所有工具都实现统一的错误处理：

```rust
pub enum McpToolError {
    AppNotRunning,
    InvalidInput(String),
    NotFound(String),
    ServerError(String),
}
```

---

## 使用示例

### 示例 1：搜索内容

```
用户: "我之前收集过关于 TypeScript 的文章吗？"

Claude: [调用 search 工具]
是的，您收集了 5 篇关于 TypeScript 的文章：
1. 《TypeScript 高级类型》- https://example.com/ts-advanced
2. 《TypeScript 最佳实践》- https://example.com/ts-best-practices
...
```

### 示例 2：收集内容

```
用户: "帮我把这篇文章保存到我的知识库：https://example.com/new-article"

Claude: [调用 collect_content 工具]
已成功保存文章《新文章标题》到知识库。
文章已添加到"未分类"收藏夹。
```

### 示例 3：管理标签

```
用户: "为那篇 React 文章添加'前端开发'和'React'标签"

Claude: [调用 add_tags_to_collection 工具]
已为文章添加标签："前端开发"、"React"。
```

### 示例 4：查询统计

```
用户: "我的知识库有多少篇文章？"

Claude: [调用 get_statistics 工具]
您的知识库统计信息：
- 总文章数：127
- 收藏夹数：8
- 标签数：15
- 最近收集：3 天前
```

---

## 与现有 MCP 集成的关系

### 复用现有实现

Claude Skill 功能完全基于现有的 MCP 实现：

- ✅ 复用 MCP 协议端点 (`/mcp`)
- ✅ 复用 MCP Service 架构
- ✅ 复用工具注册机制
- ✅ 复用错误处理

### 扩展点

Claude Skill 通过添加新工具扩展 MCP 功能：

- 新增工具：`collect_content`, `list_collections`, `get_collection` 等
- 增强现有工具：`search` 工具已支持，无需修改

---

## 配置方式

Claude Skill 通过 MCP 协议配置，与现有 MCP 配置相同：

```json
{
  "memory-prosthetic": {
    "url": "http://127.0.0.1:21890/mcp"
  }
}
```

**优势：**
- ✅ 无需额外配置
- ✅ 与现有 MCP 集成统一
- ✅ 支持所有支持 MCP 的 AI 助手（Claude Desktop、Cursor 等）

---

## 总结

### 核心价值

Claude Skill 功能让 Memory Prosthetic 从"工具"升级为"AI 助手"，用户可以通过自然语言与 Claude 交互，完成所有知识管理任务。

### 实现优先级

1. **P0（必须）** - 搜索、收集、查询、详情
2. **P1（重要）** - 标签管理、收藏夹管理、内容更新
3. **P2（可选）** - 知识图谱、统计分析、AI 分析

### 技术优势

- ✅ 完全基于现有 MCP 实现，无需重复开发
- ✅ 支持自然语言指令，用户体验友好
- ✅ 渐进式实现，可以分阶段交付
- ✅ 与现有架构无缝集成

---

## 下一步行动

1. **确认功能优先级** - 与用户确认哪些功能最重要
2. **开始实现 P0 功能** - 从 `collect_content` 工具开始
3. **测试和验证** - 确保工具能够正确响应自然语言指令
4. **重要：** 需要确认 Claude Skill 的具体格式要求（可能与 MCP 略有不同）

---

*本文档基于 Memory Prosthetic PRD 和现有 MCP 实现，建议根据实际需求调整优先级和功能范围。*
