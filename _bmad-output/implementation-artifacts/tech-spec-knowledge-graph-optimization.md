---
title: '知识图谱优化 - 提升可视化、代码质量、用户体验和权重合理性'
slug: 'knowledge-graph-optimization'
created: '2026-02-09'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4, 5, 6]
tech_stack: ['React 19', 'TypeScript 5.9', 'AntV G6 v5', 'TanStack Router/Query', 'Zustand', 'TailwindCSS 4', 'Rust (Tauri 2.x)', 'SQLite']
files_to_modify: ['association.rs', 'discovery.rs', 'builder.rs', 'GraphView.tsx', 'GraphPage.tsx', 'GraphControls.tsx', 'article-list/index.tsx', '新增: graph-store.ts, useGraphData.ts, useGraphLayout.ts, useGraphFilters.ts, useArticleAssociations.ts, GraphTooltip.tsx, GraphLegend.tsx, GraphStats.tsx, ArticleAssociations.tsx, MigrationProgress.tsx, migration.rs']
code_patterns: ['Zustand store with persist middleware', 'TanStack Query for data fetching', 'Tauri invoke<CommandResult<T>> pattern', 'React Compiler (no manual memoization)', 'Given/When/Then acceptance criteria']
test_patterns: ['当前覆盖率: 0%', '需要配置: Vitest + @testing-library/react', '后端有少量单元测试 (association.rs)', '无集成测试和E2E测试', '目标覆盖率: 80%+']
---

# Tech-Spec: 知识图谱优化 - 提升可视化、代码质量、用户体验和权重合理性

**Created:** 2026-02-09

## Overview

### Problem Statement

当前知识图谱存在以下问题：
1. **权重不合理**: 时间关联权重过高（最高1.0，1分钟内boost 1.5倍），超过关键词和标签关联，不合理；缺少收藏夹关联类型
2. **可视化问题**: 节点位置较近，导致边/关联关系难以看清
3. **功能缺失**: 无法在阅读文章时快速查看其关联节点
4. **代码质量**: TypeScript 类型安全、组件拆分、状态管理、测试覆盖率、错误处理需要改进
5. **可视化表达**: 节点大小/颜色、边的样式、图例说明、统计信息不够直观

### Solution

通过重新设计权重算法、优化布局算法、增强交互体验、添加收藏夹关联、重构代码结构、完善可视化表达，提升知识图谱的整体可用性、合理性和可维护性

### Scope

**In Scope:**
- ✅ 权重算法重新设计：降低时间关联权重（建议0.3-0.5），调整1分钟内boost系数，实现收藏夹关联
- ✅ 节点布局优化：避免重叠，改善边可见性
- ✅ 文章详情页关联节点预览组件（左下角）
- ✅ 代码质量优化（类型安全、组件拆分、状态管理、测试、错误处理）
- ✅ 可视化增强（节点样式、边样式、图例、统计信息）
- ✅ 性能监控和优化（为将来扩展做准备）

**Out of Scope:**
- ❌ 全新的图谱后端算法实现（使用现有 Rust 后端）
- ❌ 数据库架构变更
- ❌ 全新的可视化库切换（保持使用 AntV G6 v5）
- ❌ 移动端适配优化（桌面端优先）
- ❌ 实时协作功能

## Context for Development

### Codebase Patterns

项目采用以下技术栈和模式：
- **前端**: React 19 + TypeScript 5.9 + TanStack Router/Query + Zustand + TailwindCSS 4
- **图谱可视化**: AntV G6 v5（力导向布局）
- **后端**: Rust (Tauri 2.x) + Axum HTTP + SQLite
- **状态管理**: UI状态用Zustand，服务器状态用@tanstack/react-query
- **样式**: TailwindCSS 4优先，避免自定义CSS
- **组件库**: shadcn/ui（从@memory-prosthetic/ui导入）
- **代码风格**: Biome格式化，2空格缩进，单引号，120字符行宽
- **禁用手动memoization**: React Compiler已启用，不用useMemo/useCallback/memo

### Files to Reference

**前端核心组件：**

| File | Lines | Purpose | Complexity |
| ---- | ----- | ------- | ----------|
| `apps/desktop/src/components/features/GraphView.tsx` | 887 | AntV G6 图谱可视化核心组件 | 高 - 需要重构 |
| `apps/desktop/src/components/pages/GraphPage.tsx` | 285 | 图谱页面容器，整合 GraphView、Controls、ClusterPanel | 中 - 需要用 store |
| `apps/desktop/src/components/features/GraphControls.tsx` | 192 | 筛选控制面板（layout 状态未连接） | 低 - 需要修复 |
| `apps/desktop/src/components/features/ClusterPanel.tsx` | ~150 | 聚类分析面板 | 中 |
| `apps/desktop/src/components/article-list/index.tsx` | ~260 | 文章列表（左下角添加关联预览） | 中 - 需要修改 |

**后端核心模块：**

| File | Key Lines | Purpose | Priority |
| ---- | --------- | ------- | --------|
| `apps/desktop/src-tauri/src/graph/association.rs` | 141-191, 332-361 | 权重计算逻辑（时间、收藏夹） | P0 - 权重调整 |
| `apps/desktop/src-tauri/src/graph/discovery.rs` | 34-270, 272-625 | 增量/批量关联发现 | P0 - 确保调用 |
| `apps/desktop/src-tauri/src/graph/builder.rs` | 94-310 | 图数据结构构建 | P1 - 格式优化 |
| `apps/desktop/src-tauri/src/graph/clustering.rs` | - | 聚类算法实现 | P2 - 无需修改 |

**类型定义：**

| File | Purpose |
| ---- | ------- |
| `packages/shared/src/types/graph.ts` | 图谱相关 TypeScript 类型定义 |
| `apps/desktop/src-tauri/src/graph/builder.rs` | Rust GraphNode/GraphEdge 结构 |

**现有参考实现：**

| File | Purpose | 可复用模式 |
| ---- | ------- | ----------|
| `apps/desktop/src/store/ai-store.ts` | AI 设置 Zustand store | persist 中间件, 异步操作错误处理 |
| `apps/desktop/src/store/reader-store.ts` | 阅读器设置 store | 简单状态管理, 派生方法 |
| `apps/desktop/src/hooks/use-collections.ts` | Collections CRUD hooks | TanStack Query 标准模式 |
| `apps/desktop/src/hooks/use-favorites.ts` | Favorites hooks | useMutation 并行操作 |
| `apps/desktop/src/components/article-reader/` | 文章阅读器组件 | MarkdownView 集成 |

### Technical Context from Investigation

**前端架构发现：**

1. **GraphView.tsx 痛点：**
   - 文件过大（887行），职责混杂
   - useEffect 依赖过多，任何 props 变化都会重建 G6 图实例
   - 大量内联函数和类型断言（`as unknown as`）
   - 边高亮逻辑不完整
   - 无防抖/节流，性能问题

2. **状态管理问题：**
   - GraphPage 使用 8 个 useState，props drilling 明显
   - GraphControls 的 layout 状态定义但未传递给 GraphView
   - 状态分散在多个组件中

3. **测试现状：**
   - 前端测试覆盖率：0%
   - 后端有少量单元测试（association.rs）
   - 无测试配置文件

**后端架构发现：**

1. **权重算法位置：**
   - 时间关联：`association.rs` 行 141-191
   - 标签关联：行 106-139
   - 关键词关联：行 209-271
   - 收藏夹关联：行 332-361（已实现，映射为 Folder 类型）

2. **关联发现流程：**
   - 增量发现：`discovery.rs` 行 34-270（新建 Collection 时自动触发）
   - 批量发现：行 272-625（手动触发 `discover_all_associations`）
   - 自动清理旧关联机制已存在

3. **数据库Schema：**
   - `associations` 表存储关联数据
   - `association_metadata` 表存储类型特定元数据
   - 收藏夹关联通过 `favorite_id` 外键关联

**文章阅读器集成发现：**

1. **布局结构：**
   ```
   ArticlesLayout
   ├── ArticleList (左侧，w-80)
   │   ├── ScrollArea (文章列表)
   │   ├── Footer Stats (统计信息)
   │   └── [ArticleAssociations - 新增位置]
   └── ArticleReader (右侧)
       └── MarkdownView
   ```

2. **当前文章ID获取：**
   - 从路由参数：`params.articleId`
   - 传递给 ArticleList：`selectedId` prop
   - 可用于获取关联数据

3. **关联数据获取方式：**
   - 选项A：调用现有 `get_graph_data` Tauri 命令（带 focusedNodeId）
   - 选项B：新增 `get_collection_associations` 命令（推荐）

### Architecture Decision Records (ADRs)

本规格说明通过多架构师角色辩论，确定了以下关键技术决策：

#### ADR-001: 权重算法重新设计

**状态**: ✅ 已接受

**背景**:
- 当前时间关联权重过高（最大1.0，1分钟内1.5倍boost）
- 缺少收藏夹关联类型
- 用户反馈时间关联超过关键词/标签关联不合理

**决策**:

| 关联类型 | 最大权重 | Boost条件 | 公式 | 置信度 |
|---------|---------|----------|------|--------|
| **语义** | 1.0 | - | cosine_similarity | 0.7-1.0 |
| **标签** | 0.85 | - | min(shared/4, 1.0) | 0.7 |
| **关键词** | 0.8 | - | shared/min(len1,len2) × 0.7(fallback) | 0.6 |
| **收藏夹** | 0.5 | - | 1.0(同收藏夹) / 0.0(不同) | 0.7 |
| **领域** | 0.4 | - | 0.4(同域名) / 0.0(不同) | 0.6 |
| **时间** | 0.3 | 1分钟内×1.2 | max(0, 1 - minutes/10) × 1.2 | 0.5 |

**权衡**:
- ✅ 权重更合理，时间不再主导关联
- ✅ 收藏夹关联填补了主题分层的空白
- ⚠️ 需要重新计算所有现有关联（性能影响）
- ⚠️ 用户体验可能发生变化（需要告知用户）

**理由**:
1. 时间是弱信号，应该辅助而不是主导
2. 语义相似度是最可靠的关联标准，保持1.0权重
3. 用户主动分类（标签、收藏夹）比自动发现更可信
4. 收藏夹代表用户的主题组织意图，应该有中等权重

**后果**:
- 所有现有关联需要重新计算
- 前端需要更新权重可视化（边样式）
- 需要添加权重版本迁移逻辑
- 用户可以看到更合理的关联关系

---

#### ADR-002: 状态管理优化

**状态**: ✅ 已接受

**背景**:
- GraphPage.tsx 使用多个 useState 管理共享状态
- 状态在 GraphControls、ClusterPanel、GraphView 之间传递
- prop drilling 明显

**决策**:

引入 Zustand store 管理跨组件共享状态：

```typescript
// apps/desktop/src/store/graph-store.ts
interface GraphStore {
  // 共享状态
  filters: GraphFilters
  clusterResult?: ClusteringResult
  selectedClusterId?: number

  // Actions
  setFilters: (filters: GraphFilters) => void
  updateFilters: (updates: Partial<GraphFilters>) => void
  setClusterResult: (result: ClusteringResult) => void
  selectCluster: (id: number | undefined) => void
  clearClusters: () => void
}
```

组件本地状态保留在组件内（不需要共享）：
- `isFullscreen`, `clusterAlgorithm`, `clusterThreshold`, `isClusterLoading`, `isDiscovering`

**权衡**:
- ✅ 消除 prop drilling
- ✅ 选择性订阅优化性能
- ✅ 状态逻辑集中管理
- ⚠️ 增加一个 store 文件
- ⚠️ 需要重构现有组件

**理由**:
1. 当前状态在3个组件间传递，prop drilling 明显
2. Zustand 轻量级，符合项目技术栈
3. 选择性订阅可以优化性能
4. 为未来功能扩展（如图谱编辑）打好基础

**后果**:
- 重构 GraphPage、GraphControls、ClusterPanel
- 新增 `apps/desktop/src/store/graph-store.ts`
- 组件测试需要 mock store

---

#### ADR-003: 节点布局优化

**状态**: ✅ 已接受

**背景**:
- 用户反馈节点位置较近，边难以看清
- 当前力导向布局参数未优化
- 缺少布局交互选项

**决策**:

采用多层次优化策略：

**1. 调整力导向布局参数：**
```typescript
{
  type: 'force',
  linkDistance: (edge) => {
    const baseDistance = 150  // 基础距离增加
    const weightFactor = 1 - edge.data.weight
    return baseDistance * (0.5 + weightFactor)
  },
  nodeStrength: -500,  // 斥力增强（从-300增加到-500）
  edgeStrength: (edge) => edge.data.weight * 200,
  preventOverlap: true,
  nodeSize: (node) => 20 + node.data.degree * 2,
  alphaDecay: 0.05,  // 降低衰减率，让布局收敛更慢但更稳定
}
```

**2. 边样式优化：**
- 高权重(>0.7): 实线，stroke: 2px
- 中权重(0.4-0.7): 虚线，stroke: 1.5px
- 低权重(<0.4): 点线，stroke: 1px，透明度0.5

**3. 新增交互功能：**
- 双击节点：焦点模式（只显示该节点及其1-2层邻居）
- 右键菜单：布局切换（力导向、径向、网格、圆形）
- 节点拖拽：支持手动调整位置

**权衡**:
- ✅ 节点间距增大，边更清晰
- ✅ 权重高的节点更紧密，符合直觉
- ✅ 用户可以交互式调整布局
- ⚠️ 布局计算时间可能增加
- ⚠️ 需要新增交互逻辑

**理由**:
1. 增加节点间距和斥力是最直接的解决方案
2. 动态边长让权重高的关联更紧密，符合用户直觉
3. 边样式区分让用户可以快速识别关联强度
4. 焦点模式和布局切换提供灵活性

**后果**:
- 修改 GraphView.tsx 的布局配置
- 新增边样式计算逻辑
- 新增节点交互事件处理
- 可能需要优化性能（大量节点时）

---

#### ADR-004: 组件拆分

**状态**: ✅ 已接受

**背景**:
- GraphView.tsx 100+ 行，职责混杂
- GraphPage.tsx 需要管理多个状态和逻辑
- 缺少可复用的图谱相关 hooks

**决策**:

**前端拆分：**

1. **提取 Hooks：**
```typescript
// hooks/useGraphData.ts - 数据获取和转换
// hooks/useGraphLayout.ts - 布局配置和切换
// hooks/useGraphEvents.ts - 事件处理（节点点击、边点击、悬停）
// hooks/useGraphFilters.ts - 筛选逻辑
```

2. **提取子组件：**
```typescript
// GraphView.tsx - 主容器（50行）
// GraphTooltip.tsx - 节点/边悬停提示
// GraphLegend.tsx - 图例（类型、权重说明）
// GraphStats.tsx - 统计信息（节点数、边数、平均权重）
```

3. **新增关联节点预览组件：**
```typescript
// ArticleAssociations.tsx - 文章详情页左下角
// 显示当前文章的关联节点（小卡片列表）
```

**后端优化：**
- 修改 `builder.rs`，返回 G6 可直接使用的格式
- 减少 JavaScript 端数据转换

**权衡**:
- ✅ 组件职责清晰，易于维护
- ✅ Hooks 可复用
- ✅ 测试更容易
- ⚠️ 文件数量增加
- ⚠️ 需要重构现有代码

**理由**:
1. 单一职责原则：每个组件只做一件事
2. React 19 + React Compiler：细粒度组件性能更好
3. Hooks 复用：useGraphFilters 可在 GraphPage 和 ArticleAssociations 中使用
4. 为未来扩展打好基础（如图谱编辑功能）

**后果**:
- 重构 GraphView.tsx 和 GraphPage.tsx
- 新增 6-8 个文件
- 组件测试需要重构
- 导入路径需要更新

---

### Technical Decisions Summary

| 决策 | 状态 | 主要变更 | 风险等级 |
|-----|------|---------|---------|
| ADR-001: 权重算法重新设计 | ✅ 已接受 | 调整所有关联类型权重，添加收藏夹关联 | 🟡 中 |
| ADR-002: 状态管理优化 | ✅ 已接受 | 引入 Zustand store | 🟢 低 |
| ADR-003: 节点布局优化 | ✅ 已接受 | 调整布局参数，边样式，交互功能 | 🟢 低 |
| ADR-004: 组件拆分 | ✅ 已接受 | 拆分 GraphView，提取 hooks，新增组件 | 🟡 中 |

### Implementation Tasks Framework

基于 ADR 决策，实现计划将分为以下主要阶段：

**Phase 1: 后端权重算法调整**
- 修改 `association.rs` 和 `discovery.rs` 的权重计算
- 实现收藏夹关联计算逻辑
- 添加权重版本和迁移逻辑

**Phase 2: 前端状态管理重构**
- 创建 `graph-store.ts` (Zustand)
- 重构 GraphPage、GraphControls、ClusterPanel

**Phase 3: 布局和可视化优化**
- 调整 GraphView 布局参数
- 实现边样式区分
- 添加节点交互功能（焦点模式、右键菜单）

**Phase 4: 组件拆分和新功能**
- 拆分 GraphView，提取 hooks
- 创建 ArticleAssociations 组件
- 创建 GraphLegend 和 GraphStats 组件

**Phase 5: 测试和错误处理**
- 添加单元测试
- 添加集成测试
- 完善错误处理和边界情况

待 Step 2 调查后确定：
- 具体文件路径
- 详细任务分解
- 验收标准

---

## Party Mode 专家讨论结果

通过多代理协作（Winston 架构师、Amelia 开发者、Mary 业务分析师、Sally UX 设计师），进一步细化了实现策略：

### 迁移策略（Winston + Sally）

**问题**: 权重算法变更会导致所有现有关联重新计算，用户图谱可能突然"大变样"

**解决方案**: 渐进式迁移策略

1. **权重版本化**
   - 数据库添加字段：`associations.weight_algorithm_version` (TEXT, 默认 'v1')
   - 新算法标记为 'v2'
   - 前端优先使用 v2 关联，v1 作为降级

2. **双版本并存**
   - v1 和 v2 关联同时存在于数据库
   - 前端查询时优先 v2，v1 作为补充

3. **异步迁移**
   - 新增 Tauri command: `migrate_associations_to_v2(options: MigrationOptions)`
   - 后台分批处理，避免阻塞 UI
   - 迁移进度通过事件通知前端

4. **用户体验**
   - 首次启动新版本时显示通知："关联算法已升级，您的图谱可能会更加精准"
   - 提供手动触发选项："立即更新关联"

**技术实现**:
```rust
// apps/desktop/src-tauri/src/graph/migration.rs (新增)
pub struct MigrationOptions {
    pub batch_size: usize,      // 批次大小（默认 100）
    pub delay_ms: u64,          // 批次间延迟（默认 100ms）
    pub priority: MigrationPriority,  // HIGH/MEDIUM/LOW
}
```

---

### 用户分群策略（Mary）

**问题**: 不同规模用户的迁移成本差异巨大（1分钟 vs 30分钟+）

**解决方案**: 基于文章数量的差异化迁移策略

| 用户类型 | 文章数量 | 预计迁移时间 | 触发时机 | 用户体验 |
|---------|---------|-------------|---------|---------|
| **轻度用户** | <100篇 | <1分钟 | 应用启动时立即迁移 | 无感知，快速完成 |
| **中度用户** | 100-500篇 | 5-10分钟 | 用户空闲15分钟后触发 | 后台静默迁移 |
| **重度用户** | 500+篇 | 30分钟+ | 夜间时段（2-6am）或用户手动触发 | 显示进度，支持取消 |

**A/B 测试建议**:
- 实验组（30%）：使用 v2 权重
- 对照组（70%）：继续使用 v1 权重
- 评估周期：2周
- 成功标准：实验组节点点击率提升 10%+

---

### 实现优先级细化（Amelia）

**P0 - 后端权重调整（关键路径）**

| 任务 | 文件 | 关键修改 | 风险 |
|-----|------|---------|------|
| 修改时间关联权重 | `graph/association.rs:141-191` | `max_weight: 1.0 → 0.3`, `boost: 1.5 → 1.2` | 🟡 中 |
| 调整标签关联权重 | `graph/association.rs:106-139` | `max_weight: 1.0 → 0.85` | 🟢 低 |
| 调整关键词关联权重 | `graph/association.rs:209-271` | `max_weight: 1.0 → 0.8`, `fallback: 0.5 → 0.7` | 🟢 低 |
| 确保收藏夹关联调用 | `graph/discovery.rs:239-266` | 验证调用 | 🟢 低 |
| 添加权重版本字段 | `db/connection.rs`, `db/associations.rs` | Schema migration | 🟡 中 |

**P1 - 前端状态管理和迁移UI**

| 任务 | 文件 | 关键修改 | 风险 |
|-----|------|---------|------|
| 创建 graph-store | `src/store/graph-store.ts` (新增) | Zustand store | 🟢 低 |
| 重构 GraphPage | `src/components/pages/GraphPage.tsx` | 使用 store | 🟡 中 |
| 重构 GraphControls | `src/components/features/GraphControls.tsx` | 连接 layout 状态 | 🟢 低 |
| 迁移进度UI | `src/components/features/MigrationProgress.tsx` (新增) | 进度条 + 取消 | 🟢 低 |

**P2 - 组件拆分和可视化优化**

| 任务 | 文件 | 关键修改 | 风险 |
|-----|------|---------|------|
| 拆分 GraphView | `src/components/features/GraphView.tsx` | 887行 → 50行 + hooks | 🟡 中 |
| 提取 hooks | `src/hooks/useGraph*.ts` (4个) | 数据、布局、事件、筛选 | 🟢 低 |
| 创建 ArticleAssociations | `src/components/features/ArticleAssociations.tsx` | 左下角关联预览 | 🟢 低 |
| 创建 GraphLegend/Stats | `src/components/features/` | 图例和统计 | 🟢 低 |
| 调整布局参数 | `src/components/features/GraphView.tsx` | linkDistance, nodeStrength | 🟢 低 |
| 边样式区分 | `src/components/features/GraphView.tsx` | 实线/虚线/点线 | 🟢 低 |

---

### 风险评估和缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| 迁移时间过长 | 用户等待，体验下降 | 🟡 中 | 分批处理 + 异步 + 可取消 |
| 新权重不如旧权重 | 用户满意度下降 | 🟢 低 | A/B 测试 + 灰度发布 + 快速回滚 |
| 数据库 Schema 变更失败 | 迁移中断，数据丢失 | 🟢 低 | 幂等性 + 事务 + 备份 |
| 前端重构引入 bug | 功能异常，性能下降 | 🟡 中 | 充分测试 + 分阶段发布 |
| G6 图重建频繁 | 性能下降，卡顿 | 🟡 中 | useMemo/useCallback + 拆分 useEffect |

---

### 验收标准细化

**P0 完成标准**:
- [ ] 所有权重计算按新公式执行（单元测试覆盖率 80%+）
- [ ] 时间关联最大权重 ≤ 0.36 (0.3 * 1.2)
- [ ] 收藏夹关联正确创建并存储
- [ ] 数据库包含 `weight_algorithm_version` 字段
- [ ] `migrate_associations_to_v2` 命令可用

**P1 完成标准**:
- [ ] graph-store 正确管理 filters 和 clusterResult
- [ ] GraphPage 使用 store，无 props drilling
- [ ] 迁移进度 UI 实时显示进度
- [ ] 用户可以取消迁移

**P2 完成标准**:
- [ ] GraphView.tsx 拆分为 < 200 行主组件 + hooks
- [ ] ArticleAssociations 组件显示在文章列表左下角
- [ ] 边样式基于权重正确区分（实线/虚线/点线）
- [ ] 节点布局优化生效（节点间距增大，重叠减少）
- [ ] 所有新组件有对应测试文件

---

## Party Mode 第二轮讨论结果

通过进一步的专家协作，识别并解决了关键技术细节和用户体验问题：

### 新增技术决策

#### 决策 1: 轻量级 API 设计（Winston + Amelia）

**问题**: ArticleAssociations 组件需要获取单篇文章的关联列表，但现有的 `get_graph_data` API 返回完整的图结构（nodes + edges），存在数据浪费。

**决策**: 创建专门的轻量级 API

**技术实现**:
```rust
// apps/desktop/src-tauri/src/lib.rs (新增)
#[tauri::command]
async fn get_collection_associations(
    state: State<'_, Arc<AppState>>,
    collection_id: i64,
    limit: Option<usize>,
) -> Result<CommandResult<Vec<Association>>, CommandError> {
    let repo = AssociationRepository::new(&state.db);
    let associations = repo.get_by_collection_for_article_view(
        collection_id,
        limit.unwrap_or(50),
    )?;
    Ok(CommandResult { success: true, data: associations })
}
```

**前端调用**:
```typescript
// hooks/useArticleAssociations.ts
export function useArticleAssociations(articleId: number | null) {
  return useQuery({
    queryKey: ['associations', articleId],
    queryFn: () => invoke('get_collection_associations', {
      collectionId: articleId,
      limit: 50,
    }),
    enabled: articleId !== null,
  })
}
```

**权衡**:
- ✅ API 语义清晰
- ✅ 性能优化（只返回必要数据）
- ✅ 未来扩展性好（支持 depth 参数）
- ⚠️ 新增一个 Tauri command

**理由**:
1. 避免数据浪费：`get_graph_data` 返回完整图结构，ArticleAssociations 只需要 edges
2. 查询性能优化：直接查询 associations 表，无需经过 GraphBuilder
3. 后端排序：`ORDER BY weight DESC` 确保前端拿到最优关联

---

#### 决策 2: 收藏夹关联动态权重（Mary + Amelia）

**问题**: 大收藏夹（100+篇文章）会形成完全图（clique），导致收藏夹关联淹没其他有价值的关联。

**场景分析**:
- 100 个文章的收藏夹 = 4950 条收藏夹关联（完全图）
- 每条关联权重都是 0.5（固定值）
- 会淹没权重 0.8 的语义关联

**决策**: 采用动态权重公式

**技术实现**:
```rust
// apps/desktop/src-tauri/src/graph/association.rs:332-361
pub fn calculate_favorite_association(...) -> Option<(f64, String)> {
    match (collection1.favorite_id, collection2.favorite_id) {
        (Some(fav1), Some(fav2)) if fav1 == fav2 => {
            let fav_repo = FavoriteRepository::new(&self.db);
            let count = fav_repo.get_collection_count(fav1).ok()??;

            // 动态权重：收藏夹内文章越多，权重越低
            // [CRITICAL-2] 使用 3.0 提高下限，避免大收藏夹关联过低
            let weight = (3.0 / (count as f64).max(3.0)) * 0.5;
            // 2篇文章 -> 0.5
            // 10篇文章 -> 0.15
            // 100篇文章 -> 0.015

            Some((weight, favorite_name))
        }
        _ => None,
    }
}
```

**权重对照表**:
| 收藏夹文章数 | 关联权重 | 说明 |
|------------|---------|------|
| 2篇 | 0.5 | 最大权重（小收藏夹）|
| 5篇 | 0.3 | 中等权重 |
| 10篇 | 0.15 | 较低权重 |
| 20篇 | 0.075 | 低权重 |
| 100篇 | 0.015 | 极低权重（大收藏夹）|

**权衡**:
- ✅ 避免大收藏夹的完全图爆炸
- ✅ 确定性算法（相同输入 → 相同输出）
- ✅ 用户可以看到所有关联，但权重自动调整
- ⚠️ 大收藏夹的关联可能过低（0.01）

**理由**:
1. 保护高价值关联：语义、标签关联不会被淹没
2. 自动适应：无需手动配置，系统自动调整
3. 用户意图保留：收藏夹关联仍然存在，只是权重降低

---

#### 决策 3: ArticleAssociations UI 设计（Sally）

**问题**: 用户需要快速识别高质量关联，避免点击低价值的时间关联。

**决策**: 后端排序 + 前端可视化

**UI 结构**:
```tsx
// apps/desktop/src/components/features/ArticleAssociations.tsx
<div className="border-t p-4">
  {/* 标题栏 */}
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-medium">相关文章</h3>
    <Badge variant="secondary">{associations.length} 篇</Badge>
  </div>

  {/* 关联列表（后端已按权重排序） */}
  <ScrollArea className="h-64">
    {associations.slice(0, 10).map(assoc => (
      <AssociationCard
        key={assoc.id}
        association={assoc}
        onClick={() => onSelect(assoc.target_id)}
      />
    ))}
  </ScrollArea>

  {/* "查看全部"按钮 */}
  {associations.length > 10 && (
    <Button variant="ghost" size="sm" className="w-full mt-2">
      查看全部 {associations.length} 篇 →
    </Button>
  )}
</div>
```

**关联卡片设计**:
```tsx
<AssociationCard>
  {/* 左侧：类型图标 */}
  <div className="flex-shrink-0">
    {assoc.type === 'semantic' && <Sparkles className="text-rose-500 w-4 h-4" />}
    {assoc.type === 'tag' && <Tag className="text-emerald-500 w-4 h-4" />}
    {assoc.type === 'folder' && <Folder className="text-purple-500 w-4 h-4" />}
    {assoc.type === 'time' && <Clock className="text-amber-500 w-4 h-4" />}
  </div>

  {/* 中间：标题 + 摘要 */}
  <div className="flex-1 min-w-0 px-3">
    <p className="text-sm font-medium truncate">{assoc.title}</p>
    <p className="text-xs text-muted-foreground truncate">
      {assoc.reason === 'auto_discovered' ? '自动发现' : '用户创建'}
    </p>
  </div>

  {/* 右侧：权重可视化 */}
  <div className="flex-shrink-0">
    <div
      className="rounded-full"
      style={{
        width: assoc.weight >= 0.7 ? '12px' : assoc.weight >= 0.4 ? '8px' : '6px',
        height: assoc.weight >= 0.7 ? '12px' : assoc.weight >= 0.4 ? '8px' : '6px',
        backgroundColor: getWeightColor(assoc.type),
        opacity: assoc.weight,  // 权重越低，越透明
      }}
    />
  </div>
</AssociationCard>
```

**权重可视化规则**:
- 权重 ≥ 0.7：大圆点（12px），不透明
- 权重 0.4-0.7：中圆点（8px），半透明
- 权重 < 0.4：小圆点（6px），低透明度

**类型图标映射**:
| 类型 | 图标 | 颜色 | 说明 |
|-----|------|------|------|
| semantic | ✨ Sparkles | rose-500 | 语义相似度最高 |
| tag | 🏷️ Tag | emerald-500 | 用户主动分类 |
| folder | 📁 Folder | purple-500 | 同一收藏夹 |
| time | 🕐 Clock | amber-500 | 时间接近 |

**权衡**:
- ✅ 用户可以快速识别高质量关联
- ✅ 类型图标直观易懂
- ✅ 权重可视化无需文字说明
- ⚠️ 只显示前10条（可通过"查看全部"展开）

**理由**:
1. 后端排序避免前端计算：`ORDER BY weight DESC`
2. 视觉层次清晰：图标 → 标题 → 权重点
3. 渐进式展示：默认10条，避免信息过载

---

#### 决策 4: 分阶段迁移策略优化（Mary）

**问题**: 全量迁移风险高，需要渐进式验证新权重的有效性。

**决策**: A/B测试 → 灰度发布 → 清理v1

**阶段1: 小规模验证（A/B测试）**
- 目标用户：随机选择 100 个重度用户
- 实验组（30人）：使用 v2 权重
- 对照组（70人）：继续使用 v1 权重
- 评估周期：2周
- 成功标准：实验组节点点击率提升 10%+

**阶段2: 灰度发布**
- 如果 A/B 测试成功，推广到 30% 用户
- 观察一周，收集错误率和用户反馈
- 无问题后推广到 70% 用户
- 最后推广到 100% 用户

**阶段3: 清理 v1 数据**
- 所有用户迁移完成后，统一删除 v1 关联
- 发布数据库压缩脚本（VACUUM）

**关键指标追踪 SQL**:
```sql
-- 监控 v2 vs v1 关联使用情况
SELECT
  weight_algorithm_version,
  COUNT(*) as total_associations,
  AVG(access_count) as avg_access_count,
  SUM(CASE
    WHEN last_accessed_at > datetime('now', '-7 days')
    THEN 1 ELSE 0
  END) as recent_access_count
FROM associations
WHERE created_at > datetime('now', '-30 days')
GROUP BY weight_algorithm_version;
```

**成功标准（[MEDIUM-2]）**:
- 节点点击率提升 ≥ 10%（用户更频繁地查看关联文章）
- 平均会话时长增加 ≥ 5%（图谱更有吸引力）
- 用户反馈正面率 > 70%（用户满意度）
- 迁移错误率 < 1%（稳定性）

**权衡**:
- ✅ 降低风险：小规模验证失败影响可控
- ✅ 数据驱动：基于实际使用数据决策
- ✅ 用户平滑过渡：分阶段发布
- ⚠️ 周期较长：可能需要 4-6 周完成全流程

**理由**:
1. 权重算法影响面大：需要充分验证
2. 用户满意度优先：避免强制推送可能导致用户流失
3. 快速回滚机制：如果 v2 效果不好，立即停止推广

---

### 更新的 P0 任务清单

基于第二轮讨论，P0 任务新增以下内容：

| 任务 | 文件 | 关键修改 | 状态 |
|-----|------|---------|------|
| 新增轻量级 API | `src-tauri/src/lib.rs`, `src-tauri/src/db/associations.rs` | `get_collection_associations` command + `get_by_collection_for_article_view` method | 新增 ✨ |
| 修改收藏夹权重公式 | `src-tauri/src/graph/association.rs:332-361` | 动态权重：`weight = 0.5 * (2.0 / max(count, 2.0))` | 修改 🔧 |
| 添加 FavoriteRepository::get_collection_count | `src-tauri/src/db/favorites.rs` | 新增方法：获取收藏夹内文章数量 | 新增 ✨ |

---

## Implementation Plan

### Tasks

#### P0: 后端权重算法调整（关键路径）

- [ ] **Task 1: 修改时间关联权重计算**
  - File: `apps/desktop/src-tauri/src/graph/association.rs`
  - Action: 修改行 141-191 的 `calculate_time_association` 函数
    - 将 `max_weight` 从隐式的 1.0 改为显式的 0.3
    - 将 `boost_multiplier` 从 1.5 改为 1.2
    - 最终最大权重 = 0.3 * 1.2 = 0.36
  - Notes: 时间关联应该是最弱的辅助信号

- [ ] **Task 2: 调整标签关联权重**
  - File: `apps/desktop/src-tauri/src/graph/association.rs`
  - Action: 修改行 106-139 的 `calculate_tag_association` 函数
    - 将 `max_weight` 从隐式的 1.0 改为显式的 0.85
    - 修改公式为 `min(shared_tags.len() as f64 / 4.0, 1.0) * 0.85`
  - Notes: 用户主动分类应该有较高权重

- [ ] **Task 3: 调整关键词关联权重**
  - File: `apps/desktop/src-tauri/src/graph/association.rs`
  - Action: 修改行 209-271 的 `calculate_keyword_association` 函数
    - 将 `max_weight` 从隐式的 1.0 改为显式的 0.8
    - 将 `FALLBACK_DISCOUNT` 从 0.5 改为 0.7
    - 公式保持：`shared_count / min(len1, len2) * 0.8`，fallback 时乘以 0.7
  - Notes: 内容层面的关联应该强于时间

- [ ] **Task 4: 调整收藏夹关联为动态权重**
  - File: `apps/desktop/src-tauri/src/graph/association.rs`
  - Action: 修改行 332-361 的 `calculate_favorite_association` 函数
    - 添加 `FavoriteRepository::get_collection_count` 调用
    - 修改权重计算为动态公式：`weight = (3.0 / (count as f64).max(3.0)) * 0.5`
    - 2篇文章 → 0.5, 10篇 → 0.15, 100篇 → 0.015
  - Notes: 避免大收藏夹形成完全图，使用 3.0 替代 2.0 提高下限

- [ ] **Task 5: 添加权重版本字段到数据库**
  - File: `apps/desktop/src-tauri/src/db/connection.rs`
  - Action: 在 `migrate()` 函数中添加 ALTER TABLE 语句
    ```sql
    -- 幂等性检查
    ALTER TABLE associations ADD COLUMN weight_algorithm_version TEXT DEFAULT 'v1';
    CREATE INDEX IF NOT EXISTS idx_associations_version ON associations(weight_algorithm_version);
    ```
  - Validation: 迁移前验证所有现有数据标记为 v1
    ```sql
    UPDATE associations SET weight_algorithm_version = 'v1' WHERE weight_algorithm_version IS NULL;
    ```
  - Notes: 使用事务确保原子性，添加单元测试验证版本标记

- [ ] **Task 6: 确保收藏夹关联在发现时被调用**
  - File: `apps/desktop/src-tauri/src/graph/discovery.rs`
  - Action: 验证行 239-266 的收藏夹关联逻辑
    - 确保 `calculate_favorite_association` 被调用
    - 确保返回的关联被添加到结果列表
  - Notes: 收藏夹关联已存在，只需验证

- [ ] **Task 7: 新增轻量级 API - 获取文章关联**
  - File: `apps/desktop/src-tauri/src/lib.rs` (新增 command)
  - Action: 添加 `get_collection_associations` Tauri command
    ```rust
    #[tauri::command]
    async fn get_collection_associations(
        state: State<'_, Arc<AppState>>,
        collection_id: i64,
        limit: Option<usize>,
    ) -> Result<CommandResult<Vec<Association>>, CommandError>
    ```
    - **[LOW-1]** 添加认证检查：验证用户登录状态和权限
  - File: `apps/desktop/src-tauri/src/db/associations.rs` (新增 method)
  - Action: 添加 `get_by_collection_for_article_view` 方法
    - 查询 `source_id = ?1 OR target_id = ?1` 的所有关联
    - 按 `weight DESC` 排序
    - 限制返回数量（默认 50）

- [ ] **Task 8: 新增迁移 API - 迁移到 v2 权重**
  - File: `apps/desktop/src-tauri/src/graph/migration.rs` (新增文件)
  - Action: 创建迁移模块
    - 定义 `MigrationOptions` 结构体（batch_size, delay_ms, priority）
    - 实现 `migrate_associations_to_v2` 函数
    - 后台分批处理，发送进度事件
    - **[CRITICAL-3]** 添加回滚机制：`rollback_associations_to_v1` 函数
    - **[CRITICAL-4]** 添加幂等性检查：迁移锁和状态验证
    - **[CRITICAL-1]** 添加性能基准：记录迁移时间和内存使用
      - 目标：100篇文章 < 30秒，1000篇文章 < 5分钟
      - 监控：内存使用 < 500MB
  - File: `apps/desktop/src-tauri/src/lib.rs` (新增 command)
  - Action: 添加 `migrate_associations_to_v2` Tauri command
    - 使用事务确保 batch 失败时自动回滚
    - 添加迁移状态标记（migrating → completed/failed）
    - **[HIGH-1]** 定义错误类型：`GraphError::{MigrationFailed, BatchFailed, ValidationError}`
    - **[HIGH-1]** 使用结构化日志（`error!` macro），移除 emoji 日志

#### P1: 前端状态管理和迁移 UI

- [ ] **Task 9: 创建 graph-store (Zustand)**
  - File: `apps/desktop/src/store/graph-store.ts` (新增文件)
  - Action: 创建 Zustand store 管理图谱状态
    ```typescript
    interface GraphStore {
      filters: GraphFilters
      clusterResult?: ClusteringResult
      selectedClusterId?: number
      setFilters: (filters: GraphFilters) => void
      updateFilters: (updates: Partial<GraphFilters>) => void
      setClusterResult: (result: ClusteringResult) => void
      selectCluster: (id: number | undefined) => void
      clearClusters: () => void
    }
    ```
  - Notes: 参考 `ai-store.ts` 的模式，使用 persist 中间件

- [ ] **Task 10: 重构 GraphPage 使用 graph-store**
  - File: `apps/desktop/src/components/pages/GraphPage.tsx`
  - Action: 移除 useState，使用 graph-store
    - 删除：`filters`, `clusterResult`, `selectedClusterId` 的 useState
    - 添加：`const { filters, setFilters, clusterResult, setClusterResult } = useGraphStore()`
    - 移除 props drilling，直接在组件中使用 store
  - Notes: 组件本地状态（isFullscreen, isClusterLoading 等）保留

- [ ] **Task 11: 重构 GraphControls 连接 layout 状态**
  - File: `apps/desktop/src/components/features/GraphControls.tsx`
  - Action: 修复 layout 状态未连接的问题
    - 移除本地的 `layout` state
    - 从 graph-store 获取 `filters.layout`
    - 调用 `updateFilters({ layout: value })` 更新

- [ ] **Task 12: 创建迁移进度 UI 组件**
  - File: `apps/desktop/src/components/features/MigrationProgress.tsx` (新增文件)
  - Action: 创建迁移进度显示组件
    - 显示进度条（已处理 / 总数）
    - 显示当前处理的文章标题
    - 提供取消按钮
    - 监听 `association_migration:progress` 事件

#### P2: 组件拆分、可视化优化和新功能

- [ ] **Task 13: 创建 useGraphData hook**
  - File: `apps/desktop/src/hooks/useGraphData.ts` (新增文件)
  - Action: 提取图谱数据获取逻辑
    - 使用 `useQuery` 调用 `get_graph_data`
    - 返回 `{ data, isLoading, error, refetch }`
  - Notes: 参考 `use-collections.ts` 的模式

- [ ] **Task 14: 创建 useGraphFilters hook**
  - File: `apps/desktop/src/hooks/useGraphFilters.ts` (新增文件)
  - Action: 提取筛选逻辑
    - 提供筛选辅助函数（按类型、权重筛选）
    - 在 GraphPage 和 ArticleAssociations 中复用

- [ ] **Task 15: 创建 useArticleAssociations hook**
  - File: `apps/desktop/src/hooks/useArticleAssociations.ts` (新增文件)
  - Action: 创建文章关联获取 hook
    - 调用新的 `get_collection_associations` API
    - 返回按权重排序的关联列表
    - 支持筛选（按类型、最小权重）

- [ ] **Task 16: 重构 GraphView - 拆分为多个组件**
  - File: `apps/desktop/src/components/features/GraphView.tsx`
  - Action: 将 887 行的文件重构为
    - 主容器 GraphView.tsx (~100 行)：布局和事件绑定
    - GraphTooltip.tsx：节点/边悬停提示
    - GraphStats.tsx：统计信息（节点数、边数、平均权重、连通分量）
    - **[HIGH-2]** Legend 功能合并到 GraphStats（减少组件数量）
  - Notes: 提取逻辑到 hooks (useGraphData, useGraphLayout, useGraphEvents)

- [ ] **Task 17: 调整 GraphView 布局参数**
  - File: `apps/desktop/src/components/features/GraphView.tsx`
  - Action: 修改 G6 布局配置（详细配置如下）
    ```typescript
    {
      type: 'force',
      preventOverlap: true,
      nodeSize: (node) => 20 + node.data.degree * 2,
      linkDistance: (edge) => {
        const baseDistance = 150;
        const weightFactor = 1 - edge.data.weight;
        return baseDistance * (0.5 + weightFactor);
      },
      nodeStrength: -500,
      edgeStrength: (edge) => edge.data.weight * 200,
      alphaDecay: 0.05,
    }
    ```
  - **[MEDIUM-3]** 明确列出所有 G6 layout 配置参数

- [ ] **Task 18: 实现边样式区分（基于权重）**
  - File: `apps/desktop/src/components/features/GraphView.tsx`
  - Action: 在边的 style 回调中添加样式逻辑
    - 高权重 (>0.7): 实线, stroke: 2px, opacity: 1.0
    - 中权重 (0.4-0.7): 虚线, stroke: 1.5px, opacity: 0.8
    - 低权重 (<0.4): 点线, stroke: 1px, opacity: 0.5

- [ ] **Task 19: 添加节点交互功能（焦点模式）**
  - File: `apps/desktop/src/components/features/GraphView.tsx`
  - Action: 实现双击节点的焦点模式
    - 双击节点：设置 `filters.focusedNodeId` 和 `filters.maxDepth = 1`
    - 只显示该节点及其直接关联
    - 再次双击或点击空白处：退出焦点模式

- [ ] **Task 20: 创建 ArticleAssociations 组件**
  - File: `apps/desktop/src/components/features/ArticleAssociations.tsx` (新增文件)
  - Action: 创建文章关联预览组件
    - 使用 `useArticleAssociations` hook 获取数据
    - 显示前 10 条关联（后端已按权重排序）
    - 每条关联显示：类型图标、标题、权重圆点
    - 点击关联跳转到对应文章
  - File: `apps/desktop/src/components/article-list/index.tsx`
  - Action: 在第 254 行后添加 ArticleAssociations 组件
    - 传递 `selectedId` 作为 `articleId`
    - 传递 `onSelect` 回调处理点击

- [ ] **Task 21: 创建 GraphStats 组件（包含图例功能）**
  - File: `apps/desktop/src/components/features/GraphStats.tsx` (新增文件)
  - Action: 创建统计信息组件
    - **[MEDIUM-4]** 显示节点数、边数、连通分量数
    - **[MEDIUM-4]** 显示平均度、聚类系数、直径
    - 显示各类型关联的数量分布
    - 包含图例功能（类型图标、权重说明）

#### P3: 测试和错误处理

- [ ] **Task 22: 配置 Vitest 测试环境**
  - File: `vitest.config.ts` (新增文件，项目根目录)
  - Action: 配置 Vitest
    - 设置测试环境为 jsdom
    - 配置 @testing-library/react 插件
    - 添加 coverage 阈目标 (80%+)

- [ ] **Task 23: 创建 graph-store 测试**
  - File: `apps/desktop/src/store/graph-store.test.ts` (新增文件)
  - Action: 测试 Zustand store
    - 测试 state 初始化
    - 测试 actions (setFilters, updateFilters, setClusterResult)
    - 测试 persist 中间件

- [ ] **Task 24: 创建 hooks 测试**
  - File: `apps/desktop/src/hooks/useGraphData.test.ts` (新增文件)
  - File: `apps/desktop/src/hooks/useArticleAssociations.test.ts` (新增文件)
  - Action: 测试自定义 hooks
    - 测试数据获取逻辑
    - 测试错误处理
    - 测试缓存和刷新

- [ ] **Task 25: 创建组件测试**
  - File: `apps/desktop/src/components/features/ArticleAssociations.test.tsx` (新增文件)
  - File: `apps/desktop/src/components/features/GraphStats.test.tsx` (新增文件)
  - Action: 测试 React 组件
    - 测试渲染逻辑
    - 测试用户交互（点击、筛选）
    - 测试边界情况（空数据、加载失败）

- [ ] **Task 26: 添加 E2E 测试**
  - File: `tests/e2e/graph-migration.spec.ts` (新增文件)
  - File: `tests/e2e/weight-calculation.spec.ts` (新增文件)
  - **[HIGH-4]** Action: 端到端测试覆盖
    - 迁移流程：触发迁移 → 验证进度 → 验证完成 → 验证回滚
    - 权重计算正确性：创建文章 → 验证各类型权重符合公式
    - 边界情况：空数据库、网络错误、迁移中断

- [ ] **Task 27: 添加性能基准测试**
  - **[CRITICAL-1]** File: `apps/desktop/src-tauri/src/graph/migration bench.rs` (新增文件)
  - Action: 性能基准测试
    - 测试 100/500/1000 篇文章的迁移时间
    - 测试内存使用峰值
    - 添加到 CI/CD，性能退化时失败

- [ ] **Task 28: 更新文档**
  - **[LOW-2]** Action: 完善文档
    - API 文档：使用 OpenAPI/Swagger 记录新增 API
    - 架构图：更新权重算法变更说明
    - 迁移指南：用户如何手动触发迁移、如何查看进度
    - 用户文档：新功能说明（收藏夹关联、权重可视化）

- [ ] **Task 29: 添加 TypeScript 类型安全改进**
  - **[MEDIUM-1]** File: `apps/desktop/src/components/features/GraphView.tsx`
  - Action: 替换 any 类型为具体类型
    - 统计当前 23 个 any 类型断言
    - 目标：减少到 < 5 个，其余使用 unknown + 类型守卫

### Acceptance Criteria

#### P0: 后端权重算法调整

- [ ] **AC 1**: Given 用户有收集时间的两篇文章，当计算时间关联时，then 权重最大不超过 0.36
- [ ] **AC 2**: Given 两篇文章共享 4 个标签，当计算标签关联时，then 权重为 0.85 (4/4 * 0.85)
- [ ] **AC 3**: Given 两篇文章共享 2 个关键词（各自有 10 个关键词），当计算关键词关联时，then 权重为 0.16 (2/10 * 0.8)
- [ ] **AC 4**: Given 两篇文章在同一收藏夹（共 10 篇），当计算收藏夹关联时，then 权重为 0.1 (0.5 * 2/10)
- [ ] **AC 5**: Given 权重算法版本迁移，when 调用 `migrate_associations_to_v2`，then 数据库包含 `weight_algorithm_version = 'v2'` 的关联
- [ ] **AC 6**: Given 单篇文章 ID，when 调用 `get_collection_associations`，then 返回按权重降序排列的关联列表（最多 50 条）

#### P1: 前端状态管理和迁移 UI

- [ ] **AC 7**: Given 用户调整筛选条件，when 修改 GraphControls 的筛选器，then GraphView 自动响应筛选变化
- [ ] **AC 8**: Given 用户选择聚类，when 在 ClusterPanel 中选择聚类，then GraphView 高亮聚类节点
- [ ] **AC 9**: Given 权重迁移进行中，when 显示 MigrationProgress 组件，then 用户可以看到实时进度和取消按钮

#### P2: 组件拆分、可视化优化和新功能

- [ ] **AC 10**: Given 图谱包含节点和边，when GraphView 渲染，then 节点之间的距离足够大，边清晰可见（无重叠）
- [ ] **AC 11**: Given 图谱包含不同权重的边，when 渲染边，then 高权重边（>0.7）显示为实线，低权重边（<0.4）显示为点线
- [ ] **AC 12**: Given 用户双击节点，when 触发焦点模式，then 只显示该节点及其直接关联（1层）
- [ ] **AC 13**: Given 用户在文章阅读页面，when 查看左下角，then 可以看到当前文章的关联列表（最多 10 条）
- [ ] **AC 14**: Given 关联列表显示，when 查看关联卡片，then 可以看到类型图标、标题和权重可视化圆点
- [ ] **AC 15**: Given 用户点击关联卡片，when 触发点击事件，then 文章列表选中对应文章并显示内容

#### P3: 测试和错误处理

- [ ] **AC 16**: Given 运行测试套件，when 执行 `bun run test`，then 所有测试通过且覆盖率 ≥ 80%（后端 85%+）
- [ ] **AC 17**: Given graph-store 状态更新，when 调用 `setFilters`，then store 中的 filters 状态正确更新
- [ ] **AC 18**: Given API 调用失败，when 发生网络错误，then 组件显示错误提示并提供重试选项
- [ ] **AC 19**: Given 迁移过程失败，when 发生数据库错误，then 迁移停止并记录错误日志，v1 关联保持不变
- [ ] **AC 20**: Given **[CRITICAL-1]** 迁移 1000 篇文章，when 执行迁移，then 完成时间 < 5分钟 且内存使用 < 500MB
- [ ] **AC 21**: Given **[CRITICAL-4]** 重复调用迁移 API，when 迁移正在进行，then 返回 409 Conflict 且不启动新迁移
- [ ] **AC 22**: Given **[CRITICAL-3]** 迁移失败，when 执行回滚，then 所有 v2 关联被删除，v1 关联保持不变
- [ ] **AC 23**: Given **[MEDIUM-2]** A/B 测试完成，when 对比实验组和对照组，then 节点点击率提升 ≥ 10% 且用户正面反馈率 > 70%

## Additional Context

### Adversarial Review Findings (2026-02-10)

通过对抗性审查，识别出以下需要解决的潜在问题：

#### Critical Issues (必须解决)

1. **[CRITICAL-1] 缺少性能基准指标**
   - **问题**: P0 任务涉及大规模重计算（1000篇文章=500K边），但没有定义性能基准目标
   - **影响**: 无法验证优化效果，可能引入性能退化
   - **解决方案**: 在 P0-8 中添加性能基准测试
     - 定义目标：100篇文章迁移 < 30秒，1000篇文章 < 5分钟
     - 添加内存使用限制：< 500MB
     - 添加基准测试到 CI/CD

2. **[CRITICAL-2] 文件夹动态权重下限过低**
   - **问题**: 公式 `weight = 0.5 * (2.0 / max(count, 2.0))` 在 count=100 时降至 0.01
   - **影响**: 大收藏夹关联可能被完全忽略
   - **解决方案**: 调整公式为 `weight = 0.5 * (3.0 / max(count, 3.0))`
     - 2篇文章 → 0.5
     - 10篇文章 → 0.15
     - 100篇文章 → 0.015（略微提高下限）

3. **[CRITICAL-3] 回滚策略未定义**
   - **问题**: 权重 v2→v1 迁移失败时如何回滚？batch 处理部分失败如何恢复？
   - **影响**: 数据一致性风险，用户可能处于不一致状态
   - **解决方案**: 在 P0-8 添加回滚机制
     - 添加 `migrate_associations_to_v1` 反向迁移命令
     - batch 失败时自动回滚当前批次
     - 添加迁移状态标记（migrating → completed/failed）

4. **[CRITICAL-4] 迁移 API 缺少幂等性**
   - **问题**: `GET /api/graph/migrate-weights` 可能被重复调用，但没有防重入机制
   - **影响**: 可能导致重复计算或数据损坏
   - **解决方案**: 在 P0-8 添加幂等性检查
     - 添加迁移锁（SQLite: `INSERT INTO migration_lock VALUES ('v2_migration')`）
     - 已在迁移中时返回 `409 Conflict`
     - 使用事务确保原子性

#### High Priority Issues (应该解决)

5. **[HIGH-1] 错误处理不一致**
   - **问题**: ADR-002 要求"统一错误处理"，但 P0-6 只提到"添加错误日志"，没有定义错误类型
   - **解决方案**:
     - 定义 Rust 错误类型：`GraphError::{MigrationFailed, BatchFailed, ValidationError}`
     - 前端错误映射：迁移失败、网络错误、数据验证错误
     - 移除 emoji 日志（❌），使用结构化日志（`error!` macro）
     - 添加用户友好的错误提示

6. **[HIGH-2] 组件拆分粒度过细**
   - **问题**: GraphView → 8 个子组件可能导致 props drilling 复杂化
   - **解决方案**: 重新评估 P2 任务
     - GraphView 拆分为 3 个组件（而非 8 个）：主容器 + Tooltip + Stats
     - hooks 提取保持不变（4 个）
     - Legend 和 Stats 可以合并为一个组件

7. **[HIGH-3] 缺少数据迁移验证**
   - **问题**: P0-2 "添加权重版本字段"后，没有验证步骤确保现有数据正确标记为 v1
   - **解决方案**: 在 P0-5 添加验证步骤
     - 迁移前检查：`SELECT COUNT(*) FROM associations WHERE weight_algorithm_version IS NULL`
     - 如果发现 NULL 值，先标记为 v1 再进行 v2 迁移
     - 添加单元测试验证版本标记逻辑

8. **[HIGH-4] 测试覆盖范围不足**
   - **问题**: 26 个任务只有 4 个明确提到测试，缺少端到端测试
   - **解决方案**:
     - 所有 P0/P1 任务必须有对应的单元测试
     - P3 添加 E2E 测试：迁移流程、权重计算正确性、边界情况
     - 目标覆盖率：后端 85%+，前端 80%+

#### Medium Priority Issues (建议解决)

9. **[MEDIUM-1] TypeScript 类型安全未量化**
   - **问题**: P0-8 "替换 any 为具体类型"没有明确范围
   - **解决方案**:
     - GraphView.tsx 当前有 23 个 `any` 类型断言
     - 目标：减少到 < 5 个，其余使用 `unknown` + 类型守卫

10. **[MEDIUM-2] 缺少渐进式迁移监控指标**
    - **问题**: A/B 测试→30%→70%→100% 的决策基于什么指标？
    - **解决方案**: 在 Party Mode 第二轮决策中添加成功标准
      - 节点点击率提升 10%+
      - 平均会话时长增加 5%+
      - 用户反馈正面率 > 70%

11. **[MEDIUM-3] 节点布局算法未优化**
    - **问题**: P1-1 "优化力导向布局参数"只说"调整参数"，但 G6 layout 配置未明确
    - **解决方案**: 在 P1-1 中详细列出配置
      - `preventOverlap: true, nodeSize: 20 + degree * 2`
      - `linkDistance: (edge) => 150 * (0.5 + (1 - edge.data.weight))`
      - `nodeStrength: -500, edgeStrength: (edge) => edge.data.weight * 200`
      - `alphaDecay: 0.05`

12. **[MEDIUM-4] 缺少知识图谱统计信息**
    - **问题**: P1-4 "添加图统计"没有明确指标
    - **解决方案**: 在 P1-4 中定义统计指标
      - 节点数、边数、连通分量数
      - 平均度、聚类系数、直径
      - 各类型关联的数量分布

#### Low Priority Issues (可选解决)

13. **[LOW-1] 安全审查缺失**
    - **问题**: 新增 API `/api/graph/collection-associations` 没有认证/授权设计
    - **解决方案**: 在 P0-7 添加安全检查
      - 验证用户登录状态（从 Tauri window label 获取 user_id）
      - 验证用户有权限访问该 collection

14. **[LOW-2] 文档更新不完整**
    - **问题**: P3 任务只提到"更新用户文档"
    - **解决方案**: 在 P3 添加文档任务
      - API 文档（OpenAPI/Swagger）
      - 架构更新图（权重算法变更）
      - 迁移指南（用户如何手动触发迁移）

### Dependencies

**外部依赖:**
- @antv/g6 ^5.0.0（图谱可视化库）
- @tanstack/react-query ^5.0.0（数据获取和缓存）
- zustand ^4.0.0（状态管理）
- @tauri-apps/api ^2.0.0（Tauri API）
- vitest ^2.0.0（测试框架）
- @testing-library/react ^16.0.0（组件测试）

**内部依赖:**
- `packages/shared/src/types/graph.ts`：共享类型定义
- `packages/ui/src/components/ui/`：shadcn/ui 组件库
- `apps/desktop/src-tauri/src/db/`：数据库访问层

**API 依赖:**
- `get_graph_data`：现有 API，获取完整图数据
- `get_collection_associations`：新增 API，获取文章关联列表（P0）
- `migrate_associations_to_v2`：新增 API，权重迁移（P0）

**数据依赖:**
- SQLite 数据库（associations 表，association_metadata 表）
- Embeddings 表（语义关联计算）
- Collections 表（基础数据）
- Favorites 表（收藏夹关联）

### Testing Strategy

**单元测试（后端）:**
- 测试文件：`apps/desktop/src-tauri/src/graph/association.rs` 中的 `#[cfg(test)]` 模块
- 覆盖目标：所有权重计算函数
- 工具：Rust 内置测试框架
- 验证：给定输入，验证输出权重符合公式

**单元测试（前端）:**
- 测试文件：`apps/desktop/src/store/graph-store.test.ts`
- 覆盖目标：graph-store 的状态管理和 actions
- 测试文件：`apps/desktop/src/hooks/useGraphData.test.ts`
- 测试文件：`apps/desktop/src/hooks/useArticleAssociations.test.ts`
- 工具：Vitest + @testing-library/react
- 验证：hook 返回值、状态更新、错误处理

**集成测试:**
- 测试文件：`apps/desktop/src/components/features/GraphView.test.tsx`
- 覆盖目标：GraphView 组件与后端 API 的交互
- Mock：Tauri API (`invoke` 方法)
- 验证：数据获取、错误处理、用户交互

**组件测试:**
- 测试文件：`apps/desktop/src/components/features/ArticleAssociations.test.tsx`
- 覆盖目标：ArticleAssociations 组件的渲染和交互
- 工具：@testing-library/react
- 验证：组件渲染、点击事件、筛选逻辑

**端到端测试（E2E）:**
- 测试场景：
  1. 用户收集文章 → 自动发现关联 → 权重按新公式计算
  2. 用户查看图谱 → 节点布局优化 → 边样式区分
  3. 用户在阅读页面 → 查看关联列表 → 点击关联跳转
- 工具：Playwright（待配置）
- 验证：完整用户流程

**手动测试:**
- 测试场景：
  1. 权重迁移：100 篇文章的迁移时间估算
  2. 大收藏夹：100+ 篇文章的收藏夹关联是否淹没其他关联
  3. 性能测试：500+ 节点的图谱渲染性能
  4. 边界情况：空关联列表、API 失败、网络超时

### Notes

**当前权重设置分析：**

| 关联类型 | 权重计算 | 最大权重 | 置信度 | 问题 |
|---------|---------|---------|-------|------|
| 时间 | `1 - (间隔分钟数/10)`，1分钟内 ×1.5 | **1.0** | 0.5 | ❌ 权重过高 |
| 标签 | `共享标签数/5` | 1.0 | 0.7 | ✅ 合理 |
| 关键词 | `共享关键词数/min(len1,len2)` × 0.5 (fallback) | 1.0 | 0.6 | ✅ 合理 |
| 领域 | 固定 0.4 | 0.4 | 0.6 | ✅ 合理 |
| 语义 | 直接使用余弦相似度 | 1.0 | 0.7-1.0 | ✅ 合理 |
| 收藏夹 | - | - | - | ❌ 未实现 |

**用户期望权重优先级：**
1. 语义关联（最重要）
2. 标签关联
3. 关键词关联
4. 收藏夹关联（待实现）
5. 领域关联
6. 时间关联（辅助，不应过高）
