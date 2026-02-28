---
title: '知识图谱关键词关联显示修复'
slug: 'fix-graph-keyword-edges'
created: '2026-02-04'
status: 'done'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Rust', 'Tauri 2.x', 'SQLite', 'tokio', 'tracing', 'React 19', 'TypeScript 5.9', 'AntV G6', 'TanStack Query']
files_to_modify: [
  'apps/desktop/src-tauri/src/graph/association.rs',
  'apps/desktop/src-tauri/src/graph/discovery.rs',
  'apps/desktop/src-tauri/src/graph/mod.rs',
  'apps/desktop/src-tauri/src/db/collections.rs',
  'apps/desktop/src-tauri/src/db/collection_tags.rs',
  'apps/desktop/src-tauri/src/lib.rs',
  'apps/desktop/src/components/pages/GraphPage.tsx',
  'apps/desktop/src-tauri/src/commands/debug.rs'
]
code_patterns: [
  'async/await with tokio runtime',
  'Result<Option<T>, E> error handling',
  'HashSet operations for keyword intersection',
  'tracing structured logging',
  'Arc<Database> for connection pooling',
  'Association calculation pattern: query → intersect → weight'
]
test_patterns: [
  'No existing tests - must create from scratch',
  'Unit tests: #[cfg(test)] modules in Rust files',
  'Integration tests: prepare test data, run discovery, verify results',
  'E2E tests: manual verification in browser',
  'Test framework: Need to add Rust test dependencies (tokio::test)',
  'Performance tests: Measure < 30s for 1000 collections'
]
---

# Tech-Spec: 知识图谱关键词关联显示修复

**Created:** 2026-02-04

## Overview

### Problem Statement

当前知识图谱中的关键词关联边没有显示。经过代码分析,发现以下问题:

1. **数据依赖过强**: `calculate_keyword_association` 函数要求**两个** collection 都必须有关键词数据,否则跳过关联创建
   ```rust
   // association.rs:227-229
   if keywords1.is_empty() || keywords2.is_empty() {
       return Ok(None);  // ❌ 过于严格
   }
   ```

2. **AI 处理不完整**: 部分内容未经过 AI 处理,缺少关键词数据

3. **权重阈值过滤**: 默认 `minWeight: 0.3` 可能过滤掉低权重关键词关联

### Solution

采用**渐进式 fallback 策略**修复关联发现逻辑:

**Phase 1: 宽松的关键词匹配**
- 当只有一侧有关键词时,与另一侧的**标题、标签、URL**进行关键词匹配
- 降低关键词关联的权重门槛,使用更宽松的计算公式

**Phase 2: 优化权重计算**
- 调整权重公式: `(shared_count / max(1, min(len1, len2)))` 而非固定除以 5
- 为 fallback 匹配设置较低的权重系数(0.5)

**Phase 3: 前端阈值调整**
- 将默认 `minWeight` 从 0.3 降低到 0.2
- 允许显示更多弱关联

### Scope

**In Scope:**
- ✅ 修复 `calculate_keyword_association` 逻辑(允许单侧无关键词)
- ✅ 实现基于标题/标签的 fallback 关键词匹配
- ✅ 优化关键词权重计算公式
- ✅ 更新前端默认 `minWeight` 为 0.2
- ✅ 添加详细日志用于调试
- ✅ 重新运行关联发现并验证

**Out of Scope:**
- ❌ 完整的 AI 批处理流程(单独的功能)
- ❌ 其他关联类型(语义、标签等)的修改
- ❌ 图谱可视化的其他优化
- ❌ 关键词提取流程的改进

## Context for Development

### Tech Stack

**Backend (Rust):**
- **Runtime**: Tauri 2.x with async/await (tokio)
- **Database**: SQLite with rusqlite
- **Logging**: tracing crate (structured logging)
- **Error Handling**: Result<T, E> pattern with custom error types
- **Collections**: HashSet for set operations (intersection, difference)

**Frontend (TypeScript/React):**
- **Framework**: React 19 with TypeScript 5.9
- **State Management**: TanStack Query for server state
- **Visualization**: AntV G6 v5 (knowledge graph rendering)
- **Build**: Vite 7.x

**Testing:**
- **Rust**: No existing tests for graph module (needs creation)
- **Frontend**: No test framework configured (future work)

### Codebase Patterns

**Association Calculation Pattern:**
```rust
pub async fn calculate_keyword_association(
    &self,
    collection1_id: i64,
    collection2_id: i64,
) -> Result<Option<f64>, CalculationError> {
    // 1. Query keywords from database via AiMetadataRepository
    let keywords1: HashSet<String> = ai_repo
        .get_keywords(collection1_id)?
        .into_iter()
        .map(|k| k.keyword.to_lowercase())
        .collect();

    // 2. Calculate intersection
    let shared: Vec<String> = keywords1.intersection(&keywords2).cloned().collect();

    // 3. Return None if no match OR return weight
    if shared.is_empty() {
        return Ok(None);
    }
    Ok(Some(weight))
}
```

**Current Issue (Line 227-229 in association.rs):**
```rust
if keywords1.is_empty() || keywords2.is_empty() {
    return Ok(None);  // ❌ Too strict - blocks associations
}
```

**Error Handling Pattern:**
- Use `Result<Option<T>, Error>` for optional values
- `Ok(None)` = no association (not an error)
- `Err(...)` = database/calculation error
- Log with `tracing::info!` for success, `tracing::warn!` for issues

**Weight Calculation (Current):**
```rust
// association.rs:238 - Fixed denominator
let weight = (shared_keywords.len() as f64 / 5.0).min(1.0);
```

**Logging Pattern:**
```rust
tracing::info!(
    "✅ 关键词关联: {} ({} 个关键词) <-> {} ({} 个关键词): {} 个共享 {:?}, 权重: {:.2}",
    collection1_id, keywords1.len(), collection2_id, keywords2.len(),
    shared.len(), shared, weight
);
```

### Files to Reference

| File | Purpose | Lines of Code | Key Functions |
| ---- | ------- | ------------- | ------------- |
| `apps/desktop/src-tauri/src/graph/association.rs` | 关联计算逻辑 | ~320 | `calculate_keyword_association` (204-252) |
| `apps/desktop/src-tauri/src/graph/discovery.rs` | 关联发现流程 | ~520 | `discover_all_pairs` (239-514) |
| `apps/desktop/src-tauri/src/graph/builder.rs` | 图谱数据构建 | ~560 | `build_graph` (92-305) |
| `apps/desktop/src-tauri/src/db/ai_metadata.rs` | AI 元数据查询 | ~200 | `get_keywords`, `get_topics` |
| `apps/desktop/src-tauri/src/db/collections.rs` | Collection 查询 | ~400 | `get_by_id`, list operations |
| `apps/desktop/src-tauri/src/db/collection_tags.rs` | 标签查询 | ~150 | `get_tags_by_collection` |
| `apps/desktop/src-tauri/src/lib.rs` | Tauri 命令注册 | ~2500 | `get_graph_data` (1942-1972) |
| `apps/desktop/src/components/pages/GraphPage.tsx` | 图谱页面 | ~150 | `GraphPage` component (filters state) |
| `apps/desktop/src/components/features/GraphView.tsx` | 图谱可视化 | ~870 | Graph rendering with AntV G6 |
| `packages/shared/src/types/graph.ts` | 图谱类型定义 | ~117 | `Association`, `GraphNode`, `GraphEdge` |
| `apps/desktop/src-tauri/src/graph/mod.rs` | 模块导出 | ~30 | Module exports |

### Implementation Constraints

**Rust Backend:**
1. **No existing tests** - Must create test framework from scratch
2. **Async runtime** - All association calculations are async (tokio)
3. **Database pooling** - Uses `Arc<Database>` for shared connections
4. **Error types** - Must use existing `CalculationError` enum

**Frontend:**
1. **No test framework** - E2E testing only (manual verification)
2. **TypeScript strict mode** - All types must be explicit
3. **Biome formatter** - Code must pass linting (120 char line width)

**Database:**
1. **SQLite schema** - Cannot modify schema for this fix
2. **Keywords table** - `id, collection_id, keyword, weight, extraction_method`
3. **Associations table** - Has metadata table for extra fields

**Performance:**
1. **O(n²) complexity** - `discover_all_pairs` compares all collections
2. **Target**: < 30s for 1000 collections
3. **Batch queries** - Must avoid N+1 query problems

### Current Issues Analysis

通过深度代码审查,识别了以下关键问题:

#### 🔴 Issue 1: 数据源单一 (Line 227-229)
```rust
// ❌ 当前实现
if keywords1.is_empty() || keywords2.is_empty() {
    return Ok(None);  // 只看 AI 关键词
}
```
**问题**: 忽略了标题、标签等有价值的关键词
**影响**: 关联覆盖率低,大量潜在关联被跳过
**修复**: 添加 fallback 到标题/标签 (Task 1.1)

#### 🟡 Issue 2: 权重公式不合理 (Line 238)
```rust
// ❌ 当前实现
let weight = (shared_keywords.len() as f64 / 5.0).min(1.0);
```
**问题**: 固定分母 5,需要 5 个共享关键词才达到权重 1.0
**示例**: 2 个关键词的内容共享 1 个,权重 = 1/5 = 0.2 (太低!)
**影响**: 即使有关联,权重也很低,被前端阈值过滤
**修复**: 改用相对公式 `shared / min(len1, len2)` (Task 1.2)

#### 🟠 Issue 3: 性能瓶颈 (discover_all_pairs)
```rust
// ❌ 当前实现 - 每对内容查询 2 次数据库
for i in 0..n {
    for j in (i+1)..n {
        calculator.calculate_keyword_association(i, j).await;
    }
}
```
**复杂度分析**:
- 1000 个内容 = ~500,000 对
- 每对 = 2 次 SQL 查询
- 总计 = **1,000,000 次数据库查询**
- **估计耗时**: 30-60 秒 (超过目标)

**优化**: 预加载所有关键词到 HashMap (Task 2 - 性能优化)

#### 🔵 Issue 4: 缺少容错机制
```rust
// ❌ 当前实现 - 单个失败影响全局
let keywords1 = ai_repo.get_keywords(id)?
    .map_err(CalculationError::Database)?;  // 中断整个流程
```
**问题**: 数据库查询失败会导致整个关联发现中断
**影响**: 稳定性差,单个错误影响全局
**修复**: 捕获错误,记录日志,返回 `Ok(None)`,继续处理其他关联 (Task 1.3)

### Technical Decisions

**ADR-001: 关键词关联修复方案选择**

**Status**: ✅ Approved
**Date**: 2026-02-04
**Decision Makers**: Winston (Pragmatic Architect), Victor (Innovator), Bob (Scrum Master), Amelia (Senior Developer)

**Context:**
知识图谱关键词关联边不显示,根因分析发现:
1. 部分内容缺失 AI 关键词数据
2. 关联计算逻辑要求两侧都有关键词(过于严格)
3. 权重计算公式不合理(固定除以 5)
4. 前端阈值过滤掉低权重关联

**Decision:**
采用 **Fallback 策略 (方案 A)** + **阈值调整 (方案 C)**，而非批量 AI 处理 (方案 B)

**Rationale:**

| Criteria | 方案 A: Fallback | 方案 B: 批量AI | 方案 C: 阈值 |
|----------|----------------|---------------|-------------|
| 实现时间 | 1-2 天 ⭐⭐⭐ | 3-5 天 ⭐ | 5 分钟 ⭐⭐⭐⭐⭐ |
| 风险等级 | 🟢 低 | 🔴 高 | 🟡 中 |
| 长期价值 | 🟡 中 | 🟢 优秀 | 🔴 低 |
| 技术债务 | 🟡 可控 | 🟢 无 | 🔴 高 |
| **推荐度** | **⭐⭐⭐⭐⭐** | **⭐⭐⭐** | **⭐⭐** |

**选择方案 A + C 的原因:**
1. **快速交付**: 1-2 天内可完成修复，立即解决用户痛点
2. **风险可控**: 不破坏现有系统，向后兼容
3. **质量保证**: Fallback 关键词虽然不如 AI，但比完全缺失好
4. **渐进式**: 为方案 B 留出空间，作为后续优化 (Phase 2)

**Trade-offs:**
- ✅ 优先级: 用户价值 > 技术完美
- ✅ 时间线: 快速修复 > 长期重构
- ✅ 风险: 低风险 > 高价值但高风险
- ⚠️ 牺牲: 完美的数据完整性 (可通过方案 B 后续补充)

**Consequences:**

**Positive:**
- ✅ 关键词关联覆盖率立即提升 50%+
- ✅ 用户满意度提升 (能看到关键词边)
- ✅ 为批量 AI 处理留出优化空间
- ✅ 技术债务可控且有清晰的偿还计划

**Negative:**
- ⚠️ Fallback 关键词质量不如 AI 提取 (权重折扣 0.5)
- ⚠️ 需要额外的监控和诊断 (Task 5, Task 6)
- ⚠️ 技术债务增加 (需要 Phase 2: 批量 AI 处理)

**Alternatives Considered:**
1. **方案 B (批量 AI 处理)**: 更优的长期方案，但实现周期长 (3-5 天)，风险高 (AI 服务稳定性)。**决定**: 作为 Phase 2 独立功能实现
2. **仅方案 C (降低阈值)**: 快速但治标不治本，会累积技术债务。**决定**: 仅作为方案 A 的补充，而非替代

**Implementation Strategy:**

**Phase 1 (立即执行 - 本次修复):**
- ✅ Task 1: 实现 Fallback 关键词提取
- ✅ Task 3: 降低默认阈值到 0.2
- ✅ Task 5: 添加诊断监控
- ✅ Task 6: 创建诊断工具

**Phase 2 (后续优化 - 独立功能):**
- 🔄 实现批量 AI 处理流程
- 🔄 建立自动化流程确保新内容都经过 AI 处理
- 🔄 A/B 测试验证用户体验改善

**Success Metrics:**

**Quantitative:**
- 关键词关联数量增加 > 50%
- 图谱中可见关键词边 > 10 条
- 关键词关联平均权重: 0.3-0.6 (合理范围)
- 性能: 关联发现耗时 < 30s (1000 collections)

**Qualitative:**
- 用户反馈能看到关键词关联 ✅
- Fallback 关键词质量可接受 ✅
- 无性能回归 ✅

---

**1. Fallback 策略选择**
- **决定**: 使用标题/标签作为 fallback，而非强制要求所有内容都有关键词
- **理由**: 渐进式增强，向后兼容，不需要大规模 AI 重新处理
- **权衡**: Fallback 关键词质量略低，通过权重折扣 (0.5) 和来源标记来管理

**2. 权重公式优化**
- **决定**: 使用 `shared / min(len1, len2)` 替代 `shared / 5`
- **理由**: 相对权重更合理，避免小关键词集合被过度惩罚
- **权衡**: 对于只有 1-2 个关键词的情况，仍会给予合理的权重

**3. 前端阈值调整**
- **决定**: 将默认 minWeight 从 0.3 降到 0.2
- **理由**: 允许显示更多弱关联，用户可以通过 UI 过滤器调整
- **权衡**: 可能显示一些噪音关联，需要通过用户教育和 UI 改进来缓解

## Implementation Plan

### Tasks

#### Task 1: 优化关键词关联计算逻辑
**File:** `apps/desktop/src-tauri/src/graph/association.rs`

**1.0 添加常量定义 (在文件顶部):**

```rust
// 在 association.rs 文件顶部,use 语句之后
const FALLBACK_DISCOUNT: f64 = 0.5;       // Fallback 关键词权重折扣
const MIN_KEYWORD_LEN: usize = 2;          // 最小关键词长度
const MAX_KEYWORD_LEN: usize = 100;        // 最大关键词长度
const TARGET_KEYWORD_OVERLAP: usize = 1;   // 目标关键词重叠数量
```

**1.1 完整实现 `extract_keywords_from_text` 函数:**

```rust
// ✅ 完整的关键词提取实现 (支持中英文)
fn extract_keywords_from_text(text: &str) -> HashSet<String> {
    // 简单分词 (支持中英文空格)
    let words = text.split(|c: char| c.is_whitespace())
        .filter(|s| !s.is_empty())
        .map(|s| s.trim())
        .collect::<Vec<_>>();

    let mut keywords = HashSet::new();

    for word in words {
        // 过滤单字
        if word.chars().count() < MIN_KEYWORD_LEN {
            continue;
        }

        // 过滤停用词
        if is_stop_word(word) {
            continue;
        }

        // 过滤纯数字
        if word.chars().all(|c| c.is_numeric()) {
            continue;
        }

        // 过滤特殊字符 (保留中文、英文、连字符、下划线)
        let cleaned: String = word
            .chars()
            .filter(|c| c.is_alphabetic() || c == '-' || c == '_')
            .collect();

        if !cleaned.is_empty() {
            keywords.insert(cleaned.to_lowercase());
        }
    }

    keywords
}

// ✅ 完整的停用词过滤实现
fn is_stop_word(word: &str) -> bool {
    // 英文停用词 (常用功能词)
    const EN_STOP_WORDS: &[&str] = &[
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "be", "this",
        "that", "it", "not", "have", "has", "can", "will", "just", "do",
    ];

    // 中文停用词 (常用功能词、虚词)
    const CN_STOP_WORDS: &[&str] = &[
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "这",
        "能", "去", "说", "要", "会", "他", "她", "它", "很", "也", "都", "而",
        "及", "等", "或", "个", "中", "为", "之", "以", "于", "对", "把",
    ];

    let word_lower = word.to_lowercase();
    EN_STOP_WORDS.contains(&word_lower) || CN_STOP_WORDS.contains(&word_lower)
}
```

**Changes:**

**1.1 修复数据源问题 - 添加 fallback 逻辑:**

```rust
// ❌ 移除严格检查 (Line 227-229)
// if keywords1.is_empty() || keywords2.is_empty() {
//     return Ok(None);
// }

// ✅ 添加 fallback 辅助函数
fn extract_keywords_from_text(text: &str) -> HashSet<String> {
    // 简单分词 + 停用词过滤
    text.split_whitespace()
        .map(|s| s.to_lowercase())
        .filter(|s| s.len() > 2)  // 过滤单字
        .filter(|s| !is_stop_word(s)) // 过滤停用词
        .collect()
}

fn is_stop_word(word: &str) -> bool {
    // 常见中文/英文停用词
    let stop_words = [
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "by", "from", "as", "is", "was", "are"
    ];
    stop_words.contains(&word)
}

async fn get_keywords_with_fallback(
    db: &Arc<Database>,
    collection_id: i64,
) -> Result<(HashSet<String>, bool), CalculationError> {
    use crate::db::{AiMetadataRepository, CollectionRepository, CollectionTagRepository};

    // 1. 尝试 AI 关键词
    let ai_repo = AiMetadataRepository::new(db.clone());
    let ai_keywords: HashSet<String> = ai_repo
        .get_keywords(collection_id)
        .map_err(CalculationError::Database)?
        .into_iter()
        .map(|k| k.keyword.to_lowercase())
        .collect();

    if !ai_keywords.is_empty() {
        return Ok((ai_keywords, false)); // false = AI source
    }

    // 2. Fallback: 从标题和标签提取
    let collection_repo = CollectionRepository::new(db.clone());
    let collection = match collection_repo.get_by_id(collection_id) {
        Ok(Some(c)) => c,
        Ok(None) => return Ok((HashSet::new(), true)),
        Err(e) => return Err(CalculationError::Database(e)),
    };

    let mut keywords = HashSet::new();

    // 从标题提取
    if let Some(title) = &collection.title {
        keywords.extend(extract_keywords_from_text(title));
    }

    // 从标签提取
    let tag_repo = CollectionTagRepository::new(db);
    let tags = tag_repo.get_tags_by_collection(collection_id)
        .unwrap_or_default();
    for tag in tags {
        keywords.extend(extract_keywords_from_text(&tag.name));
    }

    tracing::debug!(
        "Collection {} 使用 fallback 关键词: {:?}",
        collection_id, keywords
    );

    Ok((keywords, true)) // true = fallback source
}
```

**1.2 优化权重计算公式:**

```rust
// ✅ 修改 calculate_keyword_association 主体
pub async fn calculate_keyword_association(
    &self,
    collection1_id: i64,
    collection2_id: i64,
) -> Result<Option<f64>, CalculationError> {
    // 1. 获取关键词 (支持 fallback)
    let (keywords1, is_fallback1) = get_keywords_with_fallback(&self.db, collection1_id).await?;
    let (keywords2, is_fallback2) = get_keywords_with_fallback(&self.db, collection2_id).await?;

    // 2. 两侧都为空才返回 None
    if keywords1.is_empty() && keywords2.is_empty() {
        return Ok(None);
    }

    // 3. 计算交集
    let shared_count = keywords1.intersection(&keywords2).count();

    if shared_count == 0 {
        return Ok(None);
    }

    // 4. 相对权重公式 (修复 Issue 2)
    let min_len = keywords1.len().min(keywords2.len()).max(1);
    let weight = (shared_count as f64 / min_len as f64).min(1.0);

    // 5. 如果使用了 fallback,降低权重
    let is_fallback = is_fallback1 || is_fallback2;
    let final_weight = if is_fallback {
        weight * 0.5  // Fallback 关键词权重折扣
    } else {
        weight
    };

    // 6. 增强日志 (标记关键词来源)
    let source1 = if is_fallback1 { "fallback" } else { "AI" };
    let source2 = if is_fallback2 { "fallback" } else { "AI" };

    tracing::info!(
        "🔑 关键词关联: {} ({}, {} 个关键词) <-> {} ({}, {} 个关键词): {} 个共享, weight={:.2}, final={:.2}",
        collection1_id, source1, keywords1.len(),
        collection2_id, source2, keywords2.len(),
        shared_count, weight, final_weight
    );

    Ok(Some(final_weight))
}
```

**1.3 添加容错机制:**

```rust
// ✅ 修改 get_keywords_with_fallback 的错误处理
async fn get_keywords_with_fallback(
    db: &Arc<Database>,
    collection_id: i64,
) -> Result<(HashSet<String>, bool), CalculationError> {
    use crate::db::{AiMetadataRepository, CollectionRepository, CollectionTagRepository};

    // 1. 尝试 AI 关键词 (容错: 失败不中断)
    let ai_repo = AiMetadataRepository::new(db.clone());
    let ai_keywords: HashSet<String> = match ai_repo.get_keywords(collection_id) {
        Ok(keywords) => keywords
            .into_iter()
            .map(|k| k.keyword.to_lowercase())
            .collect(),
        Err(e) => {
            tracing::warn!("获取 collection {} 的 AI 关键词失败: {}, 使用 fallback", collection_id, e);
            HashSet::new()  // 失败时返回空集合,继续处理
        }
    };

    if !ai_keywords.is_empty() {
        return Ok((ai_keywords, false));
    }

    // 2. Fallback 逻辑同样容错
    let collection_repo = CollectionRepository::new(db.clone());
    let collection = match collection_repo.get_by_id(collection_id) {
        Ok(Some(c)) => c,
        Ok(None) => {
            tracing::debug!("Collection {} 不存在", collection_id);
            return Ok((HashSet::new(), true));
        }
        Err(e) => {
            tracing::warn!("获取 collection {} 失败: {}, 跳过", collection_id, e);
            return Ok((HashSet::new(), true));
        }
    };

    // ... (其余逻辑不变)
}
```

**Acceptance Criteria:**
- [ ] ✅ 函数可以处理单侧无关键词的情况
- [ ] ✅ Fallback 关键词提取正常工作 (标题 + 标签)
- [ ] ✅ 权重计算使用新的相对公式
- [ ] ✅ Fallback 匹配有 0.5 权重折扣
- [ ] ✅ 日志输出包含关键词来源信息 (AI / fallback)
- [ ] ✅ 单个查询失败不中断整个流程
- [ ] ✅ 代码通过 Biome 格式检查
- [ ] 🆕 添加测试代码框架 (P0 优先级)

**1.4 添加测试代码框架 (P0 优先级):**

```rust
// ✅ 在 association.rs 文件末尾添加
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::*;

    #[tokio::test]
    async fn test_both_have_ai_keywords() {
        // Given: 两个内容都有 AI 关键词
        let db = setup_test_db().await;
        let calculator = AssociationCalculator::new(db.clone());

        insert_collection_with_keywords(&db, 1, vec!["AI", "机器学习"]).await;
        insert_collection_with_keywords(&db, 2, vec!["AI", "深度学习"]).await;

        // When: 计算关联
        let result = calculator.calculate_keyword_association(1, 2).await;

        // Then: 应该返回成功,权重为 0.5 (1/2)
        assert!(result.is_ok());
        let weight = result.unwrap().unwrap();
        assert_eq!(weight, 0.5); // 1/min(2,2) = 0.5
    }

    #[tokio::test]
    async fn test_one_side_fallback() {
        // Given: Collection 1 有 AI 关键词, Collection 2 无 (但有标签)
        let db = setup_test_db().await;
        let calculator = AssociationCalculator::new(db.clone());

        insert_collection_with_keywords(&db, 1, vec!["AI"]).await;
        insert_collection_with_tags(&db, 2, vec!["人工智能"]).await;

        // When: 计算关联
        let result = calculator.calculate_keyword_association(1, 2).await;

        // Then: 应该返回成功,使用了 fallback,权重有折扣
        assert!(result.is_ok());
        let weight = result.unwrap().unwrap();
        assert!(weight > 0.0); // 应该有关联
        assert!(weight < 0.5); // 但应该有折扣 (0.5 * base_weight)
    }

    #[tokio::test]
    async fn test_both_empty() {
        // Given: 两个内容都没有关键词和标签
        let db = setup_test_db().await;
        let calculator = AssociationCalculator::new(db.clone());

        insert_collection_with_title(&db, 1, "Empty Content").await;
        insert_collection_with_title(&db, 2, "Another Empty").await;

        // When: 计算关联
        let result = calculator.calculate_keyword_association(1, 2).await;

        // Then: 应该返回 None (无关联)
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_weight_formula_relative() {
        // 验证新的相对权重公式
        let db = setup_test_db().await;
        let calculator = AssociationCalculator::new(db.clone());

        // 2 个关键词,共享 1 个 → 权重 0.5
        insert_collection_with_keywords(&db, 1, vec!["A", "B"]).await;
        insert_collection_with_keywords(&db, 2, vec!["A", "C"]).await;

        let result = calculator.calculate_keyword_association(1, 2).await;
        let weight = result.unwrap().unwrap();
        assert_eq!(weight, 0.5);

        // 3 个关键词,共享 1 个 → 权重 0.33
        insert_collection_with_keywords(&db, 3, vec!["A", "B", "C"]).await;
        let result2 = calculator.calculate_keyword_association(1, 3).await;
        let weight2 = result2.unwrap().unwrap();
        assert_eq!(weight2, 1.0 / 3.0);
    }

    #[tokio::test]
    async fn test_fallback_weight_discount() {
        // Given: Fallback 匹配
        let db = setup_test_db().await;
        let calculator = AssociationCalculator::new(db.clone());

        insert_collection_with_keywords(&db, 1, vec!["AI"]).await;
        insert_collection_with_tags(&db, 2, vec!["人工智能"]).await;

        // When: 计算关联
        let result = calculator.calculate_keyword_association(1, 2).await;
        let weight = result.unwrap().unwrap();

        // Then: 权重应该有折扣 (0.5 * base_weight)
        assert!(weight < 0.5); // base_weight 是 1.0 (共享 1/1),折扣后应该是 0.5
    }
}

// 测试辅助工具 (需要在 db/test_utils.rs 中实现)
#[cfg(test)]
mod test_utils {
    use super::*;

    pub async fn setup_test_db() -> Arc<Database> {
        // 创建内存数据库用于测试
        // TODO: 实现测试数据库初始化
        todo!("Implement test database setup")
    }

    pub async fn insert_collection_with_keywords(db: &Arc<Database>, id: i64, keywords: Vec<&str>) {
        // TODO: 插入测试数据和关键词
        todo!("Implement test data insertion")
    }

    pub async fn insert_collection_with_tags(db: &Arc<Database>, id: i64, tags: Vec<&str>) {
        // TODO: 插入测试数据和标签
        todo!("Implement test data insertion")
    }

    pub async fn insert_collection_with_title(db: &Arc<Database>, id: i64, title: &str) {
        // TODO: 插入测试数据
        todo!("Implement test data insertion")
    }
}
```

**注意**:
- 测试框架代码需要先实现 `db/test_utils.rs` 中的辅助函数
- 当前优先级是 P0,但可以与实现并行进行
- 如果时间紧迫,可以先实现核心功能,测试在后续补充

#### Task 2: 更新关联发现流程 + 性能优化
**File:** `apps/desktop/src-tauri/src/graph/discovery.rs`

**Purpose:** 确认所有调用点使用更新后的函数 + 添加性能优化

**Changes:**

**2.1 确认调用点:**
- ✅ `discover_for_new_content` (Line 176) - 已调用 `calculate_keyword_association`
- ✅ `discover_all_pairs` (Line 432) - 已调用 `calculate_keyword_association`
- **Action**: 无需修改,确认即可

**2.2 添加性能优化 - 预加载关键词:**

```rust
// ✅ 在 discover_all_pairs 开始时预加载
pub async fn discover_all_pairs(&self) -> Result<Vec<CreateAssociation>, DiscoveryError> {
    let collection_repo = CollectionRepository::new(&self.db.clone());
    let ai_repo = AiMetadataRepository::new(self.db.clone());

    // 获取所有 collections
    let all_list = collection_repo.list(1000, 0, None, false, None, None)?;

    // ✅ 性能优化: 预加载所有关键词到 HashMap
    let mut all_keywords: HashMap<i64, HashSet<String>> = HashMap::new();
    for item in &all_list {
        match ai_repo.get_keywords(item.id) {
            Ok(keywords) => {
                let keywords: HashSet<String> = keywords
                    .into_iter()
                    .map(|k| k.keyword.to_lowercase())
                    .collect();
                all_keywords.insert(item.id, keywords);
            }
            Err(e) => {
                tracing::warn!("预加载 collection {} 关键词失败: {}", item.id, e);
                all_keywords.insert(item.id, HashSet::new());
            }
        }
    }

    tracing::info!("📦 预加载 {} 个 collections 的关键词", all_keywords.len());

    // ✅ 创建使用预加载的 calculator
    let calculator_with_cache = AssociationCalculator::with_keywords(
        self.db.clone(),
        all_keywords  // 传入预加载的关键词
    );

    // ... 其余逻辑使用 calculator_with_cache
}
```

**2.3 在 AssociationCalculator 中添加预加载支持:**

```rust
// 在 association.rs 中
impl AssociationCalculator {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db,
            semantic_threshold: 0.7,
            keywords_cache: None,  // 添加缓存字段
        }
    }

    pub fn with_keywords(db: Arc<Database>, keywords: HashMap<i64, HashSet<String>>) -> Self {
        Self {
            db,
            semantic_threshold: 0.7,
            keywords_cache: Some(keywords),
        }
    }

    // 修改 calculate_keyword_association 使用缓存
    pub async fn calculate_keyword_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<f64>, CalculationError> {
        // 如果有缓存,使用缓存;否则查询数据库
        let keywords1 = if let Some(cache) = &self.keywords_cache {
            cache.get(&collection1_id).cloned().unwrap_or_default()
        } else {
            // 原有的数据库查询逻辑
            // ...
        };
        // ... (其余逻辑)
    }
}
```

**2.4 添加详细统计日志:**
```rust
// ✅ 在 discover_all_pairs 结束时添加
let mut keyword_count = 0;
let mut fallback_count = 0;
let mut skipped_count = 0;

for assoc in &associations {
    if assoc.r#type == "keyword" {
        keyword_count += 1;
        if let Some(ref metadata) = /* 判断是否 fallback */ {
            if metadata.is_fallback {
                fallback_count += 1;
            }
        }
    }
}

tracing::info!(
    "📊 关键词关联统计:
    - 总尝试对数: {}
    - 创建关键词关联: {}
    - 其中使用 fallback: {} ({:.1}%)
    - 跳过(无匹配): {}
    - 平均权重: {:.2}",
    total_attempts,
    keyword_count,
    fallback_count,
    (fallback_count as f64 / keyword_count.max(1) as f64) * 100.0,
    skipped_count,
    avg_weight
);
```

**Acceptance Criteria:**
- [ ] ✅ 关键词关联数量明显增加
- [ ] ✅ 日志显示详细的成功率统计
- [ ] ✅ 预加载优化生效,日志显示"预加载 X 个 collections 的关键词"
- [ ] ✅ 统计日志显示 fallback 使用百分比
- [ ] ✅ 性能提升: 1000 collections < 20s (优化前 30-60s)

#### Task 3: 调整前端默认权重阈值
**File:** `apps/desktop/src/components/pages/GraphPage.tsx`

**Changes:**
```typescript
// 旧: minWeight: 0.3
// 新: minWeight: 0.2
const [filters, onFiltersChange] = useState<GraphFilters>({
  minWeight: 0.2,
  maxNodes: 100,
})
```

**Acceptance Criteria:**
- [ ] 默认显示更多关键词关联边
- [ ] 用户仍可通过 UI 滑块调整阈值

#### Task 4: 自动化关联发现流程
**File:** `apps/desktop/src-tauri/src/graph/discovery.rs`

**Purpose:** 自动清理旧的关键词关联并重新发现,简化用户操作

**原方案 (手动)**:
- 用户需要手动打开控制台运行命令
- 可能被遗忘或执行错误
- 需要手动删除旧数据

**优化方案 (自动)**:

**4.1 添加自动清理逻辑:**

```rust
// ✅ 在 discover_all_pairs 开始时,自动清理旧的关键词关联
pub async fn discover_all_pairs(&self) -> Result<Vec<CreateAssociation>, DiscoveryError> {
    let db = self.db.clone();

    // ✅ 自动清理旧的关键词关联
    tracing::info!("🧹 清理旧的关键词关联...");
    let deleted_count = db.with_connection_mut(|conn| {
        conn.execute(
            "DELETE FROM associations WHERE type = 'keyword'",
            [],
        )
    })?;
    tracing::info!("✅ 已删除 {} 个旧的关键词关联", deleted_count);

    // 清理关联元数据
    let deleted_meta = db.with_connection_mut(|conn| {
        conn.execute(
            "DELETE FROM association_metadata
             WHERE association_id IN (
                 SELECT id FROM associations WHERE type = 'keyword'
             )",
            [],
        )
    })?;
    tracing::info!("✅ 已删除 {} 个旧的关键词元数据", deleted_meta);

    // ... (继续执行发现逻辑)
}
```

**4.2 更新 Tauri 命令:**

在 `apps/desktop/src-tauri/src/lib.rs` 中的 `discover_all_associations` 命令应该已经调用了 `discover_all_pairs`,所以会自动执行清理。

**Acceptance Criteria:**
- [ ] ✅ 关联发现自动删除旧的关键词数据
- [ ] ✅ 用户只需运行一次命令,无需手动清理
- [ ] ✅ 日志显示清理的关联数量
- [ ] ✅ 数据库中新增关键词关联记录
- [ ] ✅ 图谱可视化中显示关键词边
- [ ] ✅ 无错误日志

**用户操作:**
1. 打开应用开发者控制台
2. 运行: `await invoke('discover_all_associations')`
3. 查看日志确认:
   ```
   🧹 清理旧的关键词关联...
   ✅ 已删除 123 个旧的关键词关联
   📦 预加载 1000 个 collections 的关键词
   📊 关键词关联发现统计: 创建 456 个关联
   ```

**注意**: 这个优化不影响 Task 5 和 Task 6,它们仍然独立运行

#### Task 5: 添加诊断和监控日志
**File:** `apps/desktop/src-tauri/src/graph/discovery.rs`

**Purpose**: 提供详细的统计信息帮助诊断问题

**Changes:**
1. 添加详细统计日志:
   ```rust
   tracing::info!(
       "📊 关键词关联发现统计:
       - 总内容数: {}
       - 有AI关键词: {}
       - 使用fallback: {}
       - 跳过(无匹配): {}
       - 创建关联数: {}
       - 平均权重: {:.2}",
       total, with_ai, fallback, skipped, created, avg_weight
   );
   ```

2. 添加性能计时:
   ```rust
   let start = std::time::Instant::now();
   // ... 发现逻辑 ...
   let duration = start.elapsed();
   tracing::info!("⏱️ 关键词发现耗时: {:?}", duration);
   if duration.as_secs() > 30 {
       tracing::warn!("⚠️ 关联发现耗时超过30秒,考虑优化");
   }
   ```

3. 添加失败原因追踪:
   ```rust
   let mut skipped_reasons = HashMap::new();
   // 在循环中记录跳过原因
   if keywords1.is_empty() && keywords2.is_empty() {
       *skipped_reasons.entry("both_empty").or_insert(0) += 1;
   }
   // 最后输出统计
   tracing::info!("跳过原因分布: {:?}", skipped_reasons);
   ```

**Acceptance Criteria:**
- [ ] 日志输出包含详细的统计数据
- [ ] 性能计时正常工作
- [ ] 跳过原因被正确追踪和记录

#### Task 6: 创建诊断工具命令
**File:** `apps/desktop/src-tauri/src/commands/debug.rs` (新建)

**Purpose**: 提供运行时诊断命令帮助排查问题

**Implementation:**
```rust
use serde::{Deserialize, Serialize};
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeywordDiagnosticReport {
    total_collections: i64,
    collections_with_keywords: i64,
    collections_without_keywords: i64,
    keyword_associations_count: i64,
    avg_keyword_weight: f64,
    filtered_by_threshold: i64, // 被前端阈值过滤的边数
    recommendations: Vec<String>,
}

#[tauri::command]
fn diagnose_keyword_associations(
    state: State<'_, Arc<AppState>>,
) -> Result<KeywordDiagnosticReport, CommandError> {
    let db = state.db.clone();

    // 1. 检查内容关键词覆盖率
    let coverage_stats = db.with_connection(|conn| {
        conn.query_row(
            "SELECT
                (SELECT COUNT(*) FROM collections) as total,
                (SELECT COUNT(DISTINCT collection_id) FROM keywords) as with_keywords",
            [],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
            ))
        )
    })?;

    // 2. 检查关键词关联统计
    let assoc_stats = db.with_connection(|conn| {
        conn.query_row(
            "SELECT
                COUNT(*) as count,
                AVG(weight) as avg_weight
            FROM associations
            WHERE type = 'keyword'",
            [],
            |row| Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, f64>(1)?,
            ))
        })
    })?;

    // 3. 生成建议
    let mut recommendations = Vec::new();
    let coverage_pct = (coverage_stats.with_keywords as f64 / coverage_stats.total as f64) * 100.0;

    if coverage_pct < 50.0 {
        recommendations.push(
            "⚠️ 不到50%的内容有关键词,建议运行批量AI处理".to_string()
        );
    }

    if assoc_stats.avg_weight < 0.3 {
        recommendations.push(
            "💡 关键词平均权重较低,考虑调整前端minWeight阈值".to_string()
        );
    }

    Ok(KeywordDiagnosticReport {
        total_collections: coverage_stats.0,
        collections_with_keywords: coverage_stats.1,
        collections_without_keywords: coverage_stats.0 - coverage_stats.1,
        keyword_associations_count: assoc_stats.0,
        avg_keyword_weight: assoc_stats.1,
        filtered_by_threshold: 0, // 需要前端报告
        recommendations,
    })
}
```

**Registration:** 在 `lib.rs` 中注册命令:
```rust
fn main() {
    tauri::Builder::default()
        // ...
        .invoke_handler(tauri::generate_handler![
            // ...
            diagnose_keyword_associations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Frontend Usage:**
```typescript
// 在开发者控制台中运行
const report = await invoke('diagnose_keyword_associations');
console.log('诊断报告:', report);
```

**Acceptance Criteria:**
- [ ] 命令成功注册并可调用
- [ ] 返回准确的统计数据
- [ ] 建议信息合理且有帮助
- [ ] 错误处理完善

### Acceptance Criteria

**Overall:**
- [x] 代码审查通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] E2E 测试通过(手动验证)
- [ ] 性能测试: 关联发现耗时 < 30s (1000 collections)
- [ ] 无回归: 其他关联类型仍正常工作

**Specific - Functional:**
- [ ] **AC 1**: Given 数据库中有 100 个内容(其中 50 个有 AI 关键词,50 个无), When 运行关联发现, Then 关键词关联数量增加 > 50%
- [ ] **AC 2**: Given 用户打开知识图谱页面, When 页面加载完成, Then 能看到青色的关键词关联边
- [ ] **AC 3**: Given 用户悬停在关键词关联边上, When tooltip 显示, Then 显示正确的重叠百分比(如 "关键词重叠 50%")
- [ ] **AC 4**: Given 查看应用日志, When 关联发现完成, Then 日志清晰展示关键词来源标记("AI" 或 "fallback")

**Specific - Performance:**
- [ ] **AC 5**: Given 1000 个内容需要关联发现, When 运行 discover_all_pairs, Then 耗时 < 20s (优化前 30-60s)
- [ ] **AC 6**: Given 关联发现运行中, When 查看日志, Then 显示 "预加载 1000 个 collections 的关键词" (预加载优化生效)

**Specific - Error Handling:**
- [ ] **AC 7**: Given 单个内容查询数据库失败, When 计算关联, Then 其他内容的关联计算继续进行(容错机制)
- [ ] **AC 8**: Given 两个内容都没有关键词, When 计算关联, Then 返回 Ok(None) 且不中断流程

**Specific - Weight Calculation:**
- [ ] **AC 9**: Given 两个内容各有 2 个关键词,共享 1 个, When 计算权重, Then 返回 0.5 (相对公式: 1/min(2,2) = 0.5)
- [ ] **AC 10**: Given 使用 fallback 关键词匹配, When 计算关联, Then 权重折扣为 50% (final_weight = weight * 0.5)

**Specific - Frontend:**
- [ ] **AC 11**: Given 用户首次打开图谱页面, When 页面加载, Then 默认 minWeight 为 0.2 (不是 0.3)
- [ ] **AC 12**: Given 用户调整权重阈值滑块, When 值改变, Then 图谱动态更新显示的边

## Additional Context

### Dependencies

**Internal:**
- `crate::db::AiMetadataRepository` - 查询关键词
- `crate::db::CollectionRepository` - 查询标题/标签
- `crate::db::CollectionTagRepository` - 查询标签
- `tracing` - 日志记录

**External:**
- `std::collections::HashSet` - 关键词集合操作
- `regex` (可选) - 更好的关键词提取

### Testing Strategy

**Unit Tests:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_keyword_association_both_have_keywords() {
        // 测试两侧都有关键词的情况
    }

    #[tokio::test]
    async fn test_keyword_association_one_side_fallback() {
        // 测试单侧 fallback 的情况
    }

    #[tokio::test]
    async fn test_keyword_association_both_fallback() {
        // 测试两侧都使用 fallback 的情况
    }

    #[tokio::test]
    async fn test_weight_calculation_relative() {
        // 测试新的权重计算公式
    }
}
```

**Integration Tests:**
1. 准备测试数据:
   - Collection A: 有 AI 关键词
   - Collection B: 无 AI 关键词,但有标签
   - Collection C: 完全空白

2. 运行 `discover_all_pairs`

3. 验证结果:
   - A-B: 有关键词关联(fallback 匹配)
   - A-C: 无关联(无匹配数据)
   - B-C: 无关联(无匹配数据)

**E2E 测试(手动):**
1. 启动应用
2. 导航到知识图谱页面
3. 确认看到青色关键词边
4. 悬停在边上,确认 tooltip 显示正确信息
5. 调整权重阈值滑块,确认边动态显示/隐藏

### Notes

**Performance Considerations:**
- ✅ **Fallback 关键词提取**: 轻量级操作(仅标题/标签),不影响性能
- ✅ **预加载优化**: 关键词预加载到 HashMap,避免 O(n²) × 2 次数据库查询
  - **优化前**: 1000 collections = ~1,000,000 次 SQL 查询 = 30-60s
  - **优化后**: 1000 collections = ~1,000 次 SQL 查询 = < 20s
- ⚠️ **内存占用**: 预加载会增加内存使用(1000 collections × 平均 10 个关键词 × 20 bytes ≈ 200KB),可忽略
- ⚠️ **超时风险**: 仍需考虑添加进度条和超时处理(未来改进)

**Code Quality Considerations:**
- ✅ **容错机制**: 单个失败不影响全局,每个查询都有错误处理
- ✅ **代码可读性**: 详细的日志输出,便于调试和监控
- ✅ **可维护性**: Fallback 逻辑封装在独立函数中,易于测试和修改
- ⚠️ **停用词列表**: 当前硬编码在代码中,未来考虑外部配置

**Future Improvements:**
- 🔄 添加中文分词支持(当前基于空格分词,对中文效果有限)
- 🔄 考虑使用 TF-IDF 或更高级的关键词提取
- 🔄 为关联发现添加进度条 UI 和取消功能
- 🔄 添加增量发现(只处理新内容,而非全量重算)
- 🔄 实现批量 AI 处理流程(Phase 2)
- 🔄 停用词外部配置化

**Backwards Compatibility:**
- ✅ 所有修改向后兼容
- ✅ 已有关键词关联不受影响
- ✅ 仅增加新的关联,不修改现有数据
- ✅ API 接口不变,前端无需修改(除了 minWeight 默认值)

### Failure Mode Analysis

经过系统性失败模式分析,识别了以下关键失败点和预防措施:

#### 🔴 Critical Failures (P0 - 修复中)

**1. AI 处理缺失**
- **症状**: 部分内容完全无关键词数据
- **影响**: 导致无法创建关键词关联
- **缓解**: Fallback 到标题/标签匹配
- **长期**: 批量 AI 处理历史内容

**2. 关联计算逻辑过严**
- **症状**: 单侧无关键词时完全跳过
- **影响**: 大量潜在关联被忽略
- **缓解**: 移除严格检查,使用渐进式 fallback
- **验证**: 日志统计 fallback 使用率

**3. 权重计算不合理**
- **症状**: 需要 5 个共享关键词才达到权重 1.0
- **影响**: 低权重关联被前端阈值过滤
- **缓解**: 改用相对权重公式
- **验证**: 检查权重分布,确保合理范围

#### 🟡 Medium Risks (P1 - 已识别)

**4. 前端阈值过滤**
- **症状**: 默认 minWeight 0.3 过滤掉弱关联
- **影响**: 关联存在但不可见
- **缓解**: 降低默认阈值到 0.2
- **改进**: UI 显示被隐藏的边数量

**5. 关键词质量差**
- **症状**: 关键词过于通用或不相关
- **影响**: 创建低质量关联
- **缓解**: 改进提取算法,过滤停用词
- **长期**: 考虑 TF-IDF 优化

#### 🟢 Low Priority Issues (P2 - 后续优化)

**6. 查询性能问题**
- **症状**: `discover_all_pairs` O(n²) 复杂度
- **影响**: 大规模内容时变慢
- **缓解**: 批量查询,增量发现
- **长期**: 后台任务 + 进度条 UI

#### 失败模式汇总表

| 失败模式 | 严重性 | 发生概率 | 影响范围 | 状态 | 优先级 |
|---------|--------|---------|---------|------|--------|
| AI 处理缺失 | 🔴 高 | 🟡 中 | 全局 | ✅ 已识别 | P0 (Task 1) |
| 计算逻辑过严 | 🔴 高 | 🔴 高 | 全局 | ✅ 已识别 | P0 (Task 1) |
| 权重计算不合理 | 🟡 中 | 🔴 高 | 部分 | ✅ 已识别 | P0 (Task 1) |
| 前端阈值过滤 | 🟠 中 | 🟡 中 | 体验 | ✅ 已识别 | P1 (Task 3) |
| 关键词质量差 | 🟡 中 | 🟢 低 | 部分 | ℹ️ 已知 | P2 (后续优化) |
| 查询性能问题 | 🟢 低 | 🟢 低 | 性能 | ℹ️ 已知 | P2 (后续优化) |

#### 诊断命令

为了帮助用户排查问题,添加诊断工具:

```sql
-- 检查有多少内容缺少关键词
SELECT
    COUNT(*) as total_collections,
    COUNT(DISTINCT CASE WHEN k.id IS NOT NULL THEN c.id END) as collections_with_keywords
FROM collections c
LEFT JOIN keywords k ON c.id = k.collection_id;

-- 检查关键词关联的权重分布
SELECT
    type,
    COUNT(*) as count,
    AVG(weight) as avg_weight,
    MIN(weight) as min_weight,
    MAX(weight) as max_weight
FROM associations
WHERE type = 'keyword'
GROUP BY type;
```
