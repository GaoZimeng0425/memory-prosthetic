# 组件清单 (Component Inventory)

**项目:** Memory Prosthetic
**更新日期:** 2025-12-22
**组件总数:** 56 个 shadcn/ui 组件 + 6 个自定义组件

---

## 📦 共享 UI 组件库 (@memory-prosthetic/ui)

位置: `packages/ui/src/components/ui/`

### 基础组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Button | `button.tsx` | 按钮组件，支持多种变体 |
| Button Group | `button-group.tsx` | 按钮组 |
| Input | `input.tsx` | 输入框 |
| Input Group | `input-group.tsx` | 输入框组 |
| Textarea | `textarea.tsx` | 多行文本输入 |
| Label | `label.tsx` | 表单标签 |
| Checkbox | `checkbox.tsx` | 复选框 |
| Radio Group | `radio-group.tsx` | 单选组 |
| Switch | `switch.tsx` | 开关 |
| Slider | `slider.tsx` | 滑块 |
| Select | `select.tsx` | 下拉选择 |

### 布局组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Card | `card.tsx` | 卡片容器 |
| Separator | `separator.tsx` | 分隔线 |
| Scroll Area | `scroll-area.tsx` | 滚动区域 |
| Resizable | `resizable.tsx` | 可调整大小面板 |
| Aspect Ratio | `aspect-ratio.tsx` | 宽高比容器 |
| Sidebar | `sidebar.tsx` | 侧边栏 |

### 导航组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Tabs | `tabs.tsx` | 标签页 |
| Navigation Menu | `navigation-menu.tsx` | 导航菜单 |
| Breadcrumb | `breadcrumb.tsx` | 面包屑 |
| Pagination | `pagination.tsx` | 分页 |
| Menubar | `menubar.tsx` | 菜单栏 |

### 反馈组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Alert | `alert.tsx` | 警告提示 |
| Alert Dialog | `alert-dialog.tsx` | 确认对话框 |
| Dialog | `dialog.tsx` | 对话框 |
| Drawer | `drawer.tsx` | 抽屉 |
| Sheet | `sheet.tsx` | 侧边抽屉 |
| Sonner | `sonner.tsx` | Toast 通知 |
| Progress | `progress.tsx` | 进度条 |
| Skeleton | `skeleton.tsx` | 骨架屏 |
| Spinner | `spinner.tsx` | 加载指示器 |

### 数据展示

| 组件 | 文件 | 说明 |
|------|------|------|
| Table | `table.tsx` | 表格 |
| Badge | `badge.tsx` | 徽章 |
| Avatar | `avatar.tsx` | 头像 |
| Tooltip | `tooltip.tsx` | 工具提示 |
| Hover Card | `hover-card.tsx` | 悬停卡片 |
| Popover | `popover.tsx` | 弹出框 |
| Chart | `chart.tsx` | 图表 (Recharts) |
| Calendar | `calendar.tsx` | 日历 |
| Carousel | `carousel.tsx` | 轮播 |

### 表单组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Form | `form.tsx` | 表单 (react-hook-form) |
| Field | `field.tsx` | 表单字段 |
| Input OTP | `input-otp.tsx` | OTP 输入 |

### 交互组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Command | `command.tsx` | 命令面板 (cmdk) |
| Context Menu | `context-menu.tsx` | 右键菜单 |
| Dropdown Menu | `dropdown-menu.tsx` | 下拉菜单 |
| Collapsible | `collapsible.tsx` | 可折叠 |
| Accordion | `accordion.tsx` | 手风琴 |
| Toggle | `toggle.tsx` | 切换按钮 |
| Toggle Group | `toggle-group.tsx` | 切换按钮组 |

### 其他组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Empty | `empty.tsx` | 空状态 |
| Item | `item.tsx` | 列表项 |
| Kbd | `kbd.tsx` | 键盘快捷键显示 |

---

## 🎨 Desktop 应用自定义组件

位置: `apps/desktop/src/components/`

| 组件 | 文件 | 说明 |
|------|------|------|
| SearchBar | `SearchBar.tsx` | 搜索栏 (172 行) |
| SearchResults | `SearchResults.tsx` | 搜索结果列表 |
| CollectionList | `CollectionList.tsx` | 收集内容列表 |
| CollectionDetail | `CollectionDetail.tsx` | 内容详情 |
| SettingsPanel | `SettingsPanel.tsx` | 设置面板 |
| EmptyState | `EmptyState.tsx` | 空状态 |

### SearchBar 组件详情

```tsx
// apps/desktop/src/components/SearchBar.tsx
// 核心搜索组件，支持:
// - 全局快捷键唤起
// - 实时搜索
// - 键盘导航
// - 搜索结果预览

type SearchBarProps = {
  onSearch: (query: string) => void
  isLoading?: boolean
}
```

---

## 🧩 Browser Extension 组件

位置: `apps/browser-extension/src/`

### 入口组件

| 组件 | 文件 | 说明 |
|------|------|------|
| Popup App | `entrypoints/popup/App.tsx` | 弹窗主组件 (155 行) |

### Popup App 组件详情

```tsx
// apps/browser-extension/src/entrypoints/popup/App.tsx
// 浏览器插件弹窗，包含:
// - 连接状态检测
// - 一键收集按钮
// - 收集确认反馈
// - 错误提示
```

---

## 🔧 Hooks

### Desktop Hooks

| Hook | 文件 | 说明 |
|------|------|------|
| useSearch | `hooks/use-search.ts` | 搜索逻辑 |
| useCollections | `hooks/use-collections.ts` | 收集列表管理 (59 行) |

### Browser Extension Hooks

| Hook | 文件 | 说明 |
|------|------|------|
| useCollect | `hooks/use-collect.ts` | 收集逻辑 (131 行) |
| useConnection | `hooks/use-connection.ts` | 连接检测 |

### UI Hooks

| Hook | 文件 | 说明 |
|------|------|------|
| useMobile | `hooks/use-mobile.ts` | 移动端检测 |

---

## 📊 组件统计

| 类别 | 数量 |
|------|------|
| **shadcn/ui 基础组件** | 56 |
| **Desktop 自定义组件** | 6 |
| **Extension 组件** | 1 |
| **自定义 Hooks** | 5 |
| **总计** | 68 |

---

## 🎯 核心组件使用示例

### 使用 shadcn/ui 组件

```tsx
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Command,
  CommandInput,
  CommandList,
  CommandItem
} from '@memory-prosthetic/ui'

const SearchDialog = () => {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>搜索</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="输入关键词..." />
          <CommandList>
            <CommandItem>结果 1</CommandItem>
            <CommandItem>结果 2</CommandItem>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
```

### 使用自定义 Hooks

```tsx
import { useSearch } from '@/hooks/use-search'
import { useCollections } from '@/hooks/use-collections'

const SearchPage = () => {
  const { search, results, isLoading } = useSearch()
  const { collections, deleteCollection } = useCollections()

  return (
    <div>
      <SearchBar onSearch={search} isLoading={isLoading} />
      <SearchResults results={results} />
    </div>
  )
}
```

---

## 📁 组件路径别名

| 别名 | 路径 | 说明 |
|------|------|------|
| `@memory-prosthetic/ui` | `packages/ui/src` | UI 组件库 |
| `@memory-prosthetic/shared` | `packages/shared/src` | 共享类型 |
| `@/` | `apps/*/src/` | 应用内部路径 |

---

*本文档由 BMAD Document Project Workflow 自动生成*
