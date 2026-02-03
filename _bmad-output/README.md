# BMAD 工作流程输出目录

本目录包含 BMAD (Bridging Minds and Development) 工作流程生成的内部文档和工件。

## 📁 目录结构

```
_bmad-output/
├── project-context.md                  # 项目上下文 (AI Agent 实现指南)
├── prd.md                              # 产品需求文档
├── epics.md                            # Epic 和任务分解
├── architecture.md                     # 架构决策文档 (源文件,用户版本在 docs/)
├── development-guide.md                # 开发指南 (源文件,用户版本在 docs/)
├── index.md                            # 项目索引 (源文件,用户版本在 docs/project-overview.md)
├── api-endpoints.md                    # API 文档 (源文件,用户版本在 docs/)
├── integration-architecture.md         # 集成架构 (源文件,用户版本在 docs/)
├── architecture-ai-graph-separation.md # AI 图架构 (源文件,用户版本在 docs/)
├── component-inventory.md              # 组件清单
├── implementation-readiness-report-*/  # 实现就绪报告
│
├── analysis/                           # 分析文档
│   └── product-brief-tauri-app-*.md
│
├── planning-artifacts/                 # 规划工件
│   ├── prd-mcp-refactor.md
│   ├── epics-user-notes.md
│   └── claude-skill-features.md
│
├── implementation-artifacts/           # 实现工件
│   ├── tech-spec-*.md                 # 技术规范
│   ├── *-implementation-architecture.md
│   └── [功能实现文档]
│
├── workflows/                          # 工作流程历史
│   ├── status/
│   └── history/
│
└── archive/                            # 归档文档
```

## 📚 文档类型说明

### 核心文档 (用户可见)

以下文档的副本位于 `docs/` 目录,面向用户和开发者:

| 文档 | 用户版本 | 用途 |
|------|---------|------|
| `architecture.md` | `docs/architecture.md` | 系统架构和设计决策 |
| `development-guide.md` | `docs/development-guide.md` | 开发环境设置和工作流 |
| `index.md` | `docs/project-overview.md` | 项目概述 |
| `api-endpoints.md` | `docs/api-endpoints.md` | API 参考 |
| `integration-architecture.md` | `docs/integration-architecture.md` | MCP 集成架构 |
| `architecture-ai-graph-separation.md` | `docs/architecture-ai-graph-separation.md` | AI 图系统设计 |

### 规划文档 (内部)

- **prd.md**: 产品需求文档,包含功能需求、用户故事、非功能需求
- **epics.md**: Epic 分解和任务规划
- **project-context.md**: AI Agent 实现指南,包含技术栈、代码规范、项目结构

### 实现工件 (内部)

- **planning-artifacts/**: 规划阶段生成的文档
- **implementation-artifacts/**: 实现阶段的技术规范和设计文档
- **workflows/**: BMAD 工作流程执行历史和状态

### 分析文档 (内部)

- **analysis/**: 市场分析、技术分析、竞品分析等

## 🔗 与 docs/ 的关系

```
_bmad-output/                    docs/
(内部文档)                      (用户文档)
     │                               │
     ├─ architecture.md ──复制────→ ├─ architecture.md
     ├─ development-guide.md ──┐    ├─ development-guide.md
     ├─ index.md ────────────┐  │    ├─ project-overview.md
     ├─ api-endpoints.md ───┐ │  │    ├─ api-endpoints.md
     ├─ integration-*.md ──┐ │ │  │    ├─ integration-architecture.md
     └─ ... ───────────┐ │ │ │  │    ├─ architecture-ai-graph-separation.md
                      │ │ │ │  │    ├─ hooks-selection-guide.md
                      ▼ ▼ ▼ ▼  │    └─ architecture/
              (从 _bmad-output 复制)        └─ sync-api-decision.md
```

## 📝 维护规则

### 用户文档 (`docs/`)

**维护者**: 开发团队
**更新频率**: 功能变更时
**受众**: 用户、开发者、贡献者
**内容**:
- 面向用户的 API 文档
- 开发者指南和最佳实践
- 架构决策和设计文档

### 内部文档 (`_bmad-output/`)

**维护者**: BMAD AI Agents
**更新频率**: 工作流程执行时自动生成
**受众**: AI Agents、技术负责人
**内容**:
- PRD 和 Epic 规划
- 技术规范和实现计划
- 工作流程执行历史

## 🔄 同步流程

当 BMAD 工作流程生成或更新核心文档时:

1. **自动同步**: AI Agent 将关键文档复制到 `docs/`
2. **手动同步**: 开发者可手动执行:
   ```bash
   # 复制核心文档到 docs/
   cp _bmad-output/architecture.md docs/
   cp _bmad-output/development-guide.md docs/
   cp _bmad-output/index.md docs/project-overview.md
   cp _bmad-output/api-endpoints.md docs/
   cp _bmad-output/integration-architecture.md docs/
   cp _bmad-output/architecture-ai-graph-separation.md docs/
   ```

3. **更新检查**: 检查 `docs/README.md` 确保文档列表是最新的

## ⚠️ 重要说明

1. **不要直接编辑 `_bmad-output/` 中的核心文档**
   - 这些文件由 BMAD 工作流程生成
   - 直接编辑可能被工作流程覆盖

2. **用户文档在 `docs/` 中维护**
   - 如需修改架构文档,编辑 `docs/architecture.md`
   - `_bmad-output/architecture.md` 保留为原始版本

3. **Git 提交规则**
   - `docs/`: 提交到版本控制,作为项目文档
   - `_bmad-output/`: 可选择性提交,保留开发历史

## 🤖 BMAD 工作流程

本项目使用 [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) 进行 AI 代理驱动的开发。

**工作流程类型**:
- **Analysis**: 市场分析、技术分析
- **Planning**: PRD、Epic 分解
- **Architecture**: 架构决策
- **Implementation**: 功能实现和代码生成

**工作流程历史**: `workflows/history/`
**当前状态**: `workflows/status/`

## 📖 相关文档

- **用户文档**: `../docs/`
- **BMAD 项目**: https://github.com/bmad-code-org/BMAD-METHOD
- **项目 README**: `../README.md`
