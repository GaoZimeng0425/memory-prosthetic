---
title: Tech-Spec: 知识图谱与 AI 分类功能
description: 知识图谱构建和 AI 内容理解功能的完整技术规范
author: Gao
date: 2025-12-25
status: ready-for-development
type: tech-spec
epic: Knowledge Graph & AI Classification
stories: FR54-FR315 (262 functional requirements)
---

# Tech-Spec: 知识图谱与 AI 分类功能

## Overview

### Problem Statement

用户需要能够：

1. **发现内容关联** - 自动发现收集内容之间的关联，形成知识网络
2. **AI 自动理解** - 自动生成摘要、标签、分类，提升内容组织效率
3. **知识可视化** - 通过图谱可视化探索知识结构
4. **智能推荐** - 基于关联和分类推荐相关内容

**用户价值：**

- 从孤立的信息转化为相互连接的知识网络
- 无需手动分类，AI 自动理解内容
- 通过图谱探索发现隐藏的知识关联
- 提升搜索和组织效率

### Solution

实现完整的知识图谱和 AI 分类系统，包括：

1. **知识图谱构建** - 自动发现和计算内容之间的多种关联类型
2. **关联可视化** - 力导向图展示知识网络
   - **全量模式**：在图谱页面显示所有文章和关联
   - **焦点模式**：在文章页面只显示与该文章相关的图谱
   - **关联强度可视化**：关联性越强，节点距离越近
   - **关联类型区分**：不同类型的关联使用不同颜色的连线
3. **AI 内容理解** - 自动生成摘要、标签、分类、关键词、主题
4. **关联探索** - 路径查找、知识簇识别、关联筛选
5. **性能优化** - 增量更新、缓存、批量处理

### Scope (In/Out)

**In:**

- 知识图谱构建（FR54-FR63, FR197-FR315）
- 图谱可视化（FR64-FR77）
- 图谱探索（FR78-FR88）
- AI 自动摘要（FR118-FR126）
- AI 自动标签（FR127-FR136）
- AI 内容分类（FR137-FR145）
- AI 关键词提取（FR146-FR152）
- AI 主题识别（FR153-FR159）
- 关联发现和计算（FR197-FR315）

**Out:**

- 云端 AI API 集成（用户可选，非核心）
- 知识图谱导出（未来功能）
- 关联编辑（未来功能）
- 多设备图谱同步（未来功能）

## Context for Development

### Codebase Patterns

**数据库操作模式：**

```rust
// apps/desktop/src-tauri/src/db/graph.rs
pub struct GraphDb {
    conn: Arc<Mutex<Connection>>,
}

impl GraphDb {
    pub fn create_association(
        &self,
        source_id: &str,
        target_id: &str,
        assoc_type: AssociationType,
        weight: f64,
    ) -> Result<(), DbError> {
        // Implementation
    }
}
```

**关联计算模式：**

```rust
// apps/desktop/src-tauri/src/graph/association.rs
pub struct AssociationCalculator {
    embedding_model: Arc<EmbeddingModel>,
    db: Arc<GraphDb>,
}

impl AssociationCalculator {
    pub async fn calculate_semantic_similarity(
        &self,
        content1: &Collection,
        content2: &Collection,
    ) -> Result<f64, CalculationError> {
        // Implementation
    }
}
```

**AI 处理模式：**

```rust
// apps/desktop/src-tauri/src/ai/processor.rs
pub struct AiProcessor {
    summary_model: Option<Arc<SummaryModel>>,
    tag_model: Option<Arc<TagModel>>,
    embedding_model: Arc<EmbeddingModel>,
}

impl AiProcessor {
    pub async fn process_content(
        &self,
        content: &Collection,
    ) -> Result<AiMetadata, ProcessingError> {
        // Implementation
    }
}
```

## Architecture Design

### System Architecture

**架构说明：**

- **AI 处理**：前端 `@memory-prosthetic/ai` 包调用云端 API，生成摘要、标签、分类、关键词、主题
- **图谱算法**：Rust 后端读取 AI 生成的数据，进行关联发现、关联计算、图谱构建
- **数据流**：前端 AI → 数据库存储 → Rust 后端读取 → 关联计算 → 数据库存储 → 前端可视化

```text
┌─────────────────────────────────────────────────────────────┐
│ React Frontend (apps/desktop/src/)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ AI Package (@memory-prosthetic/ai)                    │  │
│  │  ├─ config.ts (AI 配置)                                │  │
│  │  ├─ summary.ts (摘要生成) ✅ 前端云端 API              │  │
│  │  ├─ tags.ts (标签生成) ✅ 前端云端 API                 │  │
│  │  ├─ classification.ts (内容分类) ✅ 前端云端 API        │  │
│  │  ├─ keywords.ts (关键词提取) ✅ 前端云端 API            │  │
│  │  ├─ topics.ts (主题识别) ✅ 前端云端 API                │  │
│  │  └─ processor.ts (统一处理接口)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
│                              │ 保存 AI 元数据                │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Graph UI Components                                   │  │
│  │  ├─ GraphView.tsx (图谱可视化)                        │  │
│  │  ├─ GraphExplorer.tsx (图谱探索)                      │  │
│  │  └─ GraphControls.tsx (图谱控制)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP/HTTPS (云端 AI API)
                              │
┌─────────────────────────────────────────────────────────────┐
│ Cloud AI Providers                                          │
│  ├─ OpenAI (GPT-4o-mini, GPT-4)                           │
│  ├─ Anthropic (Claude 3 Haiku, Claude 3 Sonnet)           │
│  └─ Custom API (兼容 OpenAI 格式)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    Tauri IPC (Commands)
                              │
┌─────────────────────────────────────────────────────────────┐
│ Rust Backend (apps/desktop/src-tauri/src/)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Graph Module (graph/) ✅ 后端算法实现                 │  │
│  │  ├─ association.rs (关联计算)                        │  │
│  │  │   ├─ 语义相似关联（基于 Embedding）                │  │
│  │  │   ├─ 标签共享关联（基于 AI 生成的标签）            │  │
│  │  │   ├─ 关键词重叠关联（基于 AI 生成的关键词）        │  │
│  │  │   ├─ 主题相同关联（基于 AI 生成的主题）            │  │
│  │  │   └─ 其他关联类型（时间、域名、收藏夹等）          │  │
│  │  ├─ discovery.rs (关联发现)                           │  │
│  │  ├─ builder.rs (图谱构建)                             │  │
│  │  └─ analyzer.rs (图谱分析)                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Database (db/)                                        │  │
│  │  ├─ graph.rs (图谱数据操作)                           │  │
│  │  ├─ ai_metadata.rs (AI 元数据存储)                    │  │
│  │  └─ associations.rs (关联数据操作)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 数据流说明

1. **内容收集** → 前端调用 `processContentAi()` → 云端 AI API → 生成元数据
2. **元数据存储** → 前端调用 Tauri Command `update_collection_ai_metadata` → Rust 后端存储到数据库
3. **关联发现** → Rust 后端读取 AI 元数据 → 计算关联 → 存储关联数据
4. **图谱可视化** → 前端调用 Tauri Command `get_graph_data` → Rust 后端返回图谱数据 → 前端使用 AntV G6 渲染

### Data Model

#### Database Schema Extensions

```sql
-- 关联表
CREATE TABLE associations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,  -- semantic/tag/folder/time/domain/keyword/topic/reference/author
    types TEXT,  -- JSON array of types (支持多类型组合)
    weight REAL NOT NULL DEFAULT 0.0,  -- 0-1
    confidence REAL DEFAULT 0.0,  -- 0-1
    quality_score REAL DEFAULT 0.0,  -- 0-1
    reason TEXT,  -- auto_discovered/user_created/system_recommended
    user_feedback TEXT,  -- confirmed/deleted/ignored/null
    access_count INTEGER DEFAULT 0,
    last_accessed_at INTEGER,
    is_expired INTEGER DEFAULT 0,  -- 0/1
    is_directional INTEGER DEFAULT 0,  -- 0/1
    direction TEXT,  -- forward/backward/bidirectional
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (source_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES collections(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, type)  -- 防止重复关联
);

-- 关联类型特定字段表（可选，或使用 JSON 字段）
CREATE TABLE association_metadata (
    association_id TEXT NOT NULL,
    semantic_similarity REAL,  -- 仅 type=semantic
    shared_tags TEXT,  -- JSON array, 仅 type=tag
    shared_folders TEXT,  -- JSON array, 仅 type=folder
    time_interval INTEGER,  -- 天数, 仅 type=time
    domain TEXT,  -- 仅 type=domain
    keyword_overlap REAL,  -- 仅 type=keyword
    topic_match REAL,  -- 仅 type=topic
    PRIMARY KEY (association_id),
    FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE
);

-- AI 元数据表扩展
ALTER TABLE collections ADD COLUMN summary TEXT;
ALTER TABLE collections ADD COLUMN summary_type TEXT;  -- auto/manual
ALTER TABLE collections ADD COLUMN content_type TEXT;  -- article/tutorial/docs/news/blog/paper
ALTER TABLE collections ADD COLUMN domain TEXT;  -- frontend/backend/fullstack/mobile/devops/ai
ALTER TABLE collections ADD COLUMN difficulty TEXT;  -- beginner/intermediate/advanced/expert
ALTER TABLE collections ADD COLUMN language TEXT;  -- zh/en/mixed
ALTER TABLE collections ADD COLUMN quality_score REAL;  -- 0-1
ALTER TABLE collections ADD COLUMN processed_at INTEGER;

-- 关键词表
CREATE TABLE keywords (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 0.0,  -- 0-1
    extraction_method TEXT,  -- ai/tfidf/textrank（当前仅支持 'ai'）
    created_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 主题表
CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,  -- 0-1
    created_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- AI 处理日志表
CREATE TABLE ai_processing_logs (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL,
    task_type TEXT NOT NULL,  -- summary/tag/classification/keyword/topic
    model_name TEXT,
    status TEXT NOT NULL,  -- success/failed/timeout
    processing_time INTEGER,  -- 毫秒
    error_message TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_associations_source_id ON associations(source_id);
CREATE INDEX idx_associations_target_id ON associations(target_id);
CREATE INDEX idx_associations_type ON associations(type);
CREATE INDEX idx_associations_weight ON associations(weight);
CREATE INDEX idx_associations_created_at ON associations(created_at);
CREATE INDEX idx_keywords_collection_id ON keywords(collection_id);
CREATE INDEX idx_topics_collection_id ON topics(collection_id);
CREATE INDEX idx_ai_logs_collection_id ON ai_processing_logs(collection_id);
CREATE INDEX idx_ai_logs_task_type ON ai_processing_logs(task_type);
```

#### TypeScript Types

```typescript
// packages/shared/src/types/graph.ts
export type AssociationType =
  | 'semantic'
  | 'tag'
  | 'folder'
  | 'time'
  | 'domain'
  | 'keyword'
  | 'topic'
  | 'reference'
  | 'author'

export type AssociationReason =
  | 'auto_discovered'
  | 'user_created'
  | 'system_recommended'

export type UserFeedback = 'confirmed' | 'deleted' | 'ignored' | null

export type Association = {
  id: string
  sourceId: string
  targetId: string
  type: AssociationType
  types: AssociationType[]  // 多类型组合
  weight: number  // 0-1
  confidence: number  // 0-1
  qualityScore: number  // 0-1
  reason: AssociationReason
  userFeedback: UserFeedback
  accessCount: number
  lastAccessedAt: number | null
  isExpired: boolean
  isDirectional: boolean
  direction: 'forward' | 'backward' | 'bidirectional' | null
  createdAt: number
  updatedAt: number
  // 类型特定字段
  semanticSimilarity?: number
  sharedTags?: string[]
  sharedFolders?: string[]
  timeInterval?: number
  domain?: string
  keywordOverlap?: number
  topicMatch?: number
}

export type GraphNode = {
  id: string
  title: string
  url: string
  summary: string | null
  tags: string[]
  folder: string | null
  collectedAt: number
  degree: number  // 关联度（度中心性）
}

export type GraphEdge = Association

export type GraphData = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type GraphFilters = {
  minWeight?: number  // 最小权重阈值（0-1）
  types?: AssociationType[]  // 关联类型筛选
  maxNodes?: number  // 最大节点数（用于性能优化）
  focusedNodeId?: number  // 焦点模式：中心节点 ID
  maxDepth?: number  // 焦点模式：最大关联深度（默认 1，仅直接关联）
}

// packages/shared/src/types/ai.ts
export type SummaryType = 'auto' | 'manual'

export type ContentType =
  | 'article'
  | 'tutorial'
  | 'docs'
  | 'news'
  | 'blog'
  | 'paper'

export type Domain =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'devops'
  | 'ai'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type Language = 'zh' | 'en' | 'mixed'

export type AiMetadata = {
  summary: string | null
  summaryType: SummaryType
  contentType: ContentType | null
  domain: Domain | null
  difficulty: Difficulty | null
  language: Language | null
  qualityScore: number | null
  processedAt: number | null
  keywords: Keyword[]
  topics: Topic[]
}

export type Keyword = {
  id: string
  keyword: string
  weight: number  // 0-1
  extractionMethod: 'ai' | 'tfidf' | 'textrank'  // 当前仅支持 'ai'
}

export type Topic = {
  id: string
  topic: string
  confidence: number  // 0-1
}

export type AiProcessingLog = {
  id: string
  collectionId: string
  taskType: 'summary' | 'tag' | 'classification' | 'keyword' | 'topic'
  modelName: string | null
  status: 'success' | 'failed' | 'timeout'
  processingTime: number | null  // 毫秒
  errorMessage: string | null
  createdAt: number
}
```

## Implementation Details

### 1. 关联发现机制 (Association Discovery)

**架构说明：**

- **AI 数据生成**：前端 `@memory-prosthetic/ai` 包生成标签、关键词、主题等元数据，通过 Tauri Command 存储到数据库
- **关联计算**：Rust 后端读取 AI 生成的元数据，进行关联发现和权重计算
- **语义相似关联**：仍需要本地 Embedding 模型（用于搜索和图谱语义相似度计算）

#### 1.1 语义相似关联发现

**说明：** 语义相似关联基于本地 Embedding 模型计算，不依赖前端 AI。

```rust
// apps/desktop/src-tauri/src/graph/association.rs
pub struct SemanticAssociationCalculator {
    embedding_model: Arc<EmbeddingModel>,
    threshold: f64,  // 默认 0.7
}

impl SemanticAssociationCalculator {
    pub async fn discover_associations(
        &self,
        new_content: &Collection,
        existing_contents: &[Collection],
    ) -> Result<Vec<Association>, DiscoveryError> {
        let new_embedding = self.embedding_model.encode(&new_content.content).await?;

        let mut associations = Vec::new();

        for existing in existing_contents {
            let existing_embedding = self.embedding_model
                .get_embedding(&existing.id)
                .await?;

            let similarity = cosine_similarity(&new_embedding, &existing_embedding);

            if similarity >= self.threshold {
                associations.push(Association {
                    source_id: new_content.id.clone(),
                    target_id: existing.id.clone(),
                    type: AssociationType::Semantic,
                    weight: similarity,
                    confidence: self.calculate_confidence(similarity),
                    // ... other fields
                });
            }
        }

        Ok(associations)
    }

    fn calculate_confidence(&self, similarity: f64) -> f64 {
        if similarity > 0.85 {
            1.0  // 高置信度
        } else if similarity >= 0.7 {
            0.7  // 中置信度
        } else {
            0.5  // 低置信度
        }
    }
}
```

#### 1.2 标签共享关联发现

**说明：** 标签数据由前端 AI 包（`@memory-prosthetic/ai`）生成并存储到数据库，Rust 后端读取标签数据进行关联计算。

```rust
pub struct TagAssociationCalculator {
    db: Arc<GraphDb>,
}

impl TagAssociationCalculator {
    pub async fn discover_associations(
        &self,
        new_content: &Collection,
        existing_contents: &[Collection],
    ) -> Result<Vec<Association>, DiscoveryError> {
        // 从数据库读取 AI 生成的标签（包括自动标签和手动标签）
        let new_tags: HashSet<String> = self.db
            .get_collection_tags(&new_content.id)
            .await?
            .iter()
            .map(|t| t.name.clone())
            .collect();

        existing_contents
            .iter()
            .filter_map(|existing| {
                // 从数据库读取现有内容的标签
                let existing_tags: HashSet<String> = self.db
                    .get_collection_tags(&existing.id)
                    .await?
                    .iter()
                    .map(|t| t.name.clone())
                    .collect();
                let shared_tags: Vec<String> = new_tags
                    .intersection(&existing_tags)
                    .cloned()
                    .collect();

                if shared_tags.is_empty() {
                    return None;
                }

                // 权重计算: min(共享标签数 / 5, 1.0)
                let weight = (shared_tags.len() as f64 / 5.0).min(1.0);

                Some(Association {
                    source_id: new_content.id.clone(),
                    target_id: existing.id.clone(),
                    type: AssociationType::Tag,
                    weight,
                    shared_tags: Some(shared_tags),
                    // ... other fields
                })
            })
            .collect()
    }
}
```

#### 1.3 时间邻近关联发现

```rust
pub struct TemporalAssociationCalculator {
    time_window: i64,  // 默认 30 天（秒）
}

impl TemporalAssociationCalculator {
    pub fn discover_associations(
        &self,
        new_content: &Collection,
        existing_contents: &[Collection],
    ) -> Vec<Association> {
        let new_time = new_content.collected_at;

        existing_contents
            .iter()
            .filter_map(|existing| {
                let time_diff = (new_time - existing.collected_at).abs();
                let days_diff = time_diff / 86400;  // 转换为天数

                if days_diff > self.time_window {
                    return None;
                }

                // 权重计算: max(0, 1 - 间隔天数 / 30)
                let weight = (1.0 - (days_diff as f64 / 30.0)).max(0.0);

                // 时间簇识别: 1 小时内收集的内容权重提升
                let weight = if time_diff < 3600 {
                    weight * 1.5
                } else {
                    weight
                };

                Some(Association {
                    source_id: new_content.id.clone(),
                    target_id: existing.id.clone(),
                    type: AssociationType::Time,
                    weight: weight.min(1.0),
                    time_interval: Some(days_diff),
                    // ... other fields
                })
            })
            .collect()
    }
}
```

#### 1.4 关联权重计算

```rust
pub struct WeightCalculator {
    type_weights: HashMap<AssociationType, f64>,
}

impl WeightCalculator {
    pub fn new() -> Self {
        let mut type_weights = HashMap::new();
        type_weights.insert(AssociationType::Semantic, 1.0);
        type_weights.insert(AssociationType::Tag, 0.8);
        type_weights.insert(AssociationType::Folder, 0.6);
        type_weights.insert(AssociationType::Topic, 0.7);
        type_weights.insert(AssociationType::Keyword, 0.5);
        type_weights.insert(AssociationType::Time, 0.3);
        type_weights.insert(AssociationType::Domain, 0.4);

        Self { type_weights }
    }

    pub fn calculate_combined_weight(
        &self,
        associations: &[Association],
    ) -> f64 {
        if associations.is_empty() {
            return 0.0;
        }

        // 多类型加权平均
        let total_weight: f64 = associations
            .iter()
            .map(|assoc| {
                let type_weight = self.type_weights
                    .get(&assoc.type)
                    .copied()
                    .unwrap_or(0.5);
                assoc.weight * type_weight
            })
            .sum();

        let type_count = associations.len() as f64;
        let combined = total_weight / type_count;

        // 归一化到 0-1
        combined.min(1.0).max(0.0)
    }
}
```

### 2. AI 处理实现（云端方案）

**架构说明：** 所有 AI 处理在前端使用 Vercel AI SDK (`ai` 包) 直接调用云端 API，不进行本地推理。所有 AI 相关代码位于 `packages/ai` 包中。

#### 2.1 AI 服务配置

```typescript
// packages/ai/src/config.ts
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'
import { invoke } from '@tauri-apps/api/tauri'

export type AiProvider = 'openai' | 'anthropic' | 'custom'

export type AiConfig = {
  provider: AiProvider
  apiKey: string
  baseURL?: string  // 自定义 API 端点（仅 custom 时使用）
  model?: string  // 默认模型
  enabled: boolean  // 是否启用 AI 功能
}

// 默认配置
const DEFAULT_CONFIG: AiConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  enabled: false,
}

// 从设置存储中获取配置
export const getAiConfig = async (): Promise<AiConfig> => {
  try {
    // 从普通设置获取配置（不包含 API Key）
    const config = await invoke<Omit<AiConfig, 'apiKey'> | null>('get_setting', {
      key: 'ai_config',
    })

    // 从安全存储获取 API Key
    const apiKey = await getSecureApiKey()

    return {
      ...(config || DEFAULT_CONFIG),
      apiKey: apiKey || '',
    }
  } catch (error) {
    console.error('Failed to get AI config:', error)
    return DEFAULT_CONFIG
  }
}

// 保存配置到设置存储
export const saveAiConfig = async (config: AiConfig): Promise<void> => {
  // 分离 API Key 和普通配置
  const { apiKey, ...restConfig } = config

  // 保存普通配置
  await invoke('set_setting', {
    key: 'ai_config',
    value: restConfig,
  })

  // 保存 API Key 到安全存储
  if (apiKey) {
    await saveSecureApiKey(apiKey)
  } else {
    await clearSecureApiKey()
  }
}

// 安全存储 API Key（使用 Tauri secure storage）
const getSecureApiKey = async (): Promise<string | null> => {
  try {
    const { getSecure } = await import('@tauri-apps/plugin-secure-store')
    return await getSecure('ai_api_key')
  } catch (error) {
    console.error('Failed to get secure API key:', error)
    return null
  }
}

const saveSecureApiKey = async (apiKey: string): Promise<void> => {
  try {
    const { save } = await import('@tauri-apps/plugin-secure-store')
    await save('ai_api_key', apiKey)
  } catch (error) {
    console.error('Failed to save secure API key:', error)
    throw error
  }
}

const clearSecureApiKey = async (): Promise<void> => {
  try {
    const { remove } = await import('@tauri-apps/plugin-secure-store')
    await remove('ai_api_key')
  } catch (error) {
    console.error('Failed to clear secure API key:', error)
  }
}

// 获取 AI 模型实例
export const getAiModel = (config: AiConfig): LanguageModel => {
  if (!config.enabled || !config.apiKey) {
    throw new Error('AI is not enabled or API key is missing')
  }

  switch (config.provider) {
    case 'openai':
      return openai(config.model || 'gpt-4o-mini', {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })
    case 'anthropic':
      return anthropic(config.model || 'claude-3-haiku-20240307', {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })
    case 'custom':
      if (!config.baseURL) {
        throw new Error('Custom provider requires baseURL')
      }
      // 自定义 API 端点（兼容 OpenAI 格式）
      return openai(config.model || 'gpt-4o-mini', {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

// 验证 API Key 是否有效
export const validateApiKey = async (
  provider: AiProvider,
  apiKey: string,
  baseURL?: string,
): Promise<boolean> => {
  try {
    const model = getAiModel({
      provider,
      apiKey,
      baseURL,
      enabled: true,
    })

    // 发送一个简单的测试请求
    const { generateText } = await import('ai')
    await generateText({
      model,
      prompt: 'test',
      maxTokens: 5,
    })

    return true
  } catch (error) {
    console.error('API Key validation failed:', error)
    return false
  }
}
```

#### 2.2 摘要生成

```typescript
// packages/ai/src/summary.ts
import { generateText } from 'ai'
import { getAiModel, getAiConfig } from './config'

export const generateSummary = async (
  content: string,
  title: string,
): Promise<string> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请为以下文章生成一个简洁的摘要（100-200字）：

标题：${title}

内容：
${content.substring(0, 4000)}  // 限制输入长度

要求：
1. 摘要应准确概括文章的核心内容
2. 语言简洁明了
3. 长度控制在100-200字之间
4. 使用中文输出`

  try {
    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 300,
      temperature: 0.3,  // 较低温度，更确定性
    })

    // 确保摘要长度在合理范围内
    const summary = text.trim()
    if (summary.length > 200) {
      return summary.substring(0, 200) + '...'
    }
    return summary
  } catch (error) {
    console.error('Summary generation failed:', error)
    // 降级到提取式摘要
    return extractSummaryFallback(content)
  }
}

// 提取式摘要降级方案
const extractSummaryFallback = (content: string): string => {
  const paragraphs = content.split('\n\n')
  const firstParagraph = paragraphs[0] || content

  const sentences = content.split(/[。！？.!?]/)
  const keySentences = sentences
    .filter((s) => s.length > 50 && s.length < 200)
    .slice(0, 2)

  let summary = firstParagraph
  if (keySentences.length > 0) {
    summary += '\n\n' + keySentences.join('。')
  }

  if (summary.length > 200) {
    return summary.substring(0, 200) + '...'
  }
  return summary
}
```

#### 2.3 标签生成（使用结构化输出）

```typescript
// packages/ai/src/tags.ts
import { generateObject } from 'ai'
import { z } from 'zod'
import { getAiModel, getAiConfig } from './config'
import type { Tag } from '@memory-prosthetic/shared'

// 定义标签 Schema
const TagSchema = z.object({
  name: z.string().min(1).max(50),
  confidence: z.number().min(0).max(1),
})

const TagsResponseSchema = z.object({
  tags: z.array(TagSchema).min(2).max(5),
})

export const generateTags = async (
  content: string,
  title: string,
  existingTags?: string[],  // 用户已有标签，用于保持一致性
): Promise<Tag[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const existingTagsContext = existingTags?.length
    ? `\n用户已有的标签：${existingTags.join(', ')}`
    : ''

  const prompt = `请为以下文章生成2-5个相关标签：

标题：${title}
${existingTagsContext}

内容：
${content.substring(0, 3000)}

要求：
1. 标签应准确反映文章的主题和内容
2. 优先使用技术栈、领域、类型等分类标签
3. 标签应简洁（1-3个词）
4. 如果用户已有标签，尽量保持风格一致
5. confidence 范围：0-1，表示标签的置信度`

  try {
    const { object } = await generateObject({
      model,
      schema: TagsResponseSchema,
      prompt,
      temperature: 0.5,
    })

    return object.tags
      .filter((t) => t.confidence > 0.3)
      .map((t) => ({
        id: crypto.randomUUID(),
        name: t.name.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
        isAuto: true,
      }))
  } catch (error) {
    console.error('Tag generation failed:', error)
    // 降级到文本生成方式
    return generateTagsFallback(content, title, existingTags)
  }
}

// 降级方案：使用 generateText
const generateTagsFallback = async (
  content: string,
  title: string,
  existingTags?: string[],
): Promise<Tag[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const { generateText } = await import('ai')
  const { text } = await generateText({
    model,
    prompt: `提取标签：${title}\n${content.substring(0, 1000)}`,
    maxTokens: 100,
  })

  // 简单提取
  const matches = text.match(/"([^"]+)"/g) || text.match(/(\w+)/g)
  if (!matches) return []

  return matches.slice(0, 5).map((match) => ({
    id: crypto.randomUUID(),
    name: match.replace(/"/g, '').trim(),
    confidence: 0.6,
    isAuto: true,
  }))
}
```

#### 2.4 内容分类（使用结构化输出）

```typescript
// packages/ai/src/classification.ts
import { generateObject } from 'ai'
import { z } from 'zod'
import { getAiModel, getAiConfig } from './config'
import type {
  ContentType,
  Domain,
  Difficulty,
  Language,
} from '@memory-prosthetic/shared'

export type ContentClassification = {
  contentType: ContentType | null
  domain: Domain | null
  difficulty: Difficulty | null
  language: Language | null
  techStack: string[]  // 技术栈列表
}

// 定义分类 Schema
const ContentClassificationSchema = z.object({
  contentType: z
    .enum(['article', 'tutorial', 'docs', 'news', 'blog', 'paper'])
    .nullable(),
  domain: z
    .enum(['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai'])
    .nullable(),
  difficulty: z
    .enum(['beginner', 'intermediate', 'advanced', 'expert'])
    .nullable(),
  language: z.enum(['zh', 'en', 'mixed']).nullable(),
  techStack: z.array(z.string()).max(5),
})

export const classifyContent = async (
  content: string,
  title: string,
): Promise<ContentClassification> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请对以下文章进行分类：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. contentType: 文章类型，如果不确定则返回 null
2. domain: 技术领域，如果不确定则返回 null
3. difficulty: 内容难度，如果不确定则返回 null
4. language: 内容语言，如果不确定则返回 null
5. techStack: 涉及的技术栈，按重要性排序，最多5个`

  try {
    const { object } = await generateObject({
      model,
      schema: ContentClassificationSchema,
      prompt,
      temperature: 0.3,
    })

    return {
      contentType: object.contentType,
      domain: object.domain,
      difficulty: object.difficulty,
      language: object.language,
      techStack: object.techStack,
    }
  } catch (error) {
    console.error('Classification failed:', error)
    return {
      contentType: null,
      domain: null,
      difficulty: null,
      language: null,
      techStack: [],
    }
  }
}
```

#### 2.5 关键词提取（使用结构化输出）

```typescript
// packages/ai/src/keywords.ts
import { generateObject } from 'ai'
import { z } from 'zod'
import { getAiModel, getAiConfig } from './config'
import type { Keyword } from '@memory-prosthetic/shared'

// 定义关键词 Schema
const KeywordSchema = z.object({
  keyword: z.string().min(1).max(100),
  weight: z.number().min(0).max(1),
})

const KeywordsResponseSchema = z.object({
  keywords: z.array(KeywordSchema).min(5).max(10),
})

export const extractKeywords = async (
  content: string,
  title: string,
): Promise<Keyword[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请从以下文章中提取5-10个关键词：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. 关键词应准确反映文章的核心概念
2. 优先选择技术术语、概念名称
3. weight 范围：0-1，表示关键词的重要性
4. 按 weight 降序排列`

  try {
    const { object } = await generateObject({
      model,
      schema: KeywordsResponseSchema,
      prompt,
      temperature: 0.4,
    })

    return object.keywords
      .filter((k) => k.weight > 0.3)
      .map((k) => ({
        id: crypto.randomUUID(),
        keyword: k.keyword.trim(),
        weight: Math.min(1, Math.max(0, k.weight)),
        extractionMethod: 'ai' as const,
      }))
  } catch (error) {
    console.error('Keyword extraction failed:', error)
    return []
  }
}
```

#### 2.6 主题识别（使用结构化输出）

```typescript
// packages/ai/src/topics.ts
import { generateObject } from 'ai'
import { z } from 'zod'
import { getAiModel, getAiConfig } from './config'
import type { Topic } from '@memory-prosthetic/shared'

// 定义主题 Schema
const TopicSchema = z.object({
  topic: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
})

const TopicsResponseSchema = z.object({
  topics: z.array(TopicSchema).min(1).max(3),
})

export const identifyTopics = async (
  content: string,
  title: string,
): Promise<Topic[]> => {
  const config = await getAiConfig()
  const model = getAiModel(config)

  const prompt = `请识别以下文章的主要主题（1-3个）：

标题：${title}

内容：
${content.substring(0, 3000)}

要求：
1. 主题应概括文章的核心讨论点
2. confidence 范围：0-1，表示主题识别的置信度
3. 按 confidence 降序排列`

  try {
    const { object } = await generateObject({
      model,
      schema: TopicsResponseSchema,
      prompt,
      temperature: 0.4,
    })

    return object.topics
      .filter((t) => t.confidence > 0.5)
      .map((t) => ({
        id: crypto.randomUUID(),
        topic: t.topic.trim(),
        confidence: Math.min(1, Math.max(0, t.confidence)),
      }))
  } catch (error) {
    console.error('Topic identification failed:', error)
    return []
  }
}
```

#### 2.7 AI 处理统一接口（带限流和缓存）

```typescript
// packages/ai/src/processor.ts
import { generateSummary } from './summary'
import { generateTags } from './tags'
import { classifyContent } from './classification'
import { extractKeywords } from './keywords'
import { identifyTopics } from './topics'
import type { AiMetadata } from '@memory-prosthetic/shared'

// 请求限流器（避免 API 配额超限）
class RateLimiter {
  private queue: Array<() => Promise<void>> = []
  private running = 0
  private readonly maxConcurrent: number
  private readonly delayBetweenRequests: number

  constructor(maxConcurrent = 3, delayBetweenRequests = 200) {
    this.maxConcurrent = maxConcurrent
    this.delayBetweenRequests = delayBetweenRequests
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.running--
          this.processQueue()
        }
      })
      this.processQueue()
    })
  }

  private processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.running++
    const task = this.queue.shift()!
    task().then(() => {
      // 延迟后处理下一个请求
      setTimeout(() => this.processQueue(), this.delayBetweenRequests)
    })
  }
}

// 全局限流器实例
const rateLimiter = new RateLimiter(3, 200)  // 最多3个并发，请求间隔200ms

// 结果缓存（基于内容哈希）
const cache = new Map<string, { data: AiMetadata; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000  // 24小时

const getContentHash = (content: string, title: string): string => {
  // 简单哈希（实际可以使用 crypto.subtle.digest）
  return `${title}:${content.length}:${content.substring(0, 100)}`
}

export const processContentAi = async (
  content: string,
  title: string,
  existingTags?: string[],
): Promise<AiMetadata> => {
  const startTime = Date.now()
  const cacheKey = getContentHash(content, title)

  // 检查缓存
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // 使用限流器执行并行处理
    const [summary, tags, classification, keywords, topics] = await Promise.all([
      rateLimiter.execute(() => generateSummary(content, title)).catch(() => null),
      rateLimiter.execute(() => generateTags(content, title, existingTags)).catch(() => []),
      rateLimiter.execute(() => classifyContent(content, title)).catch(() => ({
        contentType: null,
        domain: null,
        difficulty: null,
        language: null,
        techStack: [],
      })),
      rateLimiter.execute(() => extractKeywords(content, title)).catch(() => []),
      rateLimiter.execute(() => identifyTopics(content, title)).catch(() => []),
    ])

    const processingTime = Date.now() - startTime

    const result: AiMetadata = {
      summary: summary || null,
      summaryType: summary ? 'auto' : null,
      contentType: classification.contentType,
      domain: classification.domain,
      difficulty: classification.difficulty,
      language: classification.language,
      qualityScore: null,  // 可选，未来可添加
      processedAt: Date.now(),
      keywords,
      topics,
      // 记录处理时间（用于日志）
      _processingTime: processingTime,
    }

    // 缓存结果
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    })

    // 清理过期缓存
    if (cache.size > 100) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key)
        }
      }
    }

    return result
  } catch (error) {
    console.error('AI processing failed:', error)
    throw error
  }
}

// 带重试的 AI 调用包装器
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
): Promise<T> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果是认证错误，不重试
      if (lastError.message.includes('401') || lastError.message.includes('Unauthorized')) {
        throw lastError
      }

      // 指数退避
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}
```

#### 2.8 AI 处理 Hook

```typescript
// apps/desktop/src/hooks/use-ai-processing.ts
import { useMutation } from '@tanstack/react-query'
import { processContentAi } from '@memory-prosthetic/ai'
import { invoke } from '@tauri-apps/api/tauri'
import type { Collection, AiMetadata } from '@memory-prosthetic/shared'

export const useAiProcessing = () => {
  return useMutation({
    mutationFn: async ({
      collection,
      existingTags,
    }: {
      collection: Collection
      existingTags?: string[]
    }): Promise<AiMetadata> => {
      // 前端 AI 处理
      const aiMetadata = await processContentAi(
        collection.content,
        collection.title,
        existingTags,
      )

      // 保存到后端数据库
      await invoke('update_collection_ai_metadata', {
        id: collection.id,
        aiMetadata,
      })

      return aiMetadata
    },
    onError: (error) => {
      console.error('AI processing error:', error)
      // 可以显示错误提示
    },
  })
}
```

#### 2.9 AI 设置页面

```typescript
// apps/desktop/src/components/features/AiSettings.tsx
import { useState, useEffect } from 'react'
import { Button, Input, Select, Alert } from '@memory-prosthetic/ui'
import {
  getAiConfig,
  saveAiConfig,
  validateApiKey,
  type AiProvider,
} from '@memory-prosthetic/ai/config'

export const AiSettings = () => {
  const [provider, setProvider] = useState<AiProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [enabled, setEnabled] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getAiConfig()
      setProvider(config.provider)
      setApiKey(config.apiKey)
      setBaseURL(config.baseURL || '')
      setModel(config.model || 'gpt-4o-mini')
      setEnabled(config.enabled)
    }
    loadConfig()
  }, [])

  // 验证 API Key
  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)

    try {
      const isValid = await validateApiKey(provider, apiKey, baseURL || undefined)
      if (isValid) {
        setError(null)
        // 显示成功提示
      } else {
        setError('API Key 验证失败，请检查是否正确')
      }
    } catch (err) {
      setError(`验证失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsValidating(false)
    }
  }

  // 保存配置
  const handleSave = async () => {
    try {
      await saveAiConfig({
        provider,
        apiKey,
        baseURL: baseURL || undefined,
        model,
        enabled,
      })
      // 显示成功提示
    } catch (err) {
      setError(`保存失败: ${err instanceof Error ? err.message : '未知错误'}`)
    }
  }

  return (
    <div className="ai-settings p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">AI 设置</h2>
        <Alert variant="info" className="mb-4">
          <p className="text-sm">
            AI 功能需要将内容发送到云端服务提供商进行处理。
            请确保您已阅读并同意相关服务提供商的隐私政策。
          </p>
        </Alert>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">启用 AI 功能</label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="ml-2"
          />
        </div>

        <div>
          <label className="text-sm font-medium">服务提供商</label>
          <Select
            value={provider}
            onValueChange={(value) => setProvider(value as AiProvider)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">自定义 API</option>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">API Key</label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="输入您的 API Key"
          />
          <p className="text-xs text-muted-foreground mt-1">
            您的 API Key 将加密存储在本地，不会上传到任何服务器
          </p>
        </div>

        {provider === 'custom' && (
          <div>
            <label className="text-sm font-medium">API 端点</label>
            <Input
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">模型</label>
          <Select value={model} onValueChange={setModel}>
            {provider === 'openai' && (
              <>
                <option value="gpt-4o-mini">GPT-4o-mini（推荐）</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {provider === 'anthropic' && (
              <>
                <option value="claude-3-haiku-20240307">Claude 3 Haiku（推荐）</option>
                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              </>
            )}
            {provider === 'custom' && (
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="模型名称"
              />
            )}
          </Select>
        </div>

        {error && (
          <Alert variant="destructive">
            <p>{error}</p>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleValidate}
            disabled={isValidating || !apiKey}
            variant="outline"
          >
            {isValidating ? '验证中...' : '验证 API Key'}
          </Button>
          <Button onClick={handleSave} disabled={!apiKey}>
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 3. 图谱可视化

#### 3.1 图谱显示模式

**图谱支持两种显示模式：**

1. **全量模式（默认）** - 在图谱页面显示所有文章
   - 显示所有收集的文章作为节点
   - 显示所有关联关系作为边
   - 适用于探索整体知识结构

2. **焦点模式** - 在文章页面只显示与该文章相关的图谱
   - 以指定文章为中心节点
   - 仅显示与该文章有直接关联的文章
   - 可选：显示二级关联（关联的关联）
   - 适用于深入探索特定主题的知识网络

#### 3.2 前端图谱组件（AntV G6）

```typescript
// apps/desktop/src/components/features/GraphView.tsx
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/tauri'
import { Graph, GraphData as G6GraphData } from '@antv/g6'
import { useEffect, useRef } from 'react'
import type { GraphData, GraphNode, GraphEdge } from '@memory-prosthetic/shared'

type GraphViewProps = {
  focusedNodeId?: number  // 焦点模式：指定中心节点 ID
  maxDepth?: number  // 焦点模式：最大关联深度（默认 1，仅直接关联）
}

export const GraphView = ({ focusedNodeId, maxDepth = 1 }: GraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Graph | null>(null)

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph', 'data', focusedNodeId, maxDepth],
    queryFn: async () => {
      const result = await invoke<CommandResult<GraphData>>('get_graph_data', {
        filters: {
          minWeight: 0.3,
          types: ['semantic', 'tag', 'folder'],
          focusedNodeId: focusedNodeId,  // 焦点模式：仅返回与指定节点相关的数据
          maxDepth: focusedNodeId ? maxDepth : undefined,  // 焦点模式：关联深度
        },
      })
      return result.data
    },
  })

  useEffect(() => {
    if (!graphData || !containerRef.current) return

    // 转换数据格式为 G6 格式
    const g6Data: G6GraphData = {
      nodes: graphData.nodes.map((node) => ({
        id: node.id,
        label: node.title,
        size: Math.max(20, Math.min(60, node.degree * 5)), // 根据关联度调整节点大小
        style: {
          fill: getNodeColor(node),
          stroke: '#fff',
          lineWidth: 2,
        },
        labelCfg: {
          style: {
            fill: '#333',
            fontSize: 12,
          },
        },
        // 自定义数据
        data: {
          url: node.url,
          summary: node.summary,
          tags: node.tags,
          folder: node.folder,
        },
      })),
      edges: graphData.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.type,
        style: {
          stroke: getEdgeColor(edge.type),  // 根据关联类型设置不同颜色
          lineWidth: Math.max(1, Math.min(5, edge.weight * 5)), // 根据权重调整边粗细
          opacity: edge.weight,
        },
        // 力导向布局：边的长度与权重成反比（权重越高，距离越近）
        weight: edge.weight,
        labelCfg: {
          style: {
            fill: '#666',
            fontSize: 10,
          },
        },
        // 自定义数据
        data: {
          weight: edge.weight,
          types: edge.types,
          confidence: edge.confidence,
        },
      })),
    }

    // 创建 G6 图实例
    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight,
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSize: 30,
        nodeStrength: -300,
        // 边的强度：根据权重动态计算，权重越高，边越短（节点距离越近）
        // edgeStrength 函数：weight 越高，返回的 strength 越大（范围 0.05-0.3）
        edgeStrength: (edge: any) => {
          const weight = edge.data?.weight || 0.5
          // 权重范围 0-1，映射到强度范围 0.05-0.3
          return 0.05 + (weight * 0.25)
        },
        // 边的长度：权重越高，理想长度越短
        edgeLength: (edge: any) => {
          const weight = edge.data?.weight || 0.5
          // 权重范围 0-1，映射到长度范围 50-200
          return 200 - (weight * 150)
        },
        collideStrength: 0.8,
        alpha: 0.3,
        alphaDecay: 0.028,
        alphaMin: 0.01,
      },
      defaultNode: {
        type: 'circle',
      },
      defaultEdge: {
        type: 'line',
      },
      modes: {
        default: [
          'drag-canvas', // 拖拽画布
          'zoom-canvas', // 缩放画布
          'drag-node', // 拖拽节点
          'click-select', // 点击选中
        ],
      },
    })

    // 渲染数据
    graph.data(g6Data)
    graph.render()

    // 节点点击事件
    graph.on('node:click', (e) => {
      const node = e.item
      const model = node.getModel()
      // 显示节点详情或跳转
      console.log('Node clicked:', model)
    })

    // 节点悬停事件
    graph.on('node:mouseenter', (e) => {
      const node = e.item
      graph.setItemState(node, 'hover', true)
    })

    graph.on('node:mouseleave', (e) => {
      const node = e.item
      graph.setItemState(node, 'hover', false)
    })

    // 边点击事件
    graph.on('edge:click', (e) => {
      const edge = e.item
      const model = edge.getModel()
      // 显示关联详情
      console.log('Edge clicked:', model)
    })

    graphRef.current = graph

    // 清理函数
    return () => {
      graph.destroy()
      graphRef.current = null
    }
  }, [graphData])

  // 响应窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.changeSize(
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight
        )
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 辅助函数：根据节点属性获取颜色
  const getNodeColor = (node: GraphNode): string => {
    if (node.degree > 10) return '#ff4d4f' // 高度关联 - 红色
    if (node.degree > 5) return '#faad14' // 中度关联 - 橙色
    return '#1890ff' // 低度关联 - 蓝色
  }

  // 辅助函数：根据关联类型获取边颜色
  const getEdgeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      semantic: '#1890ff', // 语义相似 - 蓝色
      tag: '#52c41a', // 标签共享 - 绿色
      folder: '#722ed1', // 收藏夹共享 - 紫色
      time: '#fa8c16', // 时间邻近 - 橙色
      domain: '#eb2f96', // 域名相同 - 粉色
      keyword: '#13c2c2', // 关键词重叠 - 青色
      topic: '#faad14', // 主题相同 - 金色
    }
    return colorMap[type] || '#d9d9d9'
  }

  if (isLoading) return <div>Loading graph...</div>

  return (
    <div className="graph-container h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
```

#### 3.1.1 图谱交互增强组件

```typescript
// apps/desktop/src/components/features/GraphControls.tsx
import { useState } from 'react'
import { Button } from '@memory-prosthetic/ui'
import { Slider } from '@memory-prosthetic/ui'

type GraphControlsProps = {
  onFilterChange: (filters: GraphFilters) => void
  onLayoutChange: (layout: string) => void
  onReset: () => void
}

export const GraphControls = ({
  onFilterChange,
  onLayoutChange,
  onReset,
}: GraphControlsProps) => {
  const [minWeight, setMinWeight] = useState(0.3)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['semantic', 'tag', 'folder'])

  return (
    <div className="graph-controls p-4 border-b">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">最小权重阈值</label>
          <Slider
            value={[minWeight]}
            onValueChange={([value]) => {
              setMinWeight(value)
              onFilterChange({ minWeight: value, types: selectedTypes })
            }}
            min={0}
            max={1}
            step={0.1}
          />
          <span className="text-xs text-muted-foreground">{minWeight.toFixed(1)}</span>
        </div>

        <div>
          <label className="text-sm font-medium">布局模式</label>
          <select
            onChange={(e) => onLayoutChange(e.target.value)}
            className="ml-2 px-2 py-1 border rounded"
          >
            <option value="force">力导向</option>
            <option value="circular">圆形</option>
            <option value="hierarchical">层次化</option>
            <option value="grid">网格</option>
          </select>
        </div>

        <Button onClick={onReset} variant="outline" size="sm">
          重置布局
        </Button>
      </div>
    </div>
  )
}
```

#### 3.3 图谱数据获取 Command

```rust
// apps/desktop/src-tauri/src/commands/graph.rs

#[derive(Deserialize)]
pub struct GraphFilters {
    pub min_weight: Option<f64>,
    pub types: Option<Vec<String>>,
    pub max_nodes: Option<usize>,
    pub focused_node_id: Option<i64>,  // 焦点模式：中心节点 ID
    pub max_depth: Option<usize>,  // 焦点模式：最大关联深度（默认 1）
}

#[tauri::command]
pub async fn get_graph_data(
    state: State<'_, Arc<AppState>>,
    filters: GraphFilters,
) -> Result<CommandResult<GraphData>, CommandError> {
    let graph_db = &state.graph_db;

    // 全量模式：返回所有节点和边
    if filters.focused_node_id.is_none() {
        let nodes = graph_db.get_all_nodes(&filters).await?;
        let edges = graph_db.get_all_edges(&filters).await?;
        return Ok(CommandResult {
            data: GraphData { nodes, edges },
        });
    }

    // 焦点模式：仅返回与指定节点相关的节点和边
    let focused_id = filters.focused_node_id.unwrap();
    let max_depth = filters.max_depth.unwrap_or(1);

    // 获取关联节点（BFS 遍历，最多 max_depth 层）
    let related_node_ids = graph_db
        .get_related_nodes(focused_id, max_depth, &filters)
        .await?;

    // 获取这些节点之间的所有边
    let edges = graph_db
        .get_edges_between_nodes(&related_node_ids, &filters)
        .await?;

    // 获取节点数据
    let nodes = graph_db
        .get_nodes_by_ids(&related_node_ids)
        .await?;

    Ok(CommandResult {
        data: GraphData { nodes, edges },
    })
}
```

**焦点模式实现说明：**

```rust
// apps/desktop/src-tauri/src/db/graph.rs
impl GraphDb {
    /// 获取与指定节点相关的所有节点（BFS 遍历）
    pub async fn get_related_nodes(
        &self,
        center_id: i64,
        max_depth: usize,
        filters: &GraphFilters,
    ) -> Result<Vec<i64>, DbError> {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut result = HashSet::new();

        queue.push_back((center_id, 0));  // (node_id, depth)
        visited.insert(center_id);
        result.insert(center_id);

        while let Some((node_id, depth)) = queue.pop_front() {
            if depth >= max_depth {
                continue;
            }

            // 获取该节点的所有关联
            let associations = self.get_associations_by_node(node_id, filters).await?;

            for assoc in associations {
                let neighbor_id = if assoc.source_id == node_id {
                    assoc.target_id
                } else {
                    assoc.source_id
                };

                if !visited.contains(&neighbor_id) {
                    visited.insert(neighbor_id);
                    result.insert(neighbor_id);
                    queue.push_back((neighbor_id, depth + 1));
                }
            }
        }

        Ok(result.into_iter().collect())
    }
}
```

### 4. 性能优化

#### 4.1 增量关联发现

```rust
// apps/desktop/src-tauri/src/graph/discovery.rs
pub struct IncrementalDiscovery {
    db: Arc<GraphDb>,
    calculator: Arc<AssociationCalculator>,
    cache: Arc<Mutex<HashMap<String, Vec<Association>>>>,
}

impl IncrementalDiscovery {
    pub async fn discover_for_new_content(
        &self,
        new_content: &Collection,
    ) -> Result<Vec<Association>, DiscoveryError> {
        // 仅与最近 N 篇内容进行关联发现
        let recent_contents = self.db
            .get_recent_collections(100)
            .await?;

        // 并行计算多种关联类型
        let (semantic, tag, time, domain) = tokio::join!(
            self.calculator.calculate_semantic(new_content, &recent_contents),
            self.calculator.calculate_tag(new_content, &recent_contents),
            self.calculator.calculate_time(new_content, &recent_contents),
            self.calculator.calculate_domain(new_content, &recent_contents),
        );

        let mut all_associations = Vec::new();
        all_associations.extend(semantic?);
        all_associations.extend(tag?);
        all_associations.extend(time?);
        all_associations.extend(domain?);

        // 合并重复关联
        let merged = self.merge_associations(all_associations);

        // 保存到数据库
        for assoc in &merged {
            self.db.create_association(assoc).await?;
        }

        Ok(merged)
    }
}
```

#### 4.2 关联缓存

```rust
pub struct AssociationCache {
    cache: Arc<Mutex<LruCache<String, f64>>>,  // (content_id_pair, similarity)
}

impl AssociationCache {
    pub fn get_similarity(
        &self,
        id1: &str,
        id2: &str,
    ) -> Option<f64> {
        let key = format!("{}:{}", id1, id2);
        self.cache.lock().unwrap().get(&key).copied()
    }

    pub fn set_similarity(
        &self,
        id1: &str,
        id2: &str,
        similarity: f64,
    ) {
        let key = format!("{}:{}", id1, id2);
        self.cache.lock().unwrap().put(key, similarity);
    }
}
```

## API Design

### Tauri Commands

```rust
// 图谱相关
#[tauri::command]
pub async fn get_graph_data(
    filters: GraphFilters  // 包含 focused_node_id 和 max_depth 用于焦点模式
) -> Result<CommandResult<GraphData>, CommandError>

#[tauri::command]
pub async fn get_node_associations(node_id: String) -> Result<CommandResult<Vec<Association>>, CommandError>

#[tauri::command]
pub async fn find_path(source_id: String, target_id: String) -> Result<CommandResult<Vec<String>>, CommandError>

#[tauri::command]
pub async fn get_graph_statistics() -> Result<CommandResult<GraphStatistics>, CommandError>

// AI 元数据存储（前端处理完成后保存到数据库）
#[tauri::command]
pub async fn update_collection_ai_metadata(
    id: String,
    ai_metadata: AiMetadata,
) -> Result<CommandResult<()>, CommandError>

#[tauri::command]
pub async fn get_ai_processing_logs(
    collection_id: String,
) -> Result<CommandResult<Vec<AiProcessingLog>>, CommandError>
```

### 前端 AI API（直接调用云端）

**说明：** AI 处理在前端直接调用云端 API，不通过 Tauri Commands。

```typescript
// packages/ai/src/ 目录下的所有函数都是前端 API
// 使用 Vercel AI SDK 直接调用云端服务

// 示例：摘要生成
import { generateSummary } from '@memory-prosthetic/ai'
const summary = await generateSummary(content, title)

// 示例：标签生成
import { generateTags } from './tags'
const tags = await generateTags(content, title, existingTags)

// 示例：统一处理
import { processContentAi } from './processor'
const aiMetadata = await processContentAi(content, title, existingTags)
```

## Performance Requirements

### 性能指标

| 操作 | 目标 | 实现策略 |
|------|------|----------|
| 关联发现（新内容） | < 5s | 增量发现、并行计算、范围限制 |
| 语义相似度计算 | < 50ms/对 | 缓存、向量数据库 |
| 关联权重计算 | < 10ms | 内存计算、批量处理 |
| 图谱渲染（< 50 节点） | < 500ms | 预计算布局、懒加载 |
| AI 摘要生成 | 后台异步处理 | 不要求生成速度，优先保证质量，云端 API 调用、并行处理、降级方案、缓存 |
| AI 标签生成 | 后台异步处理 | 不要求生成速度，优先保证质量，云端 API 调用、并行处理、缓存、结构化输出 |
| AI 内容分类 | 后台异步处理 | 不要求生成速度，优先保证质量，云端 API 调用、并行处理、结构化输出 |
| 关键词提取 | 后台异步处理 | 不要求生成速度，优先保证质量，云端 API 调用、并行处理、结构化输出 |
| AI 主题识别 | 后台异步处理 | 不要求生成速度，优先保证质量，云端 API 调用、并行处理、结构化输出 |
| AI 批量处理 | 后台异步处理 | 不要求生成速度，并行处理、请求限流、缓存 |
| API 请求限流 | 最多3并发，间隔200ms | 避免配额超限 |

### 优化策略

#### 图谱优化

1. **增量更新** - 仅处理新增内容，避免全量重建
2. **缓存机制** - 缓存计算结果，避免重复计算
3. **批量处理** - 批量处理多个内容，提升效率
4. **异步处理** - 后台异步处理，不阻塞 UI
5. **范围限制** - 限制关联发现范围，仅与最近 N 篇对比
6. **索引优化** - 数据库索引优化，提升查询性能

#### AI 处理优化

1. **请求限流** - 限制并发请求数（最多3个），避免 API 配额超限
2. **结果缓存** - 基于内容哈希缓存 AI 处理结果，24小时有效期
3. **并行处理** - 同时处理摘要、标签、分类等任务，提升效率
4. **结构化输出** - 使用 `generateObject` 替代 `generateText`，提升结果质量和解析可靠性
5. **降级方案** - API 失败时使用提取式方法（首段+关键句）作为降级
6. **错误重试** - 实现指数退避重试机制（最多3次），提升可靠性
7. **请求去重** - 相同内容的重复请求直接返回缓存结果
8. **批量优化** - 批量处理时使用限流器控制请求速率

## Security & Privacy

### 数据隐私

- **AI 处理使用云端 API** - 内容会发送到用户选择的云端 AI 服务提供商
- **用户明确授权** - 首次使用 AI 功能时，必须明确告知用户数据会发送到云端
- **API Key 管理** - 用户自行管理 API Key，加密存储在本地设置中
- **提供商选择** - 用户可选择 OpenAI、Anthropic 或自定义 API 端点
- **数据最小化** - 仅发送必要的文本内容，不发送元数据或用户信息
- **无遥测数据收集** - 应用本身不收集任何遥测数据
- **隐私提示** - 在设置页面明确显示当前使用的 AI 提供商和数据流向

### 数据安全

- 关联数据存储在本地 SQLite
- 支持数据备份和恢复
- 内容删除时自动删除相关关联
- **API Key 安全存储**
  - 使用系统密钥链存储（macOS: Keychain, Windows: Credential Manager）
  - 或使用加密的本地存储（Tauri secure storage）
  - 不在代码或日志中暴露 API Key
  - 提供 API Key 清除功能

## Testing Strategy

### 单元测试

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_semantic_association_calculation() {
        let calculator = SemanticAssociationCalculator::new(0.7);
        // Test implementation
    }

    #[tokio::test]
    async fn test_weight_calculation() {
        let calculator = WeightCalculator::new();
        // Test implementation
    }
}
```

### 集成测试

- 关联发现端到端测试
- AI 处理端到端测试（Mock 云端 API）
- 图谱构建和可视化测试
- AI 配置和错误处理测试

### AI 测试策略

```typescript
// packages/ai/src/__tests__/summary.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateSummary } from '../summary'

// Mock AI SDK
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: '这是一个测试摘要...',
  }),
}))

describe('generateSummary', () => {
  it('should generate summary from content', async () => {
    const summary = await generateSummary('长文章内容...', '标题')
    expect(summary).toBeTruthy()
    expect(summary.length).toBeLessThanOrEqual(200)
  })

  it('should fallback to extraction on error', async () => {
    // Mock API failure
    vi.mocked(generateText).mockRejectedValueOnce(new Error('API Error'))

    const summary = await generateSummary('长文章内容...', '标题')
    expect(summary).toBeTruthy()  // Should still return fallback summary
  })
})
```

## Implementation Sequence

### Phase 1: Foundation (P0)

**架构说明：** 图谱算法在 Rust 后端实现，读取前端 AI 生成的数据。

1. 数据库 Schema 扩展
2. 关联类型定义和基础计算
3. 语义相似关联发现（基于本地 Embedding 模型）
4. 标签共享关联发现（读取前端 AI 生成的标签）
5. 关键词重叠关联发现（读取前端 AI 生成的关键词）
6. 主题相同关联发现（读取前端 AI 生成的主题）
7. 关联权重计算
8. 基础图谱数据模型

### Phase 2: AI Processing (P0)

1. **创建 AI 包并安装依赖**

   ```bash
   # 在 packages/ai 目录下创建包结构
   # 安装 Vercel AI SDK 依赖到 packages/ai
   cd packages/ai
   bun add ai@^4.0.0 @ai-sdk/openai@^1.0.0 @ai-sdk/anthropic@^1.0.0 zod@^3.23.0
   ```

2. **AI 配置管理**
   - 创建 `packages/ai/src/config.ts` - AI 服务配置
   - 实现设置存储（API Key、提供商选择、模型选择）
   - 实现配置验证和错误处理
   - 实现 API Key 验证功能

3. **AI 处理实现（使用结构化输出）**
   - 实现 `packages/ai/src/summary.ts` - 摘要生成（使用 generateText）
   - 实现 `packages/ai/src/tags.ts` - 标签生成（使用 generateObject + zod）
   - 实现 `packages/ai/src/classification.ts` - 内容分类（使用 generateObject + zod）
   - 实现 `packages/ai/src/keywords.ts` - 关键词提取（使用 generateObject + zod）
   - 实现 `packages/ai/src/topics.ts` - 主题识别（使用 generateObject + zod）
   - 实现 `packages/ai/src/processor.ts` - 统一处理接口（并行处理所有任务）

4. **AI 处理 Hook（在 apps/desktop 中）**
   - 创建 `apps/desktop/src/hooks/use-ai-processing.ts`
   - 从 `@memory-prosthetic/ai` 导入 `processContentAi`
   - 集成 TanStack Query 进行状态管理
   - 实现错误处理和重试机制
   - 实现处理进度追踪

5. **后端存储支持**
   - 实现 `update_collection_ai_metadata` Tauri Command
   - 实现 AI 处理日志存储
   - 数据库 Schema 扩展（AI 元数据字段）

6. **用户界面**
   - AI 设置页面（`components/features/AiSettings.tsx`）
     - API Key 配置（加密存储）
     - 提供商选择（OpenAI/Anthropic/自定义）
     - 模型选择
     - API Key 验证功能
     - 隐私提示和授权确认
   - AI 处理进度指示
   - AI 元数据显示（摘要、标签、分类等）

### Phase 3: Graph Visualization (P0)

1. **安装 AntV G6 依赖**

   ```bash
   cd apps/desktop
   bun add @antv/g6@^5.11.0
   ```

2. **图谱数据获取 API**
   - 实现 `get_graph_data` Tauri Command
   - 支持全量模式（返回所有节点和边）
   - 支持焦点模式（`focused_node_id` + `max_depth`）
   - 实现 BFS 遍历获取关联节点（焦点模式）
   - 数据格式转换（GraphData → G6 格式）

3. **前端图谱可视化组件**
   - 创建 `GraphView.tsx` 组件
   - 支持 `focusedNodeId` 和 `maxDepth` 属性（焦点模式）
   - 集成 AntV G6 实例
   - 配置力导向布局，确保关联性越强，距离越近
     - 使用动态 `edgeStrength` 函数（根据权重计算）
     - 使用动态 `edgeLength` 函数（权重越高，长度越短）
   - 实现节点和边的渲染
   - 边颜色映射（根据关联类型）

4. **基础交互（拖拽、缩放、平移）**
   - 启用 G6 内置交互模式
   - 实现节点点击事件
   - 实现边点击事件
   - 实现节点悬停效果

5. **图谱控制组件**
   - 创建 `GraphControls.tsx` 组件
   - 实现权重阈值滑块
   - 实现布局模式切换
   - 实现重置布局功能
   - 实现焦点模式切换（全量/焦点）

6. **样式和主题**
   - 节点颜色映射（根据关联度）
   - 边颜色映射（根据关联类型）
   - 响应式布局适配
   - 焦点模式：中心节点高亮显示

### Phase 4: Enhanced Features (P1)

1. 时间邻近关联
2. 域名相同关联
3. 关键词重叠关联
4. 主题相同关联
5. 图谱探索功能
6. 路径查找
7. 知识簇识别

### Phase 5: Advanced Features (P2)

1. 关联质量评估
2. 关联过滤和筛选
3. 关联合并和去重
4. 关联时效性管理
5. ~~AI 主题识别（LDA）~~ ⏳ 未来版本，当前使用 AI 识别
6. AI 内容理解增强

## Dependencies

### Rust Dependencies

#### 图谱相关依赖

```toml
# apps/desktop/src-tauri/Cargo.toml additions

[dependencies]
# ========== 图谱算法库 ==========
# 图数据结构和算法（路径查找、最短路径、图遍历等）
petgraph = "0.6"  # 版本: 0.6.x
# 用途:
#   - 图数据结构（Graph, DiGraph）
#   - 路径查找算法（dijkstra, astar）
#   - 图遍历（DFS, BFS）
#   - 图分析（度中心性、连通分量等）
# 替代方案: 无（Rust 生态中最成熟的图库）

# ========== 并发数据结构 ==========
# 线程安全的 HashMap，用于关联缓存和并发访问
dashmap = "5.5"  # 版本: 5.5.x
# 用途:
#   - 关联相似度缓存（多线程安全）
#   - 节点度中心性缓存
#   - 图谱数据临时存储
# 替代方案:
#   - std::sync::Mutex<HashMap>（性能较低）
#   - parking_lot::Mutex<HashMap>（性能更好但需要额外依赖）

# ========== 序列化 ==========
# JSON 序列化（关联元数据、配置等）
serde_json = "1.0"  # 版本: 1.0.x（通常已通过其他依赖引入）
# 用途:
#   - 关联类型特定字段序列化
#   - 图谱配置序列化
#   - AI 元数据序列化
```

#### AI 相关依赖

**注意：** AI 处理已移至前端，使用云端 API，不再需要 Rust AI 依赖。

```toml
# ========== 不再需要以下依赖 ==========
# ❌ candle-core, candle-nn, candle-transformers (已移除)
# ❌ ort (已移除)
# ❌ jieba-rs (已移除)
# ❌ stop-words (已移除，如需可在前端使用 JavaScript 库)

# ========== 仅保留向量计算（用于语义相似度）==========
# 向量计算（余弦相似度等）- 仅用于关联发现，不用于 AI 处理
ndarray = "0.15"  # 版本: 0.15.x
# 用途:
#   - Embedding 向量计算（语义相似关联）
#   - 余弦相似度计算
#   - 向量归一化
# 注意:
# - Embedding 向量仍需要本地生成（用于搜索和图谱语义相似度）
# - AI 内容理解（摘要、标签、分类、关键词、主题）使用云端 API
# - 不实现本地 AI 推理模型（如 Phi-2 等）
# - 不要求 AI 生成速度，优先保证处理质量
```

# ========== 异步运行时 ==========

# Tokio（通常已通过 Tauri 引入）

tokio = { version = "1.35", features = ["full"] }

# 用途

# - 异步关联发现

# - 异步 AI 处理

# - 并发任务处理

```

#### 数据库相关依赖

```toml
# ========== SQLite 向量扩展 ==========
# sqlite-vec（通常已在 architecture.md 中定义）
sqlite-vec = "0.1"  # 版本: 0.1.x
# 用途:
#   - 向量存储和检索
#   - 语义相似度搜索
#   - 向量索引优化

# ========== SQLite 驱动 ==========
rusqlite = { version = "0.30", features = ["bundled"] }
# 用途:
#   - SQLite 数据库操作
#   - 关联数据 CRUD
#   - 事务管理
```

#### 工具库依赖

```toml
# ========== 错误处理 ==========
thiserror = "1.0"  # 版本: 1.0.x
# 用途:
#   - 自定义错误类型定义
#   - 错误链追踪
# 示例:
#   - GraphError, AssociationError, AiProcessingError

# ========== 日志 ==========
tracing = "0.1"  # 版本: 0.1.x（通常已通过 Tauri 引入）
tracing-subscriber = "0.3"
# 用途:
#   - 关联发现日志
#   - AI 处理日志
#   - 性能监控

# ========== 配置管理 ==========
serde = { version = "1.0", features = ["derive"] }
# 用途:
#   - 图谱配置序列化
#   - AI 模型配置
#   - 关联权重配置
```

### TypeScript Dependencies

#### AI 处理依赖

```json
{
  "dependencies": {
    // ========== Vercel AI SDK 核心库 ==========
    "ai": "^4.0.0",
    // 版本: 4.0.x
    // 用途: 统一的 AI 服务调用接口
    // 核心功能:
    //   - generateText() - 文本生成
    //   - streamText() - 流式文本生成
    //   - generateObject() - 结构化输出
    //   - 统一的错误处理和重试机制
    // 安装命令:
    //   bun add ai@^4.0.0

    // ========== OpenAI 适配器 ==========
    "@ai-sdk/openai": "^1.0.0",
    // 版本: 1.0.x
    // 用途: OpenAI API 集成
    // 支持模型:
    //   - gpt-4o-mini（推荐，性价比高，适合摘要和标签）
    //   - gpt-4o（高质量，适合复杂分类）
    //   - gpt-4-turbo
    //   - gpt-3.5-turbo（快速但质量较低）
    // API 文档: https://platform.openai.com/docs/api-reference
    // 安装命令:
    //   bun add @ai-sdk/openai@^1.0.0

    // ========== Anthropic 适配器 ==========
    "@ai-sdk/anthropic": "^1.0.0",
    // 版本: 1.0.x
    // 用途: Anthropic Claude API 集成
    // 支持模型:
    //   - claude-3-haiku-20240307（推荐，快速且便宜）
    //   - claude-3-sonnet-20240229（平衡质量和速度）
    //   - claude-3-opus-20240229（最高质量）
    // API 文档: https://docs.anthropic.com/claude/reference
    // 安装命令:
    //   bun add @ai-sdk/anthropic@^1.0.0

    // ========== 结构化输出验证 ==========
    "zod": "^3.23.0",
    // 版本: 3.23.x
    // 用途: AI SDK 的 generateObject 需要 zod 进行 schema 验证
    // 安装命令:
    //   bun add zod@^3.23.0
  }
}
```

**AI SDK 使用示例：**

```typescript
// 基础用法
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const { text } = await generateText({
  model: openai('gpt-4o-mini', {
    apiKey: 'your-api-key',
  }),
  prompt: 'Generate a summary...',
  maxTokens: 300,
  temperature: 0.3,
})

// 结构化输出（推荐用于分类和标签）
import { generateObject } from 'ai'
import { z } from 'zod'

const { object } = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: z.object({
    tags: z.array(z.object({
      name: z.string(),
      confidence: z.number(),
    })),
  }),
  prompt: 'Extract tags...',
})
```

#### 图谱可视化依赖

```json
{
  "dependencies": {
    // ========== AntV G6 图谱可视化库 ==========
    "@antv/g6": "^5.11.0",
    // 版本: 5.11.x（最新稳定版）
    // 用途:
    //   - 知识图谱可视化渲染
    //   - 力导向布局、圆形布局、层次化布局等
    //   - 节点和边的交互（拖拽、缩放、点击）
    //   - 图谱动画和过渡效果
    // 优势:
    //   - 专为图可视化设计，API 简洁
    //   - 性能优秀，支持大量节点（1000+）
    //   - 内置多种布局算法
    //   - 丰富的交互能力
    //   - 中文文档完善
    //   - 与 Ant Design 生态集成良好
    // 替代方案:
    //   - D3.js + d3-force（更底层，需要更多代码）
    //   - vis-network（功能类似但性能略差）
    //   - cytoscape.js（功能强大但体积较大）

    // ========== G6 类型定义 ==========
    "@types/antv__g6": "^5.0.0",
    // 版本: 5.0.x
    // 用途: TypeScript 类型支持

    // ========== Vercel AI SDK ==========
    "ai": "^4.0.0",
    // 版本: 4.0.x（最新稳定版）
    // 用途:
    //   - 统一的 AI 服务调用接口
    //   - 支持 OpenAI、Anthropic 等主流提供商
    //   - 流式响应支持
    //   - 错误处理和重试机制
    // 优势:
    //   - 统一的 API，支持多提供商
    //   - TypeScript 类型完善
    //   - 流式响应支持
    //   - 活跃维护，文档完善
    // 官方文档: https://sdk.vercel.ai/docs

    // ========== AI SDK 提供商适配器 ==========
    "@ai-sdk/openai": "^1.0.0",
    // 版本: 1.0.x
    // 用途: OpenAI API 集成（GPT-4o-mini, GPT-4 等）
    // 支持模型:
    //   - gpt-4o-mini（推荐，性价比高）
    //   - gpt-4o
    //   - gpt-4-turbo
    //   - gpt-3.5-turbo

    "@ai-sdk/anthropic": "^1.0.0",
    // 版本: 1.0.x
    // 用途: Anthropic Claude API 集成
    // 支持模型:
    //   - claude-3-haiku-20240307（推荐，快速且便宜）
    //   - claude-3-sonnet-20240229
    //   - claude-3-opus-20240229

    // ========== React 相关（通常已存在）==========
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    // ========== 数据获取 ==========
    "@tanstack/react-query": "^5.0.0",
    // 用途:
    //   - 图谱数据获取和缓存
    //   - AI 处理结果缓存
    //   - 自动重试和错误处理

    // ========== Tauri API ==========
    "@tauri-apps/api": "^2.0.0",
    // 用途: 调用 Rust 后端 Commands（图谱数据、AI 元数据存储）

    // ========== Tauri Secure Storage ==========
    "@tauri-apps/plugin-secure-store": "^2.0.0",
    // 版本: 2.0.x
    // 用途: 安全存储 API Key
    // 功能:
    //   - 使用系统密钥链（macOS: Keychain, Windows: Credential Manager）
    //   - API Key 加密存储
    //   - 不在日志中暴露敏感信息
    // 安装命令:
    //   bun add @tauri-apps/plugin-secure-store@^2.0.0
    // 注意: 需要在 tauri.conf.json 中启用插件
  },
  "devDependencies": {
    // ========== 类型检查 ==========
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.0"
  }
}
```

#### UI 组件依赖（已存在）

```json
{
  "dependencies": {
    // ========== shadcn/ui 组件 ==========
    "@memory-prosthetic/ui": "workspace:*",
    // 用途:
    //   - GraphControls 中的 Button, Slider 等组件
    //   - 图谱设置面板 UI
    //   - 节点详情弹窗

    // ========== TailwindCSS ==========
    "tailwindcss": "^4.0.0",
    // 用途: 图谱容器样式
  }
}
```

### 依赖版本管理策略

#### 版本锁定策略

```toml
# Cargo.toml - 使用精确版本或兼容版本范围
[dependencies]
# 核心依赖：精确版本（避免破坏性更新）
petgraph = "0.6.4"  # 精确版本
dashmap = "5.5.3"

# 可选依赖：兼容版本范围
candle-core = { version = "0.4", optional = true }
ort = { version = "~2.0", optional = true }  # ~2.0 表示 >=2.0.0, <3.0.0

# 工具依赖：兼容版本范围
thiserror = "1.0"  # 允许 1.0.x 的任何版本
```

```json
{
  "dependencies": {
    // TypeScript: 使用兼容版本范围（^）
    "@antv/g6": "^5.11.0",  // >=5.11.0, <6.0.0
    "@tanstack/react-query": "^5.0.0"
  }
}
```

#### 依赖更新策略

| 依赖类型 | 更新频率 | 更新策略 |
|---------|---------|---------|
| **核心依赖**（petgraph, dashmap） | 季度 | 测试后更新，关注破坏性变更 |
| **AI 依赖**（ai, @ai-sdk/*） | 月度 | 关注新功能和 API 更新 |
| **可视化依赖**（@antv/g6） | 月度 | 关注新功能和性能优化 |
| **工具依赖**（thiserror, serde） | 按需 | 仅在需要新功能时更新 |

### 依赖安装命令

#### Rust 依赖安装

```bash
# 进入 Tauri 项目目录
cd apps/desktop/src-tauri

# 添加核心依赖（图谱相关）
cargo add petgraph@0.6 dashmap@5.5 ndarray@0.15 thiserror@1.0

# 注意：不再需要 AI 相关依赖（candle, ort, jieba-rs 等）
```

#### TypeScript 依赖安装

```bash
# 在项目根目录或 apps/desktop 目录
cd apps/desktop

# 安装 AntV G6（图谱可视化）
bun add @antv/g6@^5.11.0
bun add -D @types/antv__g6@^5.0.0

# 安装 Vercel AI SDK（AI 处理）
bun add ai@^4.0.0

# 安装 AI SDK 提供商适配器
bun add @ai-sdk/openai@^1.0.0 @ai-sdk/anthropic@^1.0.0

# 安装结构化输出验证（推荐）
bun add zod@^3.23.0  # AI SDK 的 generateObject 需要 zod

# 安装 Tauri Secure Storage（API Key 安全存储）
bun add @tauri-apps/plugin-secure-store@^2.0.0
```

**Tauri 插件配置：**

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "plugins": {
    "secure-store": {
      "all": true
    }
  }
}
```

**Rust 依赖（Tauri 插件）：**

```toml
# apps/desktop/src-tauri/Cargo.toml
[dependencies]
tauri-plugin-secure-store = "2.0"
```

### 依赖大小估算

| 依赖 | 大小（Rust） | 大小（TypeScript） | 说明 |
|------|-------------|-------------------|------|
| petgraph | ~500 KB | - | 编译后二进制大小 |
| dashmap | ~200 KB | - | 编译后二进制大小 |
| @antv/g6 | - | ~800 KB (gzipped) | 生产构建后大小 |
| ai | - | ~50 KB (gzipped) | Vercel AI SDK 核心 |
| @ai-sdk/openai | - | ~20 KB (gzipped) | OpenAI 适配器 |
| @ai-sdk/anthropic | - | ~20 KB (gzipped) | Anthropic 适配器 |
| zod | - | ~15 KB (gzipped) | 结构化输出验证 |
| @tauri-apps/plugin-secure-store | - | ~30 KB (gzipped) | 安全存储插件 |
| **总计** | ~700 KB | ~935 KB | 不含模型文件（云端处理） |

### 依赖兼容性检查

#### Rust 版本要求

```toml
# rust-toolchain.toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
# 最低版本: 1.70.0（Tauri 2.x 要求）
```

#### Node.js 版本要求

```json
{
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  }
}
```

### 依赖替代方案

#### 如果 AntV G6 不可用

```typescript
// 备选方案 1: D3.js + d3-force
import * as d3 from 'd3'
import { forceSimulation, forceLink, forceManyBody } from 'd3-force'

// 备选方案 2: vis-network
import { Network } from 'vis-network'

// 备选方案 3: cytoscape.js
import cytoscape from 'cytoscape'
```

#### 如果 Candle 不可用

```toml
# 使用 ONNX Runtime
[dependencies]
ort = "2.0"  # 替代 candle-core
```

### 依赖问题排查

#### 常见问题

1. **AntV G6 在 Tauri 中无法渲染**
   - 检查 Canvas/WebGL 支持
   - 确认容器元素已正确挂载
   - 检查 CSS 样式（width/height）

2. **AI SDK 调用失败**
   - 检查 API Key 是否正确配置
   - 确认网络连接正常
   - 检查 API 配额和限制
   - 查看错误日志获取详细信息

3. **AI API 响应慢**
   - 考虑使用更快的模型（如 gpt-4o-mini 或 claude-3-haiku）
   - 减少输入文本长度
   - 实现请求缓存机制
   - 使用并行处理提升效率

4. **petgraph 性能问题**
   - 考虑使用更高效的图算法
   - 使用索引优化查询
   - 限制图谱规模（< 1000 节点）

5. **API Key 安全**
   - 使用系统密钥链存储 API Key（macOS: Keychain, Windows: Credential Manager）
   - 或使用 Tauri 的 secure storage API
   - 不在代码中硬编码 API Key
   - 不在日志中记录 API Key
   - 提供 API Key 清除和重新配置功能

6. **AI SDK 使用最佳实践**
   - 使用结构化输出（generateObject）提升结果质量
   - 实现请求限流避免 API 配额超限
   - 实现结果缓存减少重复请求
   - 提供降级方案（提取式方法）应对 API 失败

## Open Questions

1. **中文 Embedding 模型** - Alpha 阶段评估 bge-small-zh 效果
   - 决策: 使用 ONNX Runtime (ort) 支持 bge-small-zh
   - 评估指标: 中文内容搜索准确率、处理速度

2. **图谱布局算法** - ✅ 已确定支持多种布局模式
   - 决策: 使用 AntV G6，支持 force/circular/hierarchical/grid 布局
   - 实现: GraphControls 组件提供布局切换

3. **关联数量限制** - 需要配置优化
   - 默认值: 每个节点最大 50 条关联
   - 可配置: 通过 `maxAssociationsPerNode` 配置项调整
   - 性能考虑: 超过 100 条关联时考虑 LOD 优化

4. **AI 模型选择** - ✅ 已确定仅使用云端 API
   - 决策: 仅使用云端 API，不实现本地 AI 推理模型
   - 决策: 不要求生成速度，优先保证处理质量
   - 实现: 前端使用 Vercel AI SDK 直接调用云端服务
   - 注意: Embedding 模型（用于搜索和图谱）仍使用本地模型
   - 支持提供商: OpenAI、Anthropic、自定义 API
   - 用户控制: 用户自行管理 API Key 和选择提供商

5. **图谱可视化库** - ✅ 已确定使用 AntV G6
   - 决策: AntV G6 5.11.x
   - 理由: 专为图可视化设计，性能优秀，中文文档完善

6. **AI SDK 选择** - ✅ 已确定使用 Vercel AI SDK
   - 决策: `ai` 包 4.0.x
   - 理由: 统一 API、多提供商支持、TypeScript 类型完善、活跃维护

## References

- PRD: `docs/prd.md` (FR54-FR315)
- Architecture: `docs/architecture.md`
- Database Schema: `docs/architecture.md#data-architecture`
