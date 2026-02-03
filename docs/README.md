# 项目文档目录

本目录包含面向用户和开发者的项目文档。

## 📁 文档组织

```
docs/
├── README.md                           # 本文件 - 文档导航
├── api-endpoints.md                    # 后端 API 完整参考
├── architecture.md                     # 系统架构和设计决策
├── development-guide.md                # 开发环境设置和工作流
├── project-overview.md                 # 项目背景和功能概述
├── integration-architecture.md         # MCP 和外部集成架构
├── architecture-ai-graph-separation.md # AI 和图系统设计
├── hooks-selection-guide.md            # React Hooks 选择指南
└── architecture/
    └── sync-api-decision.md            # 同步 API 架构决策记录 (ADR)
```

## 📚 文档说明

### 用户文档
- **project-overview.md**: 项目介绍、功能特性、技术栈
- **api-endpoints.md**: 完整的 API 端点文档
- **integration-architecture.md**: MCP 协议和 AI 助手集成

### 开发者文档
- **development-guide.md**: 开发环境设置、常用命令、代码规范
- **architecture.md**: 完整的系统架构文档
- **architecture-ai-graph-separation.md**: AI 和图谱系统分离架构
- **hooks-selection-guide.md**: React Hooks 使用指南

### 架构决策记录 (ADR)
- **architecture/sync-api-decision.md**: 关于双 Hooks 架构的决策记录

## 🔗 相关文档

**BMAD 工作流程内部文档** (开发工件、规划文档):
- 位置: `_bmad-output/`
- 包含: PRD、Epics、技术规范、实现计划等
- 用途: AI Agent 开发过程中的临时文档和工件

**用户文档** (本项目):
- 位置: `docs/`
- 包含: 面向用户和开发者的最终文档
- 用途: 项目使用、开发和维护

## 📝 文档维护

当更新项目架构或功能时:
1. 更新 `docs/` 中的相关文档
2. 如有重大架构决策,在 `docs/architecture/` 中创建 ADR
3. `_bmad-output/` 保留开发历史,不需要手动维护

## 🤖 关于 AI 代理开发

本项目使用 **BMAD-METHOD** 工作流程完全由 AI 代理开发。

更多信息:
- BMAD 项目: https://github.com/bmad-code-org/BMAD-METHOD
- 开发历史: `_bmad-output/workflows/`
