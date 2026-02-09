# Graph Association Details Enhancement

## Overview

Enhanced the knowledge graph association display to show concrete details instead of generic labels, making it easier to understand relationships between collections.

## Problem

Previously, association edges in the knowledge graph displayed generic labels:
- Keyword associations: "关键词重叠 33%" (Keyword overlap 33%)
- Folder associations: "收藏夹共享" (Shared folder) or "favorite\nfavorite"
- Topic associations: "主题相关" (Related topics)

Users couldn't see **what** specific items were shared between collections.

## Solution

### Backend Changes

#### 1. Database Schema Migration
Added `shared_keywords` column to `association_metadata` table:
```rust
// In db/connection.rs
fn migrate_add_shared_keywords_field(conn: &mut Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "ALTER TABLE association_metadata ADD COLUMN shared_keywords TEXT",
        [],
    )?;
}
```

#### 2. Association Calculation Updates

**Keywords** (`graph/association.rs`):
```rust
// Before: returned only weight
pub async fn calculate_keyword_association(...) -> Result<Option<f64>, CalculationError>

// After: returns weight + shared keywords list
pub async fn calculate_keyword_association(...) -> Result<Option<(f64, Vec<String>)>, CalculationError>
```

**Favorite/Folder** (`graph/association.rs`):
```rust
// Before: returned only weight
pub fn calculate_favorite_association(...) -> Option<(f64, String)>
```

**Topics** (`graph/association.rs`):
```rust
// Already returned (f64, Vec<String>) with shared topics
```

#### 3. Data Structure Updates

**Association struct** (`db/associations.rs`):
```rust
pub struct Association {
    // ... existing fields
    pub shared_keywords: Option<Vec<String>>,  // NEW
}
```

**GraphEdge struct** (`graph/builder.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    // ... existing fields
    pub shared_keywords: Option<Vec<String>>,  // NEW
}
```

#### 4. Discovery Process Updates

Updated `discovery.rs` to store detailed association metadata:
```rust
CreateAssociation {
    // ...
    shared_keywords: Some(shared_keywords),  // Store actual keywords
    domain: Some(favorite_name),             // Store folder name
    shared_folders: Some(shared_topics),      // Store shared topics
}
```

### Frontend Changes

#### 1. Type Definitions

**packages/shared/src/types/graph.ts**:
```typescript
export type Association = {
  // ... existing fields
  sharedKeywords?: string[]  // NEW
}
```

#### 2. Display Logic

**apps/desktop/src/components/features/GraphView.tsx**:

```typescript
case 'keyword':
  if (edge.sharedKeywords && edge.sharedKeywords.length > 0) {
    const keywords = edge.sharedKeywords.slice(0, 3)
    return `关键词: ${keywords.join(', ')}${edge.sharedKeywords.length > 3 ? '...' : ''}`
  }
  // fallback to percentage
  if (edge.keywordOverlap !== undefined) {
    return `关键词重叠 ${(edge.keywordOverlap * 100).toFixed(0)}%`
  }
  return '关键词重叠'

case 'folder':
case 'favorite':  // Added for backward compatibility
  if (edge.domain) {
    return `收藏夹: ${edge.domain}`
  }
  return '收藏夹共享'

case 'topic':
  if (edge.sharedFolders && edge.sharedFolders.length > 0) {
    const topics = edge.sharedFolders.slice(0, 3)
    return `主题: ${topics.join(', ')}${edge.sharedFolders.length > 3 ? '...' : ''}`
  }
  return '主题相关'
```

## Result

### Before
- `关键词重叠 33%` - No indication of which keywords
- `favorite\nfavorite` - Generic label
- `主题相关` - No indication of which topics

### After
- `关键词: react, typescript, rust...` - Shows actual keywords
- `收藏夹: AI` - Shows specific folder name
- `主题: React 平台化, React Data Client...` - Shows shared topics

## Migration Notes

- Old associations are automatically cleaned up on next graph refresh
- New associations are created with detailed information
- No manual migration required for users

## Future Improvements

1. **Partial Keyword Matching**: Currently requires exact keyword match. Could add fuzzy matching for similar keywords.
2. **Keyword Highlighting**: Display keywords with visual emphasis in the graph
3. **Clickable Details**: Make association details clickable to filter/highlight related nodes

## Related Files

### Backend
- `apps/desktop/src-tauri/src/db/connection.rs` - Migration
- `apps/desktop/src-tauri/src/db/associations.rs` - Association CRUD
- `apps/desktop/src-tauri/src/graph/association.rs` - Calculation logic
- `apps/desktop/src-tauri/src/graph/discovery.rs` - Discovery process
- `apps/desktop/src-tauri/src/graph/builder.rs` - Graph building

### Frontend
- `apps/desktop/src/components/features/GraphView.tsx` - Display logic
- `packages/shared/src/types/graph.ts` - Type definitions

## Testing

1. Create multiple collections with overlapping keywords
2. Verify keyword associations display actual shared keywords
3. Create collections in the same favorite folder
4. Verify folder associations display folder name
5. Create collections with shared topics
6. Verify topic associations display shared topics

## Commit

```
feat(graph): enhance association details with specific content display

Improve knowledge graph association display to show concrete details
instead of generic labels, making it easier to understand relationships
between collections.

Commit: c73c569
Date: 2025-02-09
```
