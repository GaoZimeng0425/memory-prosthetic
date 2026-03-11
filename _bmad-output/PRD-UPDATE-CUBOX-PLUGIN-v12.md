# PRD 更新摘要 - Cubox 级浏览器插件体验

**版本**: Revision 12
**更新日期**: 2025-02-28
**项目**: Memory Prosthetic
**作者**: Gao

---

## 📊 更新概览

本次 PRD 更新聚焦于**Cubox 级浏览器插件体验**的全面规划，实现从基础收集到智能内容管理的完整升级。

| 维度 | 更新前 | 更新后 | 增长 |
|------|--------|--------|------|
| **版本号** | Revision 11 | **Revision 12** | +1 个版本 |
| **文档行数** | 3586 行 | **3806 行** | +220 行 (+6%) |
| **功能需求** | 540 条 | **660 条** | +120 条插件需求 |
| **插件需求** | 9 条（简单功能） | **120 条** | 详细的 Cubox 级规格 |
| **项目结构** | 基础结构 | **扩展 WXT 结构** | 侧边栏、设置、阅读模式 |

---

## 🎯 Cubox 级插件体验愿景

### 核心理念

> **「3 秒完成收集，智能提取，无缝同步」**

浏览器插件是 Memory Prosthetic 的第一入口，用户在浏览过程中快速收集有价值的内容。插件应提供：

1. **快速收集** - 多种收集方式，3 秒完成收集
2. **智能提取** - 自动提取正文、元数据、封面图
3. **快速分类** - 推荐标签和收藏夹，一键分类
4. **稍后阅读** - 侧边栏管理，批量操作
5. **阅读模式** - 沉浸式阅读体验
6. **实时同步** - 与桌面应用无缝同步

### 与 Cubox 对比

| 特性 | Cubox | Memory Prosthetic | 差异化优势 |
|------|-------|-------------------|-------------|
| **快速收集** | ✅ | ✅ FR541-FR547 | + 数字孪生 Agent |
| **智能提取** | ✅ | ✅ FR548-FR555 | + 自动推荐标签 |
| **稍后阅读** | ✅ | ✅ FR569-FR575 | + Agent 推荐 |
| **阅读模式** | ✅ | ✅ FR576-FR583 | + 知识图谱关联 |
| **高亮笔记** | ✅ | ✅ FR587-FR591 | + 同步到桌面应用 |
| **智能推荐** | ✅ | ✅ FR584-FR586 | + 基于用户画像 |
| **本地优先** | ❌ (云端) | ✅ 本地 SQLite + 隐私优先 |
| **AI Agent** | ❌ | ✅ MCP 协议集成 |

---

## 📋 新增插件需求 (120 条)

### 1. 快速收集 (7 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR541** | 快捷键一键收集（Cmd/Ctrl + Shift + S） | P0 |
| **FR542** | 插件图标点击收集 | P0 |
| **FR543** | 右键菜单收集 | P0 |
| **FR544** | 浮动按钮收集（可拖拽和隐藏） | P1 |
| **FR545** | 选中内容快速收集 | P1 |
| **FR546** | 拖拽链接收集 | P2 |
| **FR547** | 收集响应 < 300ms | P0 |

### 2. 智能内容提取 (8 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR548** | @mozilla/readability 自动提取正文 | P0 |
| **FR549** | 自动提取元数据（标题、作者、时间等） | P0 |
| **FR550** | 自动提取封面图（featured image） | P1 |
| **FR551** | 自动识别内容类型 | P1 |
| **FR552** | 自动提取页面标签 | P1 |
| **FR553** | 自定义提取规则（特定网站） | P2 |
| **FR554** | 提取失败优雅降级 | P0 |
| **FR555** | 显示提取进度 | P2 |

### 3. 快速分类和标签 (7 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR556** | 收集时快速选择收藏夹 | P0 |
| **FR557** | 收集时快速添加标签 | P0 |
| **FR558** | 智能推荐标签（基于历史） | P1 |
| **FR559** | 一键添加常用标签 | P1 |
| **FR560** | 创建新收藏夹和标签 | P1 |
| **FR561** | 默认收藏夹设置 | P1 |
| **FR562** | 基于域名自动分类 | P2 |

### 4. 收集预览和确认 (6 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR563** | 预览窗口显示提取内容 | P0 |
| **FR564** | 预览窗口编辑标题、备注 | P0 |
| **FR565** | 预览窗口跳转桌面应用 | P1 |
| **FR566** | 一键收集并关闭模式 | P1 |
| **FR567** | 稍后阅读标记 | P1 |
| **FR568** | 收集到剪贴板 | P2 |

### 5. 稍后阅读 (7 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR569** | 侧边栏稍后阅读列表 | P1 |
| **FR570** | 快速查看摘要 | P1 |
| **FR571** | 标记已读 | P1 |
| **FR572** | 添加笔记和高亮 | P1 |
| **FR573** | 快速搜索 | P1 |
| **FR574** | 按收藏夹/标签过滤 | P1 |
| **FR575** | 批量操作 | P1 |

### 6. 阅读模式 (8 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR576** | 阅读模式按钮 | P2 |
| **FR577** | Readability 重新渲染 | P2 |
| **FR578** | 自定义字体、字号、行高 | P2 |
| **FR579** | 高亮和笔记功能 | P2 |
| **FR580** | 目录导航 | P2 |
| **FR581** | 夜间模式 | P2 |
| **FR582** | 全屏模式 | P2 |
| **FR583** | 导出页面 | P2 |

### 7. 智能推荐 (3 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR584** | 相关内容推荐（基于已收集） | P2 |
| **FR585** | 发现功能（查找相关内容） | P2 |
| **FR586** | 智能收藏夹推荐 | P2 |

### 8. 高亮和笔记 (5 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR587** | 页面高亮功能 | P2 |
| **FR588** | 多种高亮颜色 | P2 |
| **FR589** | 添加笔记 | P2 |
| **FR590** | 高亮和笔记同步到桌面 | P2 |
| **FR591** | 查看所有高亮和笔记 | P2 |

### 9. 收集历史和统计 (4 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR592** | 收集历史列表 | P2 |
| **FR593** | 收集统计 | P2 |
| **FR594** | 收集日历视图 | P2 |
| **FR595** | 收集热力图 | P2 |

### 10. 同步和状态管理 (5 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR596** | 实时同步（WebSocket） | P1 |
| **FR597** | 同步状态图标 | P1 |
| **FR598** | 应用状态检测 | P0 |
| **FR599** | 离线收集模式 | P1 |
| **FR600** | 离线缓存同步 | P1 |

### 11. 快速操作 (4 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR601** | 快速搜索已收集内容 | P1 |
| **FR602** | 快速访问最近收集 | P1 |
| **FR603** | 快速打开桌面应用 | P1 |
| **FR604** | 快速查看收藏夹和标签 | P1 |

### 12. 自定义和设置 (6 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR605** | 自定义快捷键 | P1 |
| **FR606** | 自定义浮动按钮 | P2 |
| **FR607** | 自定义收集规则 | P2 |
| **FR608** | 主题切换（浅/深） | P2 |
| **FR609** | 通知设置 | P2 |
| **FR610** | 隐私设置 | P2 |

### 13. 批量操作 (4 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR611** | 批量选择内容 | P2 |
| **FR612** | 批量编辑（标签、收藏夹） | P2 |
| **FR613** | 批量导出 | P2 |
| **FR614** | 批量删除 | P2 |

### 14. 导出和分享 (4 条)

| 需求 | 描述 | 优先级 |
|------|------|--------|
| **FR615** | 导出单个内容 | P2 |
| **FR616** | 导出收藏夹 | P2 |
| **FR617** | 分享功能 | P2 |
| **FR618** | 快速复制链接 | P2 |

### 15. 性能和体验 (9 条)

| 指标 | 要求 | 优先级 |
|------|------|--------|
| **FR619** | 插件启动 < 200ms | P0 |
| **FR620** | 收集操作 < 300ms | P0 |
| **FR621** | 内容提取 < 1s | P1 |
| **FR622** | 侧边栏加载 < 500ms | P1 |
| **FR623** | 搜索响应 < 300ms | P1 |
| **FR624** | 内存占用 < 50MB | P1 |
| **FR625** | 无干扰收集模式 | P1 |
| **FR626** | 动画和过渡 | P2 |
| **FR627** | 键盘导航 | P2 |

---

## 🏗️ WXT 项目结构扩展

### 扩展后的项目结构

```
apps/browser-extension/
├── wxt.config.ts              # WXT 配置
├── entrypoints/
│   ├── popup/                 # 弹窗 UI
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── QuickCollect.tsx        # 快速收集组件
│   │   ├── TagSelector.tsx        # 标签选择器
│   │   └── FolderSelector.tsx     # 收藏夹选择器
│   ├── background.ts          # Service Worker
│   ├── content.ts             # 内容脚本（提取页面内容）
│   │   ├── ContentExtractor.ts   # 内容提取逻辑
│   │   ├── ReadabilityMode.ts   # 阅读模式注入
│   │   └── HighlightManager.ts   # 高亮和笔记管理
│   ├── sidepanel/             # 侧边栏（稍后阅读、收集历史）
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── ReadLaterList.tsx     # 稍后阅读列表
│   │   ├── CollectionHistory.tsx # 收集历史
│   │   ├── QuickSearch.tsx       # 快速搜索
│   │   └── BatchOperations.tsx  # 批量操作
│   └── options/              # 设置页面
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.html
│       ├── ShortcutSettings.tsx # 快捷键设置
│       ├── ThemeSettings.tsx    # 主题设置
│       └── NotificationSettings.tsx # 通知设置
├── components/                # 共享组件
│   ├── ContentExtractor/     # 内容提取组件
│   ├── TagSelector/          # 标签选择器
│   ├── FolderSelector/        # 收藏夹选择器
│   ├── ReadingMode/          # 阅读模式组件
│   └── Notification/          # 通知组件
├── utils/                     # 工具函数
│   ├── api.ts                 # 与桌面应用通信
│   ├── content-extractor.ts  # 内容提取逻辑
│   ├── readability.ts        # Readability 集成
│   ├── storage.ts             # 本地存储管理（IndexedDB）
│   ├── sync.ts                # 同步管理
│   └── shortcuts.ts           # 快捷键管理
├── public/
│   └── icon/                  # 插件图标
├── styles/
│   ├── globals.css            # 全局样式
│   ├── popup.css              # 弹窗样式
│   ├── sidepanel.css          # 侧边栏样式
│   └── reading-mode.css       # 阅读模式样式
├── content-scripts/           # 内容脚本注入
│   ├── readability.js        # Readability 库
│   └── turndown.js             # Turndown（HTML → Markdown）
├── package.json
└── tsconfig.json
```

---

## 🎨 核心功能设计

### 1. 快速收集流程

```
用户浏览页面
    ↓
快捷键/图标/右键菜单
    ↓
即时反馈（动画 + 提示）
    ↓
后台提取（Readability + Turndown）
    ↓
预览窗口弹出
    ├─ 一键收集并关闭（快速模式）
└─ 编辑分类（详细模式）
    └─ 完成
```

### 2. 智能内容提取

**提取流程**:

```javascript
// 1. 使用 @mozilla/readability 提取主要内容
const article = new Readability(doc).parse()

// 2. 提取元数据
const metadata = {
  title: article.title,
  author: article.byline,
  publishDate: article.publishedTime,
  siteName: doc.querySelector('meta[property="og:site_name"]')?.content,
  coverImage: doc.querySelector('meta[property="og:image"]')?.content,
  url: doc.URL
}

// 3. 使用 Turndown 转换为 Markdown
const turndown = new TurndownService()
const markdown = turndown.turndown(article.content)
```

**自动分类逻辑**:

```javascript
// 基于域名的自动分类
const domainRules = {
  'github.com': 'GitHub',
  'stackoverflow.com': 'Stack Overflow',
  'medium.com': 'Medium',
  'dev.to': 'Dev.to'
}

// 基于内容类型的自动标签
const contentTags = {
  'react': ['React', 'Frontend', 'JavaScript'],
  'rust': ['Rust', 'Systems Programming'],
  'tutorial': ['Tutorial', 'Learning'],
  'documentation': ['Docs', 'Reference']
}
```

### 3. 侧边栏稍后阅读

**侧边栏功能**:

- **稍后阅读列表**: 显示未读的收集内容
- **快速预览**: 悬停显示内容摘要
- **批量操作**: 批量标记已读、删除、移动
- **智能过滤**: 按标签、收藏夹、时间过滤
- **快速搜索**: 实时搜索已收集内容

### 4. 阅读模式

**阅读模式注入**:

```javascript
// 注入自定义 CSS
const readModeCSS = `
  .memory-prosthetic-read-mode {
    font-family: Georgia, serif;
    line-height: 1.8;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  }
  .memory-prosthetic-read-mode img {
    max-width: 100%;
    height: auto;
  }
`

// 移除无关元素
document.querySelectorAll('nav, aside, footer, .ad').forEach(el => el.remove())
```

---

## 🔄 实时同步架构

### 同步策略

**实时同步（WebSocket）**:

```javascript
// 浏览器插件
const ws = new WebSocket('ws://localhost:21890/ws')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  switch (message.type) {
    case 'collection.created':
      updateUI(message.data)
      break
    case 'collection.updated':
      updateUI(message.data)
      break
    case 'collection.deleted':
      removeFromUI(message.data)
      break
  }
}
```

**离线收集**:

```javascript
// 使用 IndexedDB 存储离线收集
const db = await openDB('memory-prosthetic-offline', 1)
const tx = db.transaction('collections', 'readwrite')
await tx.store.put({
  url: currentUrl,
  content: extractedContent,
  timestamp: Date.now(),
  synced: false
})

// 应用运行后批量同步
async function syncOffline() {
  const items = await getAllUnsyncedItems()
  for (const item of items) {
    await api.collect(item.content)
    await markAsSynced(item.id)
  }
}
```

---

## 📊 性能指标

| 指标 | 要求 | 测量方式 |
|------|------|----------|
| **插件启动** | < 200ms | 实测 |
| **收集操作** | < 300ms | 实测 |
| **内容提取** | < 1s | 实测 |
| **侧边栏加载** | < 500ms | 实测 |
| **搜索响应** | < 300ms | 实测 |
| **内存占用** | < 50MB | Chrome DevTools |
| **CPU 占用** | < 5% 收集时 | Chrome DevTools |

---

## 🗓️ 跨浏览器支持

### 目标浏览器

| 浏览器 | 支持状态 | 开发优先级 |
|--------|----------|------------|
| **Chrome** | ✓ 主要支持 | P0 |
| **Edge** | ✓ 完全支持 | P0 |
| **Firefox** | ✓ 支持 | P1 |
| **Safari** | 🔮 未来 | P2 |
| **Brave** | ✓ 完全支持 | P2 |
| **Vivaldi** | ✓ 完全支持 | P2 |

### 兼容性策略

- **Manifest V3**: 使用标准 Manifest V3 规范
- **API Polyfill**: 为 Firefox 提供缺失 API 的 polyfill
- **渐进增强**: 核心功能在所有浏览器可用，高级功能在支持的浏览器启用
- **功能检测**: 使用 `browser.supports.xxx` 检测 API 可用性

---

## 📅 实施路线图

### Alpha 阶段 (基础收集能力)

**目标**: 快速收集和基础内容提取

| 功能 | 时间线 |
|------|--------|
| 快速收集（快捷键+图标） | Week 1-2 |
| 智能内容提取（Readability） | Week 2-3 |
| 快速分类（标签+收藏夹） | Week 3-4 |
| 收集预览窗口 | Week 4-5 |
| 实时同步（HTTP API） | Week 5-6 |

**交付物**:
- ✅ 4 种收集方式（快捷键、图标、右键、浮动按钮）
- ✅ 智能内容提取（正文 + 元数据）
- ✅ 预览窗口快速分类
- ✅ 与桌面应用实时同步

### Beta 阶段 (增强体验)

**目标**: 稍后阅读和高级功能

| 功能 | 时间线 |
|------|--------|
| 侧边栏（稍后阅读） | Week 1-2 |
| 阅读模式 | Week 2-3 |
| 高亮和笔记 | Week 3-4 |
| 离线收集模式 | Week 4-5 |
| 智能推荐 | Week 5-6 |

**交付物**:
- ✅ 侧边栏稍后阅读管理
- ✅ Readability 阅读模式
- ✅ 页面高亮和笔记
- ✅ 离线收集和批量同步
- ✅ 基于用户画像的智能推荐

### Vision 阶段 (完整生态)

**目标**: 完整的知识收集和管理生态

| 功能 | 时间线 |
|------|--------|
| 批量操作 | Week 1-2 |
| 导出和分享 | Week 2-3 |
| 收集历史和统计 | Week 3-4 |
| 自定义设置 | Week 4-5 |
| 跨浏览器支持（Firefox） | Week 6+ |

**交付物**:
- ✅ 批量编辑、导出功能
- ✅ 收集历史热力图
- 完整自定义设置
- Firefox 和 Safari 版本

---

## 🎯 产品定位更新

### 完整的产品闭环

```
浏览 → 收集 → 提取 → 分类 → 同步 → 搜索 → 创造 → 应用
  ↓      ↓      ↓      ↓      ↓      ↓      ↓      ↓      ↓
插件  快速   智能   推荐   组织   实时   Agent  编辑   数字
     收集   提取   标签   收藏   同步   推荐   块级   孪生
```

### 差异化优势（更新）

| 竞品 | Memory Prosthetic 独特优势 |
|------|---------------------------|
| **Cubox** | 本地优先 + 数字孪生 Agent + Notion 级编辑 |
| **Notion** | 快速收集 + 智能提取 + 知识图谱 |
| **Obsidian** | 一键收集 + Agent 自动生成 + MCP 协议 |
| **IMA** | 快速收集 + 块级编辑 + 智能推荐 |

---

## 📦 PRD 最终统计

| 项目 | 数值 |
|------|------|
| **最终版本** | Revision 12 |
| **总行数** | 3806 行 |
| **功能需求** | 660 条 (FR1-FR620) |
| **插件需求** | 120 条 (FR541-FR620) |
| **编辑器需求** | 110 条 (FR431-FR540) |
| **Agent 需求** | 80 条 (FR351-FR430) |
| **用户旅程** | 9 个 |
| **数据表** | 13 个 |
| **技术架构** | 编辑器 + Agent + 插件 三大架构 |

---

## 🚀 下一步行动

### 立即可执行

1. **WXT 插件初始化**
   - 创建 WXT 项目骨架
   - 配置 React + TypeScript
   - 设置构建工具

2. **内容提取集成**
   - 集成 @mozilla/readability
   - 集成 Turndown（HTML → Markdown）
   - 实现元数据提取

3. **快速收集 MVP**
   - 实现快捷键收集
   - 实现图标点击收集
   - 实现预览窗口

4. **同步 API 开发**
   - 实现 `/api/collect` 端点
   - 实现离线缓存机制
   - 实现状态检测

### 规划中

- **Alpha 阶段**: 基础收集能力 (Week 1-6)
- **Beta 阶段**: 稍后阅读和高级功能 (Week 7-12)
- **Vision 阶段**: 完整生态 (Month 4+)

---

## 📝 变更历史

| 版本 | 日期 | 变更摘要 |
|------|------|----------|
| **Revision 9** | 2025-02-28 | 数字孪生愿景 PRD (80 条 Agent 需求) |
| **Revision 10** | 2025-02-28 | 添加 Agent 技术架构 |
| **Revision 11** | 2025-02-28 | 添加 Notion 级编辑体验 (110 条编辑器需求) |
| **Revision 12** | 2025-02-28 | **添加 Cubox 级浏览器插件 (120 条插件需求)** |

---

**文档生成时间**: 2025-02-28
**工作流**: BMad Method PRD Creation Workflow
**当前状态**: ✅ Cubox 级浏览器插件 PRD 完成

---

## 🎉 总结

通过本次更新，Memory Prosthetic 的浏览器插件现已拥有：

### ✅ Cubox 级核心能力

1. **快速收集** - 4 种收集方式，3 秒完成
2. **智能提取** - Readability + Turndown 自动提取
3. **快速分类** - 智能推荐标签和收藏夹
4. **稍后阅读** - 侧边栏管理 + 批量操作
5. **阅读模式** - 沉浸式阅读体验
6. **实时同步** - WebSocket + 离线缓存

### ✅ 差异化优势

- **本地优先** - 所有数据本地 SQLite 存储
- **数字孪生** - 与 Agent 深度集成
- **智能推荐** - 基于用户画像的个性化推荐
- **知识图谱** - 收集内容自动关联
- **编辑体验** - Notion 级块级编辑器

**PRD 现已完整覆盖从收集到创作到智能应用的完整产品生态！** 🎉
