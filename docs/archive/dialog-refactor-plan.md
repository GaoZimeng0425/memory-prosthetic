# Dialog 组件重构方案

## 目标
将 DialogContext 的全局状态管理改为组合式组件

## 迁移路径

### 阶段 1: 创建新的 Dialog 基础组件（不破坏现有代码）

```typescript
// components/dialogs/TagDialog.tsx
interface TagDialogProps {
  collectionId: number | null
  open: boolean
  onClose: () => void
}

export function TagDialog({ collectionId, open, onClose }: TagDialogProps) {
  // 内部管理自己的状态
  const { tags: collectionTags, addTags, removeTag } = useCollectionTags(collectionId ?? 0)
  const { createTag } = useTags()

  if (!open || !collectionId) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {/* Dialog 内容 */}
      </DialogContent>
    </Dialog>
  )
}
```

### 阶段 2: 在使用处直接渲染

```typescript
// components/article-list/ArticleListItem.tsx
export function ArticleListItem({ collection }: { collection: CollectionListItem }) {
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)

  return (
    <div>
      <Button onClick={() => setIsTagDialogOpen(true)}>编辑标签</Button>

      {/* ✅ 直接在这里渲染，不需要 context */}
      <TagDialog
        collectionId={collection.id}
        open={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
      />
    </div>
  )
}
```

### 阶段 3: 逐步移除 DialogContext

1. 从 __root.tsx 移除 DialogComponents
2. 删除 DialogContext.tsx
3. 更新所有使用点

## 优势

✅ 符合 React 组合原则
✅ Dialog 状态就近管理
✅ 更容易测试
✅ 支持多个同类型 Dialog（如同时打开两个 TagDialog）
✅ 减少不必要的组件挂载

## 风险与缓解

⚠️ **风险**: 需要修改多个文件
✓ **缓解**: 分阶段迁移，保持向后兼容

⚠️ **风险**: 某些 Dialog 需要跨组件访问
✓ **缓解**: 使用状态提升或传递回调函数
