# ADR: 为什么使用两个 Hooks?

## 元数据

- **状态**: 已接受
- **日期**: 2025-02-03
- **决策者**: 技术团队
- **影响范围**: 前端数据获取架构

## 背景

原有单个 `useCollections` hook 同时服务于侧边栏和主内容区,导致以下问题:

1. **概念混淆**: `useCollections` 返回 `CollectionListItem[]`,名字暗示返回收藏夹,实际返回文章
2. **双轮询性能问题**: 侧边栏需要 `Favorite[]` + stats,只能调用两次 API (`/api/collections` + `/api/collections/stats`)
3. **职责不清晰**: 单个 Hook 承担了过多责任

## 决策

引入 `useSidebarSync` 专门服务侧边栏,`useCollections` 服务主内容区。

### 架构设计

```
侧边栏: useSidebarSync()
  ↓
  GET /api/sync → { favorites: FavoriteWithCount[], stats: SyncStats }
  - 单次请求获取所有需要的数据
  - 5秒轮询
  - Query Key: ['sidebar-sync']

主内容区: useCollections(params)
  ↓
  GET /api/collections → CollectionListItem[]
  - 支持过滤、分页
  - 5秒轮询
  - Query Key: ['collections']
  - 包含 7 个 mutations
```

## 替代方案

### 方案 1: 单 Hook + 条件查询(被拒绝)

**描述**: 在 `useCollections` 中添加参数控制返回 `favorites` 或 `collections`

**优点**:
- 只有一个 Hook
- 集中管理

**缺点**:
- ❌ Hook 内部复杂度增加(需要条件逻辑处理两种不同数据类型)
- ❌ 类型不安全(返回类型需要是联合类型)
- ❌ 不符合单一职责原则

### 方案 2: 重命名 Hook(推迟)

**描述**: 将 `useCollections` 重命名为 `useArticles`,新建 `useFavorites`

**优点**:
- 概念更清晰

**缺点**:
- ❌ 需要大规模重构(所有使用 `useCollections` 的文件)
- ❌ 破坏性变更
- ❌ 工作量太大

### 方案 3: 统一端点(推迟)

**描述**: 使用 `/api/collections?include=stats` 统一端点

**优点**:
- 前端逻辑简化

**缺点**:
- ❌ 需要更大架构讨论
- ❌ 后端需要重构现有端点结构
- ❌ 可能影响其他功能

## 最终方案: Hybrid Approach

采用**保留双 Hook 架构** + **修复关键 Bug** + **全面开发者文档**:

### 保留的部分

- ✅ `useSidebarSync` - 新 Hook,专门用于侧边栏
- ✅ `useCollections` - 保持不变,用于主内容区和 mutations

### 修复的部分

- ✅ 条件聚合优化(5x 性能提升)
- ✅ 部分索引优化(70% 索引大小减少)
- ✅ 事务包装确保数据一致性

### 新增的部分

- ✅ 全面的开发者文档(决策树、ADR、代码示例)
- ✅ Biome lint 规则防止 hook 误用
- ✅ 性能基准测试验证

## 后果

### 正面影响

1. **性能提升**: 侧边栏从 2 个请求减少到 1 个请求,条件聚合提升统计查询性能 5x
2. **职责清晰**: 两个 Hook 各司其职,易于理解和维护
3. **向后兼容**: `useCollections` 保持不变,无需大规模重构
4. **类型安全**: 每个 Hook 返回明确的类型,无需联合类型

### 负面影响

1. **学习曲线**: 新开发者需要学习两个 Hook 的区别
   - **缓解措施**: 全面的开发者文档
2. **双缓存管理**: 需要维护两个独立的缓存命名空间
   - **缓解措施**: Mutation 自动刷新两个缓存,开发者无需手动管理
3. **Mutation 失效开销**: 每次 mutation 需要使 2 个缓存失效(原来是 1 个)
   - **影响评估**: 开发环境测试显示影响可忽略(< 5ms)

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 开发者误用 Hook | 中 | 中 | 文档 + Biome lint 规则 |
| 双缓存性能开销 | 低 | 低 | 自动管理,影响可忽略 |
| 未来维护成本 | 低 | 低 | 清晰的文档和测试覆盖 |

## 成功标准

- ✅ EXPLAIN QUERY PLAN 确认索引使用
- ✅ 性能测试显示 ≥ 5x 统计查询提升
- ✅ 并发测试通过(无数据不一致)
- ✅ 新开发者 5 分钟内选择正确 hook

## 参考资料

- **技术规范**: `tech-spec-article-fetch-api-optimization.md`
- **Hook 选择指南**: `docs/hooks-selection-guide.md`
- **Party Mode 反馈**: 技术规范 Section 7
