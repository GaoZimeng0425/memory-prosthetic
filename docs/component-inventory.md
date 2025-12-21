# UI 组件清单 (Component Inventory)

**项目:** tauri-app
**UI 库:** shadcn/ui (new-york 风格)
**基色:** Slate
**图标库:** Lucide React
**生成日期:** 2025-12-21

---

## 📊 组件概览

| 类别 | 数量 |
|------|------|
| 布局组件 | 7 |
| 导航组件 | 6 |
| 表单组件 | 14 |
| 反馈组件 | 12 |
| 数据展示 | 8 |
| 工具组件 | 6 |
| **总计** | **53** |

---

## 🎨 组件详情

### 布局组件 (Layout)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Card** | `card.tsx` | 内容卡片容器 |
| **Separator** | `separator.tsx` | 分隔线 |
| **Resizable** | `resizable.tsx` | 可调整大小的面板 |
| **Scroll Area** | `scroll-area.tsx` | 自定义滚动区域 |
| **Aspect Ratio** | `aspect-ratio.tsx` | 固定宽高比容器 |
| **Collapsible** | `collapsible.tsx` | 可折叠区域 |
| **Sidebar** | `sidebar.tsx` | 侧边栏布局 |

### 导航组件 (Navigation)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Navigation Menu** | `navigation-menu.tsx` | 主导航菜单 |
| **Menubar** | `menubar.tsx` | 菜单栏 |
| **Tabs** | `tabs.tsx` | 标签页切换 |
| **Breadcrumb** | `breadcrumb.tsx` | 面包屑导航 |
| **Pagination** | `pagination.tsx` | 分页控件 |
| **Sidebar** | `sidebar.tsx` | 侧边导航 |

### 表单组件 (Form)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Button** | `button.tsx` | 按钮 (多变体) |
| **Button Group** | `button-group.tsx` | 按钮组 |
| **Input** | `input.tsx` | 文本输入框 |
| **Input Group** | `input-group.tsx` | 输入框组 |
| **Input OTP** | `input-otp.tsx` | OTP 验证码输入 |
| **Textarea** | `textarea.tsx` | 多行文本输入 |
| **Checkbox** | `checkbox.tsx` | 复选框 |
| **Radio Group** | `radio-group.tsx` | 单选按钮组 |
| **Select** | `select.tsx` | 下拉选择器 |
| **Switch** | `switch.tsx` | 开关切换 |
| **Slider** | `slider.tsx` | 滑块 |
| **Calendar** | `calendar.tsx` | 日历选择器 |
| **Form** | `form.tsx` | 表单容器 (RHF 集成) |
| **Label** | `label.tsx` | 表单标签 |
| **Field** | `field.tsx` | 表单字段 |

### 反馈组件 (Feedback)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Alert** | `alert.tsx` | 静态警告提示 |
| **Alert Dialog** | `alert-dialog.tsx` | 确认对话框 |
| **Dialog** | `dialog.tsx` | 模态对话框 |
| **Drawer** | `drawer.tsx` | 抽屉面板 |
| **Sheet** | `sheet.tsx` | 侧边抽屉 |
| **Popover** | `popover.tsx` | 弹出层 |
| **Hover Card** | `hover-card.tsx` | 悬浮卡片 |
| **Tooltip** | `tooltip.tsx` | 工具提示 |
| **Sonner** | `sonner.tsx` | Toast 通知 |
| **Progress** | `progress.tsx` | 进度条 |
| **Skeleton** | `skeleton.tsx` | 骨架屏加载 |
| **Spinner** | `spinner.tsx` | 加载指示器 |

### 数据展示组件 (Data Display)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Table** | `table.tsx` | 数据表格 |
| **Avatar** | `avatar.tsx` | 头像 |
| **Badge** | `badge.tsx` | 徽章/标签 |
| **Chart** | `chart.tsx` | 图表 (Recharts 封装) |
| **Carousel** | `carousel.tsx` | 轮播图 |
| **Accordion** | `accordion.tsx` | 手风琴展开 |
| **Empty** | `empty.tsx` | 空状态 |
| **Item** | `item.tsx` | 列表项 |

### 工具组件 (Utility)

| 组件 | 文件 | 用途 |
|------|------|------|
| **Command** | `command.tsx` | 命令面板 (⌘K) |
| **Context Menu** | `context-menu.tsx` | 右键菜单 |
| **Dropdown Menu** | `dropdown-menu.tsx` | 下拉菜单 |
| **Toggle** | `toggle.tsx` | 切换按钮 |
| **Toggle Group** | `toggle-group.tsx` | 切换按钮组 |
| **Kbd** | `kbd.tsx` | 键盘快捷键显示 |

---

## 🔧 组件使用

### 导入方式

```typescript
// 从 @/components/ui 导入
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
```

### 工具函数

```typescript
// cn() - 类名合并工具
import { cn } from '@/lib/utils'

<div className={cn('base-class', conditional && 'conditional-class')} />
```

---

## 🎯 Button 变体示例

```typescript
// 默认变体
<Button>默认</Button>

// 不同变体
<Button variant="destructive">删除</Button>
<Button variant="outline">描边</Button>
<Button variant="secondary">次要</Button>
<Button variant="ghost">幽灵</Button>
<Button variant="link">链接</Button>

// 不同尺寸
<Button size="sm">小</Button>
<Button size="default">默认</Button>
<Button size="lg">大</Button>
<Button size="icon">图标</Button>
```

---

## 📐 表单集成

### React Hook Form 集成

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">提交</Button>
      </form>
    </Form>
  )
}
```

---

## 🎨 主题定制

### CSS 变量

shadcn/ui 使用 CSS 变量进行主题定制：

```css
/* src/styles/global.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... 更多变量 */
}
```

### 暗色模式

项目已安装 `next-themes` 支持暗色模式切换。

---

## 📦 添加新组件

使用 shadcn CLI 添加新组件：

```bash
# 添加单个组件
bunx shadcn@latest add [component-name]

# 添加多个组件
bunx shadcn@latest add button card dialog

# 查看可用组件
bunx shadcn@latest add --help
```

### 可用但未安装的组件

| 组件 | 说明 |
|------|------|
| Toast | 简单通知 (可用 Sonner 替代) |
| Data Table | 高级数据表格 |
| Combobox | 可搜索下拉框 |
| Date Picker | 日期选择器 |

---

## 🔗 相关资源

- [shadcn/ui 官方文档](https://ui.shadcn.com/)
- [Radix UI 原语](https://www.radix-ui.com/)
- [Lucide 图标库](https://lucide.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
