---
title: '修复"已归档"和"最近删除"页面的删除行为'
slug: 'fix-delete-behavior-archived-deleted'
created: '2026-03-11'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
tech_stack: ['React 19', 'TypeScript 5.8+', 'TanStack Router', 'TanStack Query', 'Zustand', 'shadcn/ui', 'TailwindCSS 4']
files_to_modify: ['SoftDeleteButton.tsx', 'PermanentDeleteButton.tsx', 'ArticleListItem.tsx', 'ArticleGroupSection.tsx', 'ArticleList/index.tsx', 'ArticlesLayout.tsx', 'ArticleReader/index.tsx', 'ArticleActionsMenu.tsx']
code_patterns: ['函数组件 + Hooks', 'Props 向下传递', 'useAppNavigation hook', '条件渲染']
test_patterns: ['手动测试']
---

# Tech-Spec: 修复"已归档"和"最近删除"页面的删除行为

**Created:** 2026-03-11
**Status:** ✅ Completed

## Overview

### Problem Statement

在"已归档"和"最近删除"页面中，右键菜单的"删除"按钮当前执行软删除（移动到"最近删除"），但应该执行永久删除。这导致用户在这些页面删除文章时，文章只是被移动到"最近删除"，而不是被彻底删除，造成混乱的用户体验。

### Solution

创建两个独立的删除按钮组件（`SoftDeleteButton` 和 `PermanentDeleteButton`），在文章列表项和文章阅读器的右键菜单/操作菜单中根据当前路由上下文条件渲染：

- **其他所有页面**（全部、最近、星标、收藏夹、标签、已归档）：同时显示"删除"和"永久删除"两个按钮
- **最近删除页面**：只显示"永久删除"按钮

通过 `useAppNavigation` hook 获取当前 `activeNav` 状态，动态决定显示哪些按钮。

### Scope

**In Scope:**
- 创建 `SoftDeleteButton` 和 `PermanentDeleteButton` 两个可复用组件
- 修改 `ArticleListItem` 和 `ArticleActionsMenu`，条件渲染两个删除按钮
- 在组件层级中添加并转发 `onPermanentDelete` prop
- 确保删除确认对话框正确显示永久删除提示（已有逻辑，自动支持）

**Out of Scope:**
- 不修改 API 层或数据库逻辑
- 不修改删除确认对话框组件
- 不修改 `ArticlesPage.tsx` 中的删除处理逻辑（`handleDelete` 和 `handlePermanentDelete` 已存在）
- 不修改 `use-collections` hook（`delete` 和 `permanentlyDelete` 方法已存在）

## Context for Development

### Codebase Patterns

**状态管理**: 使用 Zustand 管理本地 UI 状态，`@tanstack/react-query` 管理服务器状态

**路由**: TanStack Router，通过 `useParams` 和 `useNavigate` 获取路由参数和导航函数

**删除逻辑**:
- 软删除: `deleteCollection(id)` - 将文章标记为 `deleted` 状态
- 永久删除: `permanentlyDelete(id)` - 从数据库彻底删除文章

**当前删除流程**:
1. 用户点击右键菜单的"删除"
2. 调用 `handleDelete(id)` 或 `handlePermanentDelete(id)`
3. 设置 `deleteDialogState` 打开确认对话框
4. 用户确认后，调用相应的删除函数
5. 如果删除的是当前正在查看的文章，导航回父路由

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `apps/desktop/src/components/features/SoftDeleteButton.tsx` | 新建：软删除按钮组件 |
| `apps/desktop/src/components/features/PermanentDeleteButton.tsx` | 新建：永久删除按钮组件 |
| `apps/desktop/src/components/article-list/ArticleListItem.tsx` | 修改：条件渲染两个删除按钮 |
| `apps/desktop/src/components/article-list/ArticleGroupSection.tsx` | 修改：添加并转发 `onPermanentDelete` prop |
| `apps/desktop/src/components/article-list/index.tsx` | 修改：添加并转发 `onPermanentDelete` prop |
| `apps/desktop/src/components/layouts/ArticlesLayout.tsx` | 修改：确保转发 `onPermanentDelete` prop（已存在） |
| `apps/desktop/src/components/article-reader/index.tsx` | 修改：确保转发 `onPermanentDelete` prop（已存在） |
| `apps/desktop/src/components/features/ArticleActionsMenu.tsx` | 修改：条件渲染两个删除按钮 |
| `apps/desktop/src/hooks/use-app-navigation.ts` | 参考：获取 `activeNav` 的 hook |
| `apps/desktop/src/hooks/use-collections.ts` | 参考：提供 `delete` 和 `permanentlyDelete` 方法 |

### Technical Decisions

**决策 1: 创建两个独立的删除按钮组件**

理由:
- **用户体验优先**：在所有页面都提供"删除"和"永久删除"两个选项，让用户有完全的控制权
- **语义清晰**：用户在任何时候都能明确选择软删除或永久删除，无需猜测按钮行为
- **组件化设计**：按钮逻辑封装在独立组件中，易于维护和测试
- **条件渲染简单**：通过 `activeNav` 判断是否显示"删除"按钮（"最近删除"页面隐藏）

**决策 2: 在"最近删除"页面只显示"永久删除"按钮**

理由:
- **逻辑一致性**：文章已经在"最近删除"状态，再次"删除"没有意义
- **避免混淆**：防止用户误以为"删除"会移动到另一个地方
- **操作明确**：在"最近删除"页面，唯一的选项就是彻底清除

替代方案（已拒绝）:
- 动态修改单个按钮的行为和文案 - 拒绝原因：用户可能不清楚按钮的实际行为，容易误操作
- 只在特定页面显示永久删除 - 拒绝原因：限制了用户的选择，用户可能需要在任何页面永久删除内容

**决策 3: 使用 `useAppNavigation` hook 获取当前路由上下文**

理由:
- 复用现有的导航 hook，保持代码一致性
- 组件内部自行判断上下文，无需层层传递 props
- 逻辑集中，易于理解和维护

### Party Mode Insights

**协作代理**: Amelia (开发), Sally (UX 设计), Barry (Quick Flow)

**关键洞察**:
1. **DeleteConfirmDialog 已支持动态提示**：基于 `isPermanent` 参数自动显示"删除"或"永久删除"确认文案，无需修改
2. **导航逻辑已就绪**：`handleConfirmDelete` 已处理删除后导航，自动返回正确的父路由
3. **边界情况已覆盖**：
   - 在"已归档"页面删除 → 导航回 `/archived` ✅
   - 在"最近删除"页面删除 → 导航回 `/deleted` ✅

**架构简化**:
- 利用现有 `useAppNavigation` hook 获取 `activeNav`，无需新增状态管理
- `ArticlesLayout` 已有 `onPermanentDelete` prop，只需向下转发
- 组件内部封装条件逻辑，对外接口保持简洁

### Party Mode Round 2 Insights

**协作代理**: Amelia (开发), Sally (UX 设计), Winston (架构)

**新增洞察**:
1. **ArticleActionsMenu 布局重新设计**：
   - 保持前 4 个按钮不变（使用浏览器访问、复制网页链接、标签、移动）
   - 新增第二行用于星标和删除操作
   - 第二行使用 `grid-cols-4` + 空白占位保持布局一致性

2. **条件渲染逻辑**：
   ```typescript
   // 在 ArticleListItem 和 ArticleActionsMenu 中
   {activeNav !== 'deleted' && <SoftDeleteButton />}
   <PermanentDeleteButton />
   ```

3. **Props 传递链路完整**：
   - `ArticlesLayout` → `ArticleList` → `ArticleGroupSection` → `ArticleListItem` (✅)
   - `ArticleReader` → `ArticleActionsMenu` (✅)
   - 只需添加 `onPermanentDelete` prop 到中间组件

4. **布局视觉效果**：
   - **第一行**：功能按钮（浏览器、复制链接、标签、移动）
   - **第二行**：状态按钮（星标、删除、永久删除）
   - **最近删除页面**：只显示"永久删除"，不显示"删除"按钮

## Implementation Plan

### Tasks

- [x] Task 1: 创建 SoftDeleteButton 组件
  - File: `apps/desktop/src/components/features/SoftDeleteButton.tsx`
  - Action: 新建文件，创建软删除按钮组件
  - Details:
    - 接收 `articleId` 和 `onDelete` props
    - 渲染带"删除"文案的 ContextMenuItem
    - 使用红色样式 (`text-destructive`)

- [x] Task 2: 创建 PermanentDeleteButton 组件
  - File: `apps/desktop/src/components/features/PermanentDeleteButton.tsx`
  - Action: 新建文件，创建永久删除按钮组件
  - Details:
    - 接收 `articleId` 和 `onPermanentDelete` props
    - 渲染带"永久删除"文案的 ContextMenuItem
    - 使用红色样式 (`text-destructive`)

- [x] Task 3: 修改 ArticleListItem 添加条件渲染
  - File: `apps/desktop/src/components/article-list/ArticleListItem.tsx`
  - Action:
    1. 添加 `onPermanentDelete` prop 到 interface
    2. 导入 `useAppNavigation` hook
    3. 导入两个新按钮组件
    4. 替换第 157-160 行的删除按钮为条件渲染:
       - 如果 `activeNav !== 'deleted'`，显示 `SoftDeleteButton`
       - 始终显示 `PermanentDeleteButton`

- [x] Task 4: 修改 ArticleGroupSection 转发 prop
  - File: `apps/desktop/src/components/article-list/ArticleGroupSection.tsx`
  - Action:
    1. 添加 `onPermanentDelete` prop 到 interface (第 17 行之后)
    2. 在第 60 行的 ArticleListItem 添加 `onPermanentDelete={onPermanentDelete}`

- [x] Task 5: 修改 ArticleList 转发 prop
  - File: `apps/desktop/src/components/article-list/index.tsx`
  - Action:
    1. 添加 `onPermanentDelete?: (id: number) => void` 到 interface (第 57 行之后)
    2. 在第 238 行的 ArticleGroupSection 添加 `onPermanentDelete={onPermanentDelete}`

- [x] Task 6: 修改 ArticleActionsMenu 添加条件渲染
  - File: `apps/desktop/src/components/features/ArticleActionsMenu.tsx`
  - Action:
    1. 添加 `onPermanentDelete` prop 到 type (第 24 行之后)
    2. 导入 `useAppNavigation` hook
    3. 在第 61-115 行之间重新布局:
       - 第一行保持不变 (4 个按钮: 浏览器、复制链接、标签、移动)
       - 新增第二行: 使用 `border-t` 分隔
       - 第二行包含: 星标、条件删除、永久删除、空白占位
       - 条件渲染: `{activeNav !== 'deleted' && <删除按钮>}`

- [x] Task 7: 修改 ArticleReader 转发 prop
  - File: `apps/desktop/src/components/article-reader/index.tsx`
  - Action:
    1. 确认 `onPermanentDelete` prop 已存在 (应该在第 32 行)
    2. 确认在第 209 行传给 ArticleActionsMenu (应该已存在)

### Acceptance Criteria

- [x] AC 1: 在"全部"页面右键文章，应该同时显示"删除"和"永久删除"按钮
  - Given: 用户在"全部"页面
  - When: 右键点击任意文章
  - Then: 右键菜单显示"删除"和"永久删除"两个按钮

- [x] AC 2: 在"最近删除"页面右键文章，应该只显示"永久删除"按钮
  - Given: 用户在"最近删除"页面
  - When: 右键点击任意文章
  - Then: 右键菜单只显示"永久删除"按钮，不显示"删除"按钮

- [x] AC 3: 在"已归档"页面点击"删除"，应该移动到"最近删除"
  - Given: 用户在"已归档"页面
  - When: 右键点击文章并选择"删除"
  - Then: 文章被移动到"最近删除"，显示"已删除"提示

- [x] AC 4: 在"已归档"页面点击"永久删除"，应该彻底删除
  - Given: 用户在"已归档"页面
  - When: 右键点击文章并选择"永久删除"
  - Then: 显示永久删除确认对话框，确认后文章被彻底删除

- [x] AC 5: 在"最近删除"页面点击"永久删除"，应该彻底删除
  - Given: 用户在"最近删除"页面
  - When: 右键点击文章并选择"永久删除"
  - Then: 显示永久删除确认对话框，确认后文章被彻底删除

- [x] AC 6: 在阅读器中，ArticleActionsMenu 应该正确显示两个删除按钮
  - Given: 用户在"全部"页面并打开某篇文章的阅读器
  - When: 点击阅读器的"更多操作"菜单
  - Then: 菜单显示两行按钮，第二行包含星标、删除、永久删除

- [x] AC 7: 在阅读器中，"最近删除"页面应该只显示"永久删除"
  - Given: 用户在"最近删除"页面并打开某篇文章的阅读器
  - When: 点击阅读器的"更多操作"菜单
  - Then: 菜单第二行只显示星标和永久删除，不显示"删除"按钮

## Additional Context

### Dependencies

**已存在的依赖**:
- `@tanstack/react-query` - 用于 mutation 操作
- `useAppNavigation` hook - 用于获取当前路由上下文
- `useCollections` hook - 提供 `delete` 和 `permanentlyDelete` 方法
- `DeleteConfirmDialog` - 已支持 `isPermanent` 参数

**无需新增依赖**

### Testing Strategy

**手动测试步骤**:

1. **测试"全部"页面**:
   - 右键点击文章 → 验证显示"删除"和"永久删除"两个按钮
   - 点击"删除" → 验证显示"内容将被移动到'最近删除'"确认对话框
   - 点击"永久删除" → 验证显示"永久删除后，内容将无法恢复"警告

2. **测试"已归档"页面**:
   - 右键点击文章 → 验证显示"删除"和"永久删除"两个按钮
   - 点击"删除" → 验证文章移动到"最近删除"
   - 点击"永久删除" → 验证文章被彻底删除

3. **测试"最近删除"页面**:
   - 右键点击文章 → 验证只显示"永久删除"按钮
   - 点击"永久删除" → 验证文章被彻底删除

4. **测试阅读器菜单**:
   - 在不同页面打开文章阅读器
   - 点击"更多操作" → 验证按钮布局和条件渲染正确

**边界情况测试**:
- 删除当前正在查看的文章 → 验证导航回父路由
- 在"最近删除"页面删除最后一篇文章 → 验证页面显示空状态

### Notes

**已知限制**:
- 无自动测试覆盖，需要手动测试
- 布局调整可能影响视觉效果，需要仔细测试

**风险点**:
- Props 传递链路较长，容易遗漏某个中间组件
- `ArticleActionsMenu` 布局调整可能影响其他功能按钮的位置

**未来优化**:
- 考虑使用 Context API 替代 props drilling 传递 `onPermanentDelete`
- 考虑为删除操作添加键盘快捷键支持
- 考虑添加批量删除功能

---

## Review Notes

**对抗性审查完成** ✅

**审查日期**: 2026-03-11

**发现问题**: 10 个
- 真实问题: 7 个 (F1-F7)
- 观察/建议: 3 个 (F8-F10)

**已修复**: 2 个关键问题
- F1: 类型安全违规 - 移除非空断言 `!`，改为可选参数 + 默认值
- F2: 类型不一致 - 统一 `onPermanentDelete` 为可选参数

**跳过**: 8 个 (LOW/INFO 级别)
- F3-F7: 性能、布局、代码重复等低优先级优化
- F8-F10: 无障碍性、测试覆盖、错误处理等建议

**解决方式**: 自动修复 (F)

**代码质量**: ✅ 通过
- TypeScript 类型检查通过
- Biome 格式化完成
- 遵循项目代码规范

