# Implementation Plan: 知识图谱与 AI 分类功能

**Created:** 2025-12-25
**Status:** Ready for Implementation
**Epic:** Knowledge Graph & AI Classification
**Related Tech-Spec:** `tech-spec-knowledge-graph-and-ai.md`

## 当前状态

AI 包已创建，PRD 和技术规范已更新，准备开始实施。

## 📋 当前完成状态

### ✅ 已完成

1. **AI 包创建** (`packages/ai`)
   - ✅ 所有 AI 处理功能已实现（summary, tags, classification, keywords, topics, processor）
   - ✅ 配置管理已实现（config.ts）
   - ✅ 统一导出已实现（index.ts）

2. **文档更新**
   - ✅ PRD 已更新，冲突已解决
   - ✅ 技术规范已更新，架构已明确
   - ✅ 架构分离说明文档已创建

3. **项目基础**
   - ✅ 数据库连接已建立
   - ✅ Tauri Commands 基础结构已存在
   - ✅ 前端组件结构已建立

### ⏳ 待实施

根据技术规范，建议按以下顺序实施：

---

## 🎯 Phase 2: AI Processing（优先实施）

**为什么先做 AI Processing？**

- AI 包已创建，只需集成
- 图谱算法需要读取 AI 生成的数据
- 先让 AI 功能工作，再实现图谱

### Step 1: 安装 AI 包依赖

```bash
cd packages/ai
bun add ai@^6.0.0 @ai-sdk/openai@^3.0.0 @ai-sdk/anthropic@^3.0.0 zod@^4.2.1
```

**注意：** 项目根目录已有这些依赖，但需要确保 `packages/ai` 能正确使用。

### Step 2: 在 apps/desktop 中引用 AI 包

```bash
cd apps/desktop
# 确保 apps/desktop/package.json 中有对 @memory-prosthetic/ai 的引用
```

检查 `apps/desktop/package.json` 是否需要在 dependencies 中添加：

```json
{
  "dependencies": {
    "@memory-prosthetic/ai": "workspace:*"
  }
}
```

### Step 3: 实现 Tauri Commands（后端存储）

**文件：** `apps/desktop/src-tauri/src/lib.rs` 或新建 `apps/desktop/src-tauri/src/ai.rs`

需要实现的 Commands：

1. `update_collection_ai_metadata` - 存储 AI 生成的元数据
2. `get_ai_metadata` - 读取 AI 元数据
3. `get_ai_processing_logs` - 读取处理日志

**数据库 Schema 扩展：**

- 在 `apps/desktop/src-tauri/src/db/connection.rs` 中添加 AI 元数据字段
- 创建 `keywords` 表
- 创建 `topics` 表
- 创建 `ai_processing_logs` 表（可选）

### Step 4: 实现 AI 处理 Hook

**文件：** `apps/desktop/src/hooks/use-ai-processing.ts`

功能：

- 使用 `@memory-prosthetic/ai` 的 `processContentAi`
- 集成 TanStack Query
- 调用 Tauri Command 保存结果
- 错误处理和重试

### Step 5: 实现 AI 设置页面

**文件：** `apps/desktop/src/components/features/AiSettings.tsx`

功能：

- API Key 配置（使用 Tauri secure storage）
- 提供商选择（OpenAI/Anthropic/自定义）
- 模型选择
- API Key 验证
- 隐私提示

### Step 6: 集成到内容收集流程

**文件：** `apps/desktop/src/components/CollectionDetail.tsx` 或相关组件

功能：

- 内容收集后自动触发 AI 处理
- 显示 AI 处理进度
- 显示 AI 生成的元数据（摘要、标签、分类等）

---

## 🗺️ Phase 1: Foundation（图谱基础）

**在 AI Processing 完成后实施**

### Step 1: 数据库 Schema 扩展

**文件：** `apps/desktop/src-tauri/src/db/connection.rs`

需要添加：

- `associations` 表
- `association_metadata` 表
- `collections` 表扩展字段（如果还没有）

### Step 2: 关联发现模块

**文件：** `apps/desktop/src-tauri/src/graph/`

需要创建：

- `association.rs` - 关联计算
- `discovery.rs` - 关联发现
- `builder.rs` - 图谱构建
- `analyzer.rs` - 图谱分析

### Step 3: Tauri Commands（图谱）

**文件：** `apps/desktop/src-tauri/src/lib.rs` 或 `apps/desktop/src-tauri/src/graph/commands.rs`

需要实现：

- `get_graph_data` - 获取图谱数据
- `get_node_associations` - 获取节点关联
- `find_path` - 路径查找
- `get_graph_statistics` - 图谱统计

---

## 🎨 Phase 3: Graph Visualization（图谱可视化）

**在 Foundation 完成后实施**

### Step 1: 安装 AntV G6

```bash
cd apps/desktop
bun add @antv/g6@^5.11.0
```

### Step 2: 实现图谱组件

**文件：** `apps/desktop/src/components/features/GraphView.tsx`

### Step 3: 实现图谱控制

**文件：** `apps/desktop/src/components/features/GraphControls.tsx`

---

## 📝 建议的实施顺序

### 第一周：AI Processing 基础

1. ✅ **Day 1-2: 依赖和集成**
   - 安装 AI 包依赖
   - 在 apps/desktop 中引用 AI 包
   - 测试基本导入

2. ✅ **Day 3-4: 后端存储**
   - 扩展数据库 Schema
   - 实现 `update_collection_ai_metadata` Command
   - 测试数据存储

3. ✅ **Day 5: AI Hook**
   - 实现 `use-ai-processing.ts`
   - 集成到内容收集流程
   - 测试端到端流程

### 第二周：AI UI 和设置

1. ✅ **Day 1-2: AI 设置页面**
   - 实现 `AiSettings.tsx`
   - API Key 配置和验证
   - 测试设置保存

2. ✅ **Day 3-4: AI 元数据显示**
   - 在内容详情页显示摘要、标签、分类
   - 显示处理进度
   - 测试 UI 交互

3. ✅ **Day 5: 测试和优化**
   - 端到端测试
   - 错误处理测试
   - 性能优化（缓存、限流）

### 第三周：图谱基础（Phase 1）

1. ✅ **Day 1-3: 数据库和关联发现**
   - 扩展数据库 Schema（associations 表）
   - 实现关联发现模块
   - 测试关联计算

2. ✅ **Day 4-5: 图谱 Commands**
   - 实现图谱相关 Tauri Commands
   - 测试数据查询

### 第四周：图谱可视化（Phase 3）

1. ✅ **Day 1-3: 图谱组件**
   - 安装 AntV G6
   - 实现 GraphView 组件
   - 实现基础交互

2. ✅ **Day 4-5: 图谱控制和优化**
    - 实现 GraphControls
    - 样式和主题
    - 性能优化

---

## 🚀 立即开始：Step 1 - 安装依赖

**第一步最简单，建议立即开始：**

```bash
# 1. 进入 AI 包目录
cd packages/ai

# 2. 安装依赖（注意版本要与根目录一致）
bun add ai@^6.0.0 @ai-sdk/openai@^3.0.0 @ai-sdk/anthropic@^3.0.0 zod@^4.2.1

# 3. 检查 apps/desktop/package.json 是否需要添加对 AI 包的引用
cd ../../apps/desktop
# 编辑 package.json，添加（如果还没有）：
# "@memory-prosthetic/ai": "workspace:*"

# 4. 安装 workspace 依赖
cd ../..
bun install
```

---

## 📚 参考文档

- **技术规范：** `docs/tech-spec-knowledge-graph-and-ai.md`
- **架构分离：** `docs/architecture-ai-graph-separation.md`
- **冲突分析：** `docs/conflict-check-final.md`
- **AI 包文档：** `packages/ai/README.md`

---

## ⚠️ 注意事项

1. **版本一致性**：确保 `packages/ai` 使用的依赖版本与根目录一致
2. **Tauri Secure Storage**：API Key 需要使用 Tauri secure storage 插件
3. **错误处理**：AI 处理失败不应影响内容保存
4. **性能**：不要求生成速度，但需要后台异步处理，不阻塞 UI

---

**下一步行动：** 从 Step 1（安装依赖）开始！
