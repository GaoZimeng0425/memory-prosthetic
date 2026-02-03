# Hook 选择指南

> 帮助开发者选择正确的 Hook 进行数据获取

## 快速决策树

你需要什么？

```
你需要什么？
├─ 显示侧边栏收藏列表？
│  └─ → useSidebarSync()
├─ 显示主内容区文章列表？
│  └─ → useCollections(params)
├─ 执行 mutation 操作(归档、删除、星标)？
│  └─ → useCollections() (仅 mutations)
└─ 显示全局统计数据？
   └─ → useSidebarSync().stats
```

## 概念说明

### 核心概念

- **Collection(收藏内容)**: 单个文章/网页,包含 URL、标题、内容
- **Favorite(收藏夹)**: 文件夹,包含多个 Collection
- **useCollections**: 管理 Collection 列表 + mutations
- **useSidebarSync**: 获取 Favorite 列表 + 统计数据

### Hook 对比

| 特性 | useSidebarSync | useCollections |
|------|----------------|----------------|
| **用途** | 侧边栏数据 | 主内容区数据 |
| **返回数据** | Favorite[], Stats | CollectionListItem[], Stats, Mutations |
| **轮询间隔** | 5秒 | 5秒 |
| **Query Key** | `['sidebar-sync']` | `['collections']` |
| **Mutation 操作** | ❌ 无 | ✅ 7个 mutations |
| **性能优化** | ✅ 单次请求 | ❌ 双轮询(旧实现) |

## 使用场景

### ✅ 使用 useSidebarSync

**场景**: 侧边栏显示收藏夹列表和统计数据

```tsx
import { useSidebarSync } from '@/hooks/use-sidebar-sync'

function Sidebar() {
  const { favorites, stats, isLoading } = useSidebarSync()

  return (
    <div>
      {/* 收藏夹列表 */}
      {favorites.map(fav => (
        <FavoriteItem key={fav.id} name={fav.name} count={fav.count} />
      ))}

      {/* 统计数据 */}
      <Stats total={stats.total} starred={stats.starred} />
    </div>
  )
}
```

**返回值**:
```typescript
{
  favorites: FavoriteWithCount[]  // 收藏夹列表,每个包含 count
  stats: SyncStats                 // 全局统计
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}
```

### ✅ 使用 useCollections

**场景 1**: 主内容区显示文章列表

```tsx
import { useCollections } from '@/hooks/use-collections'

function ArticlesPage({ favoriteId }: { favoriteId: number }) {
  const { collections, isLoading } = useCollections({
    favoriteId,
    status: 'active'
  })

  return (
    <div>
      {collections.map(article => (
        <ArticleItem key={article.id} title={article.title} />
      ))}
    </div>
  )
}
```

**场景 2**: 执行 mutation 操作(归档、删除、星标等)

```tsx
function ArticleActions({ articleId }: { articleId: number }) {
  // 仅使用 mutations,忽略 queries
  const { archive, delete, toggleStar } = useCollections()

  return (
    <div>
      <button onClick={() => archive(articleId)}>归档</button>
      <button onClick={() => delete(articleId)}>删除</button>
      <button onClick={() => toggleStar(articleId)}>星标</button>
    </div>
  )
}
```

**返回值**:
```typescript
{
  collections: CollectionListItem[]  // 文章列表
  stats: CollectionStats | null       // 统计数据
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>

  // Mutations
  setFavorite: (id, favoriteId) => Promise<void>
  toggleStar: (id) => Promise<void>
  archive: (id) => Promise<void>
  restore: (id) => Promise<void>
  delete: (id) => Promise<void>
  permanentlyDelete: (id) => Promise<void>
}
```

### ❌ 错误使用示例

```tsx
// ❌ 错误: 在侧边栏使用 useCollections
function Sidebar() {
  const { collections, stats } = useCollections()
  // collections 是文章列表,不是收藏夹列表!
}
```

```tsx
// ❌ 错误: 期望从 useSidebarSync 获取 mutations
function ArticleActions({ articleId }: { articleId: number }) {
  const { archive } = useSidebarSync()  // ❌ useSidebarSync 没有 mutations
}
```

## 组合使用

某些场景可能需要同时使用两个 Hook:

```tsx
function Sidebar() {
  // 侧边栏数据
  const { favorites, stats } = useSidebarSync()

  // Mutations(用于侧边栏的快捷操作)
  const { archive, delete } = useCollections()

  const handleQuickArchive = (articleId: number) => {
    archive(articleId)
  }

  return (
    <div>
      <FavoriteList favorites={favorites} onQuickArchive={handleQuickArchive} />
      <StatsView stats={stats} />
    </div>
  )
}
```

## 数据流

```
侧边栏 (Sidebar):
  useSidebarSync() → GET /api/sync → { favorites, stats }

主内容区 (Main Content):
  useCollections(params) → GET /api/collections → Collection[]

Mutation 操作:
  useCollections().archive() → POST /api/collections/:id/archive → invalidate 两个缓存
```

## 迁移检查清单

从 `useCollections` 迁移到 `useSidebarSync`:

- [ ] 确认组件在侧边栏中使用
- [ ] 更新导入: `useSidebarSync`
- [ ] 更新数据访问: `collections` → `favorites`
- [ ] 更新类型: `CollectionListItem` → `FavoriteWithCount`
- [ ] 保留 mutations(如果需要): 继续使用 `useCollections()` 获取 mutations
- [ ] 验证 count 字段正确显示

## 常见问题

**Q: 为什么不直接修改 `useCollections` 返回 `favorites`?**

A: 概念清晰性。`collections` 在现有代码中代表文章/收藏内容,而不是收藏夹。引入新 Hook 避免了大规模重构和类型混淆。

**Q: 为什么有两个 Hook?**

A: **职责分离**。侧边栏需要收藏夹列表 + 统计,主内容区需要文章列表 + mutations。单一 Hook 无法同时优化这两种不同场景。

**Q: Mutation 后需要刷新哪个缓存?**

A: 两个都要! 当使用 `useCollections` 的 mutations 时,内部会自动刷新 `collections` 和 `sidebar-sync` 两个缓存。

**Q: 可以只导入 `useSidebarSync` 而不导入 `useCollections` 吗?**

A: 看情况。如果组件只需要显示数据(侧边栏),可以只用 `useSidebarSync`。如果需要执行 mutations(归档、删除等),必须同时导入 `useCollections`。

## 参考

- **技术规范**: `tech-spec-article-fetch-api-optimization.md`
- **ADR**: `docs/architecture/sync-api-decision.md`
- **API 文档**: `packages/shared/src/apis/sync.ts`
