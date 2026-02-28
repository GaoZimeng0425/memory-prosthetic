# 路由文件合并方案

## 问题分析

### 当前结构（❌ 冗余）

```
apps/desktop/src/routes/
├── __root.tsx
├── index.tsx                          // 重定向到 /all
├── all.tsx                            // 全部列表
├── all.article.$articleId.tsx         # ❌ 重复代码
├── starred.tsx                        // 星标列表
├── starred.article.$articleId.tsx     # ❌ 重复代码
├── recent.tsx                         // 最近列表
├── recent.article.$articleId.tsx      # ❌ 重复代码
├── archived.tsx                       // 已归档列表
├── archived.article.$articleId.tsx    # ❌ 重复代码
├── deleted.tsx                        // 已删除列表
├── deleted.article.$articleId.tsx     # ❌ 重复代码
├── favorite.$favoriteId.tsx           # 收藏夹列表
├── favorite.$favoriteId.article.$articleId.tsx  # ❌ 重复代码
├── tag.$tagId.tsx                     # 标签列表
└── tag.$tagId.article.$articleId.tsx  # ❌ 重复代码
```

**问题：**
- 8 个几乎相同的 `*.article.$articleId.tsx` 文件
- 代码重复，维护成本高
- 修改一处需要修改 8 处

### 代码重复示例

```typescript
// all.article.$articleId.tsx
export const Route = createFileRoute('/all/article/$articleId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { articleId } = Route.useParams()
  return <ArticleReader articleId={Number(articleId)} filterType="all" />
}

// starred.article.$articleId.tsx
export const Route = createFileRoute('/starred/article/$articleId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { articleId } = Route.useParams()
  return <ArticleReader articleId={Number(articleId)} filterType="starred" />
}

// ... 其他 6 个文件完全类似
```

---

## 修复方案

### 方案 A: 使用路由布局（推荐）

TanStack Router 支持路由布局，可以让子路由继承父路由的逻辑。

```
routes/
├── __root.tsx
├── index.tsx                          // 重定向
│
├── $filter/                           # ✅ 路由布局
│   ├── __root.tsx                     # ✅ 统一的列表页布局
│   ├── index.tsx                      # /all
│   ├── starred.tsx                    # /starred
│   ├── recent.tsx                     # /recent
│   ├── archived.tsx                   # /archived
│   └── deleted.tsx                    # /deleted
│
├── $filtered/                         # ✅ 带 ID 过滤的路由布局
│   ├── __root.tsx                     # ✅ 统一的详情页布局
│   ├── $id.tsx                        # /favorite/:id 或 /tag/:id
│   └── $id.article.$articleId.tsx     # ✅ 统一的详情页
```

#### 实现

```typescript
// routes/$filter/__root.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

type FilterType = 'all' | 'starred' | 'recent' | 'archived' | 'deleted'

export const Route = createFileRoute('/$filter/')({
  component: FilterLayout,
  // ✅ 参数验证
  validateSearch: (search: Record<string, unknown>) => {
    return {
      page: Number(search.page ?? 1),
      limit: Number(search.limit ?? 50),
    }
  },
})

function FilterLayout() {
  const { filter } = Route.useParams()
  const filters: FilterType[] = ['all', 'starred', 'recent', 'archived', 'deleted']

  // ✅ 验证 filter 参数
  if (!filters.includes(filter as FilterType)) {
    throw redirect({ to: '/all' })
  }

  return <Outlet />
}

// routes/$filter/index.tsx
export const Route = createFileRoute('/$filter_/index')({
  component: AllArticlesPage,
})

function AllArticlesPage() {
  const { filter } = Route.useParams()
  const { page, limit } = Route.useSearch()

  let params: GetCollectionsParams = { limit, offset: (page - 1) * limit }

  switch (filter) {
    case 'starred':
      // 只显示星标
      break
    case 'recent':
      // 按时间排序
      break
    case 'archived':
      params.status = 'archived'
      break
    case 'deleted':
      params.status = 'deleted'
      break
  }

  const { collections, isLoading } = useCollections(params)

  return <ArticlesList collections={collections} isLoading={isLoading} />
}

// routes/$filter.article.$articleId.tsx  ✅ 一个文件处理所有情况！
export const Route = createFileRoute('/$filter/article/$articleId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { filter, articleId } = Route.useParams()

  return (
    <ArticleReader
      articleId={Number(articleId)}
      filterType={filter as FilterType}
      backLink={`/${filter}`}
    />
  )
}
```

```typescript
// routes/$filtered/__root.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$filtered/')({
  component: FilteredLayout,
})

function FilteredLayout() {
  const { filtered } = Route.useParams()
  const validTypes = ['favorite', 'tag']

  if (!validTypes.includes(filtered)) {
    throw redirect({ to: '/all' })
  }

  return <Outlet />
}

// routes/$filtered/$id.tsx
export const Route = createFileRoute('/$filtered/$id')({
  component: FilteredListPage,
})

function FilteredListPage() {
  const { filtered, id } = Route.useParams()
  const numId = Number(id)

  const params: GetCollectionsParams = {}

  if (filtered === 'favorite') {
    params.favoriteId = numId
  } else if (filtered === 'tag') {
    params.tagIds = [numId]
  }

  const { collections, isLoading } = useCollections(params)

  return <ArticlesList collections={collections} isLoading={isLoading} />
}

// routes/$filtered/$id.article.$articleId.tsx  ✅ 同一个文件！
export const Route = createFileRoute('/$filtered/$id/article/$articleId')({
  component: FilteredArticleDetailPage,
})

function FilteredArticleDetailPage() {
  const { filtered, id, articleId } = Route.useParams()

  return (
    <ArticleReader
      articleId={Number(articleId)}
      filterType={filtered as 'favorite' | 'tag'}
      filterId={Number(id)}
      backLink={`/${filtered}/${id}`}
    />
  )
}
```

**优点：**
- ✅ 减少文件数量：16 个 → 9 个（减少 44%）
- ✅ 代码复用：详情页只需一个文件
- ✅ 类型安全：`filter` 和 `filtered` 参数有类型约束
- ✅ 统一逻辑：所有列表页共享布局

---

### 方案 B: 使用通配符路由（更激进）

```
routes/
├── __root.tsx
├── index.tsx
├── $view.tsx                           # ✅ all | starred | recent | archived | deleted
├── $view.article.$articleId.tsx        # ✅ 统一详情页
├── $filterType.$filterId.tsx           # ✅ favorite/:id | tag/:id
└── $filterType.$filterId.article.$articleId.tsx  # ✅ 统一详情页
```

```typescript
// routes/$view.tsx
export const Route = createFileRoute('/$view')({
  component: ViewPage,
})

function ViewPage() {
  const { view } = Route.useParams()

  // 根据 view 参数渲染不同内容
  switch (view) {
    case 'all':
      return <AllArticlesPage />
    case 'starred':
      return <StarredArticlesPage />
    case 'recent':
      return <RecentArticlesPage />
    case 'archived':
      return <ArchivedArticlesPage />
    case 'deleted':
      return <DeletedArticlesPage />
    default:
      throw redirect({ to: '/all' })
  }
}

// routes/$view.article.$articleId.tsx  ✅ 一个文件处理所有！
export const Route = createFileRoute('/$view/article/$articleId')({
  component: ArticleDetailPage,
})

function ArticleDetailPage() {
  const { view, articleId } = Route.useParams()

  return <ArticleReader articleId={Number(articleId)} view={view} />
}
```

**优点：**
- ✅ 文件更少（8 个文件）
- ✅ 代码更集中

**缺点：**
- ⚠️ 路径参数语义化较差（`$view` 不如 `$filter`）
- ⚠️ switch 语句维护

---

### 方案 C: 使用 Route Groups（TanStack Router 特性）

```
routes/
├── __root.tsx
├── index.tsx
│
├── (simple)/                          # Route Group
│   ├── __root.tsx
│   ├── all.tsx
│   ├── starred.tsx
│   ├── recent.tsx
│   ├── archived.tsx
│   ├── deleted.tsx
│   └── article.$articleId.tsx         # ✅ 共享的详情页
│
└── (filtered)/                        # Route Group
    ├── __root.tsx
    ├── favorite.$favoriteId.tsx
    ├── tag.$tagId.tsx
    └── $id.article.$articleId.tsx     # ✅ 共享的详情页
```

```typescript
// routes/(simple)/article.$articleId.tsx
export const Route = createFileRoute('/(simple)/article/$articleId')({
  component: SimpleArticleDetailPage,
})

function SimpleArticleDetailPage() {
  const { articleId } = Route.useParams()

  // 从路径推断类型
  const pathname = window.location.pathname
  const filterType: FilterType = pathname.split('/')[1] as FilterType

  return <ArticleReader articleId={Number(articleId)} filterType={filterType} />
}
```

**注意：** Route Groups 在 TanStack Router 中是实验性功能，语法可能变化。

---

## 迁移步骤

### 第一步：备份现有路由

```bash
cp -r apps/desktop/src/routes apps/desktop/src/routes.backup
```

### 第二步：创建新的路由结构

```bash
mkdir -p apps/desktop/src/routes/\$filter
mkdir -p apps/desktop/src/routes/\$filtered
```

### 第三步：迁移路由文件

```bash
# 列表页（保持不变）
# all.tsx, starred.tsx, recent.tsx 等

# 删除重复的详情页
rm routes/all.article.$articleId.tsx
rm routes/starred.article.$articleId.tsx
rm routes/recent.article.$articleId.tsx
# ...

# 创建新的统一详情页
# routes/$filter.article.$articleId.tsx
```

### 第四步：更新导航链接

```typescript
// ❌ 之前
<Link to="/all/article/123" />

// ✅ 之后（保持不变，路由自动匹配）
<Link to="/all/article/123" />
```

### 第五步：测试所有路由

```bash
# 测试脚本
npm run test:routes
```

测试清单：
- [ ] /all → 列表页
- [ ] /all/article/123 → 详情页
- [ ] /starred → 列表页
- [ ] /starred/article/123 → 详情页
- [ ] /favorite/1 → 收藏夹列表
- [ ] /favorite/1/article/123 → 详情页
- [ ] /tag/1 → 标签列表
- [ ] /tag/1/article/123 → 详情页

---

## 对比总结

| 维度 | 当前结构 | 方案 A（路由布局） | 方案 B（通配符） | 方案 C（Route Groups） |
|------|---------|------------------|----------------|----------------------|
| 文件数量 | 16 | 9 | 8 | 10 |
| 代码重复 | 高 | 低 | 低 | 低 |
| 类型安全 | ✅ | ✅ | ⚠️ | ✅ |
| 可维护性 | ❌ | ✅ | ⚠️ | ✅ |
| 语义化 | ✅ | ✅ | ⚠️ | ✅ |
| 稳定性 | ✅ | ✅ | ✅ | ⚠️（实验性） |

---

## 建议

✅ **推荐方案 A（路由布局）**

**理由：**
1. 类型安全（参数验证）
2. 语义清晰（`$filter` vs `$view`）
3. 代码复用多
4. 稳定可靠（非实验性功能）

**实施步骤：**
1. 创建 `$filter` 和 `$filtered` 布局（1 小时）
2. 迁移现有路由到新结构（1 小时）
3. 测试所有路由（0.5 小时）
4. 清理旧文件（0.5 小时）

**总计：3 小时**
