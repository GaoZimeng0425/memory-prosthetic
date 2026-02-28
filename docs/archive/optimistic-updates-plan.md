# Mutation 乐观更新方案

## 问题分析

### 当前实现

```typescript
// ❌ 每次操作后全量刷新
const setFavoriteMutation = useMutation({
  mutationFn: ({ id, favoriteId }) => collections.api.setFavorite(id, favoriteId),
  onSuccess: () => {
    void refresh()  // 重新获取所有数据
  },
})
```

**用户体验问题：**

```
用户点击 "设为收藏"
    ↓
loading 状态（等待网络请求）
    ↓
请求成功
    ↓
refresh() 触发重新获取
    ↓
loading 状态（等待数据返回）
    ↓
UI 更新（约 500ms - 1s 延迟）
```

**理想体验（乐观更新）：**

```
用户点击 "设为收藏"
    ↓
UI 立即更新（乐观假设成功）
    ↓
后台发送请求
    ↓
成功 → 无操作
失败 → 回滚 UI
```

---

## 修复方案

### 基础模式：乐观更新

```typescript
// hooks/use-collections.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCollections(params?: GetCollectionsParams) {
  const queryClient = useQueryClient()

  // ✅ setFavorite 乐观更新
  const setFavoriteMutation = useMutation({
    mutationFn: ({ id, favoriteId }: { id: number; favoriteId: number | null }) =>
      collections.api.setFavorite(id, favoriteId),

    // 1. 乐观更新阶段（mutation 开始前）
    onMutate: async ({ id, favoriteId }) => {
      // ❌ 取消正在进行的查询，避免被覆盖
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      // 📸 快照当前数据（用于回滚）
      const previousData = queryClient.getQueryData<CollectionListItem[]>(
        collections.keys.lists()
      )

      // ✅ 乐观更新：直接修改缓存
      queryClient.setQueryData(
        collections.keys.lists(),
        (old: CollectionListItem[] | undefined) =>
          old?.map(item =>
            item.id === id
              ? { ...item, favoriteId: favoriteId ?? undefined }
              : item
          ) ?? []
      )

      // 返回快照，供 onError 使用
      return { previousData }
    },

    // 2. 错误处理（回滚）
    onError: (error, variables, context) => {
      console.error('setFavorite failed:', error)

      // 回滚到之前的状态
      if (context?.previousData) {
        queryClient.setQueryData(
          collections.keys.lists(),
          context.previousData
        )
      }

      toast.error('设置收藏夹失败，请重试')
    },

    // 3. 成功后的可选操作
    onSuccess: (data, variables, context) => {
      // 通常不需要做任何事，乐观更新已经生效
      // 如果需要刷新其他相关数据：
      queryClient.invalidateQueries({ queryKey: ['sidebar-sync'] })
    },

    // 4. 无论成功失败都执行
    onSettled: () => {
      // 可选：重新验证数据以确保一致性
      // queryClient.invalidateQueries({ queryKey: collections.keys.lists() })
    },
  })

  return {
    collections: listQuery.data ?? [],
    setFavorite: async (id: number, favoriteId: number | null) => {
      await setFavoriteMutation.mutateAsync({ id, favoriteId })
    },
    // ...
  }
}
```

### 高级模式：上下文感知的乐观更新

```typescript
// hooks/use-collections.ts

interface SetFavoriteContext {
  previousData: CollectionListItem[]
  updatedId: number
  oldFavoriteId: number | null
  newFavoriteId: number | null
}

const setFavoriteMutation = useMutation({
  mutationFn: ({ id, favoriteId }) => collections.api.setFavorite(id, favoriteId),

  onMutate: async ({ id, favoriteId }) => {
    await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

    const previousData = queryClient.getQueryData<CollectionListItem[]>(
      collections.keys.lists()
    )

    // ✅ 查找旧值以支持回滚
    const oldItem = previousData?.find(item => item.id === id)
    const oldFavoriteId = oldItem?.favoriteId ?? null

    // ✅ 乐观更新
    queryClient.setQueryData(
      collections.keys.lists(),
      (old: CollectionListItem[] | undefined) =>
        old?.map(item =>
          item.id === id
            ? { ...item, favoriteId: favoriteId ?? undefined }
            : item
        ) ?? []
    )

    // ✅ 同时更新统计数据（如果有）
    queryClient.setQueryData(
      collections.keys.stats(),
      (oldStats: CollectionStats | undefined) => {
        if (!oldStats) return oldStats
        // 如果从无收藏夹变为有收藏夹，计数可能变化
        return oldStats
      }
    )

    return {
      previousData,
      updatedId: id,
      oldFavoriteId,
      newFavoriteId: favoriteId,
    } satisfies SetFavoriteContext
  },

  onError: (error, variables, context) => {
    console.error('setFavorite failed:', error)

    // ✅ 回滚
    if (context?.previousData) {
      queryClient.setQueryData(
        collections.keys.lists(),
        context.previousData
      )

      toast.error(`操作失败：${error.message}`)
    }
  },

  onSuccess: async (data, variables, context) => {
    // ✅ 重新获取以确保数据一致性
    // （可选，如果需要确保后端状态）
    await queryClient.invalidateQueries({
      queryKey: collections.keys.lists(),
    })

    // ✅ 刷新侧边栏统计
    await queryClient.invalidateQueries({
      queryKey: ['sidebar-sync'],
    })
  },
})
```

### 复杂操作：archive/delete 乐观更新

```typescript
// hooks/use-collections.ts

const archiveMutation = useMutation({
  mutationFn: (id: number) => collections.api.archive(id),

  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

    const previousData = queryClient.getQueryData<CollectionListItem[]>(
      collections.keys.lists()
    )

    // ✅ 乐观更新：从列表中移除（因为 status 变为 archived）
    queryClient.setQueryData(
      collections.keys.lists(),
      (old: CollectionListItem[] | undefined) =>
        old?.filter(item => item.id !== id) ?? []
    )

    // ✅ 更新统计数据
    queryClient.setQueryData(
      collections.keys.stats(),
      (oldStats: CollectionStats | undefined) => {
        if (!oldStats) return oldStats
        return {
          ...oldStats,
          total: oldStats.total - 1,
          archived: oldStats.archived + 1,
        }
      }
    )

    return { previousData, archivedId: id }
  },

  onError: (error, variables, context) => {
    console.error('archive failed:', error)

    // ✅ 回滚列表和统计
    if (context?.previousData) {
      queryClient.setQueryData(collections.keys.lists(), context.previousData)

      // 回滚统计
      queryClient.setQueryData(
        collections.keys.stats(),
        (oldStats: CollectionStats | undefined) => {
          if (!oldStats) return oldStats
          return {
            ...oldStats,
            total: oldStats.total + 1,
            archived: oldStats.archived - 1,
          }
        }
      )
    }

    toast.error('归档失败，请重试')
  },

  onSuccess: () => {
    // 刷新其他可能受影响的查询
    queryClient.invalidateQueries({ queryKey: ['sidebar-sync'] })
  },
})
```

### 添加乐观更新的 hook 模式

```typescript
// hooks/use-optimistic-mutation.ts

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface OptimisticMutationOptions<TData, TVariables, TContext> {
  mutationFn: (variables: TVariables) => Promise<TData>
  onOptimisticUpdate: (variables: TVariables, oldData: unknown) => unknown
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void
  queryKey: QueryKey
  errorMessage?: string
  successMessage?: string
}

export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  options: OptimisticMutationOptions<TData, TVariables, TContext>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: options.mutationFn,

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey })

      const previousData = queryClient.getQueryData(options.queryKey)

      // 乐观更新
      queryClient.setQueryData(options.queryKey, (oldData: unknown) =>
        options.onOptimisticUpdate(variables, oldData)
      )

      return { previousData } as TContext
    },

    onError: (error, variables, context) => {
      // 回滚
      if (context) {
        queryClient.setQueryData(options.queryKey, (context as any).previousData)
      }

      options.onError?.(error, variables, context)
      toast.error(options.errorMessage ?? '操作失败')
    },

    onSuccess: (data, variables, context) => {
      options.onSuccess?.(data, variables, context)
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
    },
  })
}

// 使用示例
export function useCollections() {
  const queryClient = useQueryClient()

  const setFavorite = useOptimisticMutation(
    {
      mutationFn: ({ id, favoriteId }: { id: number; favoriteId: number | null }) =>
        collections.api.setFavorite(id, favoriteId),

      onOptimisticUpdate: ({ id, favoriteId }, oldData: CollectionListItem[] | undefined) =>
        oldData?.map(item =>
          item.id === id ? { ...item, favoriteId: favoriteId ?? undefined } : item
        ) ?? [],

      queryKey: collections.keys.lists(),
      errorMessage: '设置收藏夹失败',
      successMessage: '已设置收藏夹',
    }
  )

  // ...
}
```

---

## 并发操作处理

### 问题：快速连续操作

```
用户点击 "收藏" → 立即点击 "取消收藏"
```

```typescript
// ❌ 错误处理（竞争条件）
const setFavoriteMutation = useMutation({
  mutationFn: setFavorite,
  onMutate: async ({ id, favoriteId }) => {
    // 如果第一个请求还在进行，这会导致冲突
    queryClient.setQueryData(...)
  },
})

// ✅ 正确处理
const setFavoriteMutation = useMutation({
  mutationFn: setFavorite,

  onMutate: async ({ id, favoriteId }) => {
    // 取消所有进行中的查询
    await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

    const previousData = queryClient.getQueryData<CollectionListItem[]>(
      collections.keys.lists()
    )

    // ✅ 基于最新数据更新
    queryClient.setQueryData(
      collections.keys.lists(),
      (old: CollectionListItem[] | undefined) =>
        old?.map(item =>
          item.id === id ? { ...item, favoriteId: favoriteId ?? undefined } : item
        ) ?? []
    )

    return { previousData }
  },
})
```

---

## 批量操作乐观更新

```typescript
// 场景：批量归档多个项目
const batchArchiveMutation = useMutation({
  mutationFn: async (ids: number[]) => {
    await Promise.all(ids.map(id => collections.api.archive(id)))
  },

  onMutate: async (ids) => {
    await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

    const previousData = queryClient.getQueryData<CollectionListItem[]>(
      collections.keys.lists()
    )

    // ✅ 乐观更新：移除所有选中的项目
    queryClient.setQueryData(
      collections.keys.lists(),
      (old: CollectionListItem[] | undefined) =>
        old?.filter(item => !ids.includes(item.id)) ?? []
    )

    return { previousData }
  },

  onError: (error, ids, context) => {
    // 回滚所有项目
    if (context?.previousData) {
      queryClient.setQueryData(collections.keys.lists(), context.previousData)
    }

    toast.error(`批量归档失败：${error.message}`)
  },
})
```

---

## 测试清单

- [ ] 基本操作成功（UI 立即更新）
- [ ] 操作失败后正确回滚
- [ ] 并发操作不冲突
- [ ] 统计数据同步更新
- [ ] 相关查询正确失效
- [ ] 错误提示正确显示

---

## 用户体验对比

| 场景 | 当前 | 乐观更新后 |
|------|------|-----------|
| 点击收藏 | ~500ms 延迟 | 立即响应 |
| 失败回滚 | 手动刷新 | 自动回滚 + 提示 |
| 连续操作 | 可能冲突 | 流畅 |
| 网络慢 | 明显卡顿 | 感觉即时 |

---

## 建议

✅ **推荐实施顺序：**

1. **阶段 1**（1 小时）：实现基础乐观更新
   - setFavorite
   - toggleStar

2. **阶段 2**（1 小时）：实现复杂乐观更新
   - archive/restore
   - delete/permanentlyDelete

3. **阶段 3**（1 小时）：添加统计同步
   - 更新 CollectionStats
   - 更新 sidebar-sync

4. **阶段 4**（可选）：创建通用 hook
   - `useOptimisticMutation`
   - 简化未来实现

**总计：3-4 小时**
