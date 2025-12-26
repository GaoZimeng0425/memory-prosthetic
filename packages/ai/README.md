# @memory-prosthetic/ai

AI 处理功能包，使用 Vercel AI SDK 进行云端 AI 处理。

## 安装

```bash
bun add @memory-prosthetic/ai ai @ai-sdk/openai @ai-sdk/anthropic zod
```

## 使用

```typescript
import { processContentAi } from '@memory-prosthetic/ai'

const aiMetadata = await processContentAi(
  content,
  title,
  existingTags
)
```

## 功能

- **摘要生成** (`generateSummary`) - 自动生成内容摘要
- **标签生成** (`generateTags`) - 自动生成内容标签
- **内容分类** (`classifyContent`) - 自动分类内容类型、领域、难度等
- **关键词提取** (`extractKeywords`) - 提取内容关键词
- **主题识别** (`identifyTopics`) - 识别内容主题
- **统一处理** (`processContentAi`) - 并行处理所有 AI 任务，带限流和缓存

## 配置

使用 `getAiConfig` 和 `saveAiConfig` 管理 AI 配置（需要 Tauri 环境）。

## 依赖

- `ai` - Vercel AI SDK 核心
- `@ai-sdk/openai` - OpenAI 适配器
- `@ai-sdk/anthropic` - Anthropic 适配器
- `zod` - 结构化输出验证
- `@tauri-apps/api` (可选) - Tauri API
- `@tauri-apps/plugin-secure-store` (可选) - Tauri 安全存储
