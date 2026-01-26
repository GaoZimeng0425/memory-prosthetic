---
title: AI 与图谱架构分离说明
description: 说明 AI 处理和图谱算法的职责分离架构决策
author: Gao
date: 2025-12-25
status: confirmed
type: architecture
---

# AI 与图谱架构分离说明

## 架构决策

### 核心原则

1. **AI 处理在前端**：所有 AI 内容理解功能（摘要、标签、分类、关键词、主题）由前端 `@memory-prosthetic/ai` 包实现，直接调用云端 API
2. **图谱算法在后端**：所有图谱关联发现、关联计算、图谱构建算法在 Rust 后端实现
3. **数据流**：前端 AI → 数据库存储 → Rust 后端读取 → 关联计算 → 数据库存储 → 前端可视化

## 详细分工

### 前端 AI 包 (`packages/ai`)

**职责：**

- ✅ 调用云端 AI API 生成内容元数据
- ✅ 摘要生成（`generateSummary`）
- ✅ 标签生成（`generateTags`）
- ✅ 内容分类（`classifyContent`）
- ✅ 关键词提取（`extractKeywords`）
- ✅ 主题识别（`identifyTopics`）
- ✅ 统一处理接口（`processContentAi`）
- ✅ 请求限流和缓存

**不负责：**

- ❌ 关联发现和计算
- ❌ 图谱构建
- ❌ 关联权重计算

### Rust 后端 (`apps/desktop/src-tauri/src/graph/`)

**职责：**

- ✅ 读取前端 AI 生成的元数据（标签、关键词、主题）
- ✅ 标签共享关联发现（基于 AI 生成的标签）
- ✅ 关键词重叠关联发现（基于 AI 生成的关键词）
- ✅ 主题相同关联发现（基于 AI 生成的主题）
- ✅ 语义相似关联发现（基于本地 Embedding 模型）
- ✅ 时间邻近关联发现（基于收集时间）
- ✅ 域名相同关联发现（基于 URL 域名）
- ✅ 收藏夹共享关联发现（基于收藏夹归属）
- ✅ 关联权重计算和合并
- ✅ 图谱构建和分析

**不负责：**

- ❌ AI 内容理解（摘要、标签、分类等）
- ❌ 云端 API 调用

## 数据流示例

### 1. 内容收集和 AI 处理

```
用户收集内容
  ↓
前端调用 processContentAi()
  ↓
云端 AI API（OpenAI/Anthropic）
  ↓
生成元数据：{ summary, tags, keywords, topics, classification }
  ↓
前端调用 Tauri Command: update_collection_ai_metadata()
  ↓
Rust 后端存储到数据库
```

### 2. 关联发现

```
新内容保存后触发关联发现
  ↓
Rust 后端调用 discover_associations()
  ↓
读取数据库中的 AI 元数据：
  - 标签（tags）
  - 关键词（keywords）
  - 主题（topics）
  - Embedding 向量（用于语义相似）
  ↓
计算各种关联类型：
  - 标签共享关联（基于 tags）
  - 关键词重叠关联（基于 keywords）
  - 主题相同关联（基于 topics）
  - 语义相似关联（基于 Embedding）
  - 时间邻近关联（基于 collected_at）
  - 域名相同关联（基于 url）
  ↓
计算关联权重并合并
  ↓
存储关联到数据库
```

### 3. 图谱可视化

```
用户打开图谱视图
  ↓
前端调用 Tauri Command: get_graph_data()
  ↓
Rust 后端读取关联数据
  ↓
构建图谱数据结构（节点 + 边）
  ↓
返回给前端
  ↓
前端使用 AntV G6 渲染图谱
```

## 数据库交互

### AI 元数据存储

```rust
// Rust 后端：存储前端生成的 AI 元数据
#[tauri::command]
pub async fn update_collection_ai_metadata(
    id: String,
    ai_metadata: AiMetadata,  // 来自前端
) -> Result<CommandResult<()>, CommandError> {
    // 存储到 collections 表和相关表
    db.update_collection_ai_metadata(id, ai_metadata).await?;
    Ok(CommandResult { data: () })
}
```

### 关联发现读取

```rust
// Rust 后端：读取 AI 元数据用于关联计算
impl TagAssociationCalculator {
    pub async fn discover_associations(&self, ...) -> Result<Vec<Association>> {
        // 从数据库读取标签
        let tags = db.get_collection_tags(&content_id).await?;

        // 计算标签共享关联
        // ...
    }
}
```

## 优势

1. **职责清晰**：AI 处理和图谱算法分离，各司其职
2. **性能优化**：图谱算法在 Rust 后端执行，性能更好
3. **灵活性**：前端 AI 可以轻松切换不同的云端提供商
4. **可维护性**：代码组织清晰，易于维护和扩展

## 注意事项

1. **数据同步**：确保前端 AI 处理完成后，数据及时存储到数据库
2. **错误处理**：如果 AI 处理失败，图谱算法需要优雅降级
3. **性能考虑**：关联发现是批量操作，需要优化数据库查询

---

**文档状态：** 已确认架构分离方案
