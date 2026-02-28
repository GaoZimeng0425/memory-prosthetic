# 轮询策略优化方案

## 问题分析

### 当前实现

```typescript
// ❌ 多处独立轮询，浪费资源
hooks/use-sidebar-sync.ts:      refetchInterval: 5000  // 5秒
hooks/use-collections.ts:        refetchInterval: 5000  // 5秒
hooks/use-favorites.ts:          refetchInterval: 5000  // 5秒
hooks/use-tags.ts:              refetchInterval: 5000  // 5秒
```

**问题：**
1. **资源浪费**：即使数据没有变化，也在不断请求
2. **延迟高**：最多 5 秒才能看到更新
3. **电池消耗**：笔记本续航受影响
4. **不必要**：这是本地桌面应用，数据就在本地

### 事件驱动 vs 轮询对比

| 维度 | 轮询（当前） | 事件驱动（优化后） |
|------|-------------|------------------|
| 响应延迟 | 0-5 秒 | < 100ms |
| CPU 占用 | 持续 | 按需 |
| 网络请求 | 每 5 秒 | 数据变更时 |
| 电池影响 | 高 | 低 |
| 复杂度 | 简单 | 中等 |

---

## 修复方案

### 方案 A: 窗口焦点触发刷新（最简单）

```typescript
// hooks/use-collections.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function useCollections(params?: GetCollectionsParams) {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    ...collections.queries.list(params),
    // ✅ 移除 refetchInterval
    // refetchInterval: 5000, // ❌ 删除
  })

  // ✅ 窗口获得焦点时刷新
  useEffect(() => {
    const handleFocus = () => {
      queryClient.refetchQueries({ queryKey: collections.keys.lists() })
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient])

  // ✅ 首次挂载时刷新
  useEffect(() => {
    queryClient.refetchQueries({ queryKey: collections.keys.lists() })
  }, [queryClient])

  return {
    collections: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    // ...
  }
}
```

**优点：**
- ✅ 实现简单
- ✅ 覆盖最常见场景（用户切换窗口）
- ✅ 节省资源

**缺点：**
- ❌ 同一窗口内操作不会立即更新

---

### 方案 B: Tauri 事件驱动（推荐）

```rust
// apps/desktop/src-tauri/src/lib.rs

use tauri::{AppHandle, Emitter};

// 修改 mutation 操作，发送事件
#[tauri::command]
async fn set_favorite(
    id: i64,
    favorite_id: Option<i64>,
    state: State<'_, AppState>,
    app: AppHandle
) -> Result<(), CommandError> {
    state.db.set_favorite(id, favorite_id)?;

    // ✅ 发送事件通知前端
    app.emit("collections:updated", json!({
        "type": "favorite_changed",
        "id": id,
        "favorite_id": favorite_id
    }))?;

    Ok(())
}
```

```typescript
// hooks/use-collections.ts
import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface CollectionUpdateEvent {
  type: 'favorite_changed' | 'starred_changed' | 'archived' | 'deleted'
  id: number
  [key: string]: unknown
}

export function useCollections(params?: GetCollectionsParams) {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    ...collections.queries.list(params),
    // 移除轮询
  })

  // ✅ 监听后端事件
  useEffect(() => {
    const unlisten = listen<CollectionUpdateEvent>('collections:updated', (event) => {
      console.log('[useCollections] Received update event:', event.payload)

      // 智能失效策略
      switch (event.payload.type) {
        case 'favorite_changed':
        case 'starred_changed':
          // ✅ 乐观更新：直接修改缓存
          queryClient.setQueryData(
            collections.keys.lists(),
            (old: CollectionListItem[] | undefined) => {
              if (!old) return old
              return old.map(item =>
                item.id === event.payload.id
                  ? { ...item, [event.payload.type === 'favorite_changed' ? 'favoriteId' : 'starred']: event.payload.favorite_id ?? event.payload.starred }
                  : item
              )
            }
          )
          break

        case 'archived':
        case 'deleted':
          // ✅ 移除缓存中的项目
          queryClient.setQueryData(
            collections.keys.lists(),
            (old: CollectionListItem[] | undefined) => {
              if (!old) return old
              return old.filter(item => item.id !== event.payload.id)
            }
          )
          break

        default:
          // 其他情况：重新获取
          queryClient.invalidateQueries({ queryKey: collections.keys.lists() })
      }
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [queryClient])

  return {
    collections: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    // ...
  }
}
```

**优点：**
- ✅ 实时更新（< 100ms）
- ✅ 零不必要的请求
- ✅ 支持乐观更新
- ✅ 用户体验最佳

**缺点：**
- ⚠️ 需要修改后端代码
- ⚠️ 增加复杂度

---

### 方案 C: 混合方案（平衡）

结合方案 A 和 B 的优点：

```typescript
// hooks/use-collections.ts
import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export function useCollections(params?: GetCollectionsParams) {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    ...collections.queries.list(params),
    staleTime: 5 * 60 * 1000, // 5 分钟内认为数据新鲜
  })

  // 1. 窗口焦点时刷新（兜底）
  useEffect(() => {
    const handleFocus = () => {
      // 只在数据过期时刷新
      if (listQuery.isStale) {
        queryClient.refetchQueries({ queryKey: collections.keys.lists() })
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [queryClient, listQuery.isStale])

  // 2. 监听后端事件（主要更新机制）
  useEffect(() => {
    const unlisten = listen('collections:updated', () => {
      queryClient.invalidateQueries({ queryKey: collections.keys.lists() })
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [queryClient])

  // 3. Mutation 后乐观更新
  const setFavoriteMutation = useMutation({
    mutationFn: ({ id, favoriteId }) => collections.api.setFavorite(id, favoriteId),
    onMutate: async ({ id, favoriteId }) => {
      await queryClient.cancelQueries({ queryKey: collections.keys.lists() })

      const previousData = queryClient.getQueryData(collections.keys.lists())

      // 乐观更新
      queryClient.setQueryData(collections.keys.lists(), (old: CollectionListItem[] | undefined) =>
        old?.map(item => item.id === id ? { ...item, favoriteId } : item)
      )

      return { previousData }
    },
    onError: (err, variables, context) => {
      // 回滚
      queryClient.setQueryData(collections.keys.lists(), context?.previousData)
    },
  })

  return {
    collections: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    setFavorite: async (id, favoriteId) => {
      await setFavoriteMutation.mutateAsync({ id, favoriteId })
    },
    // ...
  }
}
```

**优点：**
- ✅ 最佳用户体验
- ✅ 向后兼容（事件不支持时降级到焦点刷新）
- ✅ 乐观更新减少延迟感知

---

## 后端事件实现

### 定义事件类型

```rust
// apps/desktop/src-tauri/src/events.rs

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CollectionEvent {
    #[serde(rename = "favorite_changed")]
    FavoriteChanged { id: i64, favorite_id: Option<i64> },

    #[serde(rename = "starred_changed")]
    StarredChanged { id: i64, starred: bool },

    #[serde(rename = "archived")]
    Archived { id: i64 },

    #[serde(rename = "restored")]
    Restored { id: i64 },

    #[serde(rename = "deleted")]
    Deleted { id: i64 },

    #[serde(rename = "permanently_deleted")]
    PermanentlyDeleted { id: i64 },
}

impl CollectionEvent {
    /// 广播事件到前端
    pub fn broadcast(&self, app: &AppHandle) -> Result<(), String> {
        app.emit("collections:updated", self)
            .map_err(|e| format!("Failed to emit event: {}", e))
    }
}
```

### 修改命令

```rust
// apps/desktop/src-tauri/src/lib.rs

use crate::events::CollectionEvent;

#[tauri::command]
async fn set_favorite(
    id: i64,
    favorite_id: Option<i64>,
    state: State<'_, AppState>,
    app: AppHandle
) -> Result<(), CommandError> {
    state.db.set_favorite(id, favorite_id)?;

    // ✅ 发送事件
    CollectionEvent::FavoriteChanged { id, favorite_id }
        .broadcast(&app)?;

    Ok(())
}

#[tauri::command]
async fn toggle_star(
    id: i64,
    state: State<'_, AppState>,
    app: AppHandle
) -> Result<bool, CommandError> {
    let starred = state.db.toggle_star(id)?;

    // ✅ 发送事件
    CollectionEvent::StarredChanged { id, starred }
        .broadcast(&app)?;

    Ok(starred)
}
```

---

## 迁移步骤

### 阶段 1: 前端优化（不影响后端）

1. ✅ 移除所有 `refetchInterval`
2. ✅ 添加窗口焦点刷新
3. ✅ 添加乐观更新

### 阶段 2: 后端添加事件

1. 创建 `events.rs` 模块
2. 修改命令添加事件发送
3. 测试事件触发

### 阶段 3: 前端监听事件

1. 添加事件监听器
2. 实现智能缓存更新
3. 移除焦点刷新（保留作为降级）

---

## 性能对比

### 轮询（5秒间隔）

```
|----req----|----req----|----req----|----req----|
0s         5s        10s        15s        20s

总请求数: 4
实际更新: 1次（第 7s）
浪费请求: 3次
```

### 事件驱动

```
|------event------|
0s              7s

总请求数: 1
实际更新: 1次
浪费请求: 0次
```

### 资源节省

| 指标 | 轮询 | 事件驱动 | 节省 |
|------|------|---------|------|
| 请求数/小时 | 720 | ~10 | 98.6% |
| CPU 时间 | ~2s/小时 | ~0.1s/小时 | 95% |
| 电池影响 | 高 | 低 | 显著 |

---

## 建议

✅ **推荐方案 C（混合方案）**
- 阶段 1 先实施焦点刷新（立即可用）
- 阶段 2 添加后端事件（最佳体验）
- 保留乐观更新（减少延迟感知）

**预计工作量：**
- 焦点刷新：1 小时
- 后端事件：2-3 小时
- 前端事件监听：2-3 小时
- **总计：1 天**
