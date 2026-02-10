# Knowledge Graph API Documentation

## Overview

The Knowledge Graph API provides endpoints for managing article associations, calculating weights, and migrating between algorithm versions.

## Base URL

All API calls are made through Tauri's `invoke` function:

```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<CommandResult<DataType>>('command_name', {
  param1: value1,
  param2: value2,
});
```

## Endpoints

### Graph Data

#### `get_graph_data`

Fetches graph data with optional filters.

```typescript
interface GraphFilters {
  minWeight?: number;        // Minimum association weight (0-1)
  types?: AssociationType[]; // Filter by association types
  maxNodes?: number;         // Maximum nodes to return
  focusedNodeId?: number;    // Center the graph on this node
  maxDepth?: number;         // Depth for focused mode (default: 1)
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const result = await invoke<CommandResult<GraphData>>('get_graph_data', {
  filters: {
    minWeight: 0.3,
    types: ['semantic', 'tag'],
    maxNodes: 100
  }
});
```

### Article Associations

#### `get_collection_associations`

Gets associations for a specific article, sorted by weight.

```typescript
interface Association {
  id: string;
  sourceId: number;
  targetId: number;
  type: AssociationType;
  weight: number;
  confidence: number;
  // ... other fields
}

const associations = await invoke<Association[]>('get_collection_associations', {
  collectionId: 123,
  limit: 50
});
```

**Response:**
- `collectionId`: The article ID to get associations for
- `limit`: Maximum number of associations to return (default: 50)
- Returns: Array of associations sorted by weight (descending)

### Migration

#### `get_migration_stats`

Gets statistics about current association versions.

```typescript
interface MigrationStats {
  v1Count: number;
  v2Count: number;
  nullCount: number;
  totalCollections: number;
  estimatedDurationSeconds?: number;
}

const stats = await invoke<MigrationStats>('get_migration_stats');
```

**Response:**
- `v1Count`: Number of associations using v1 weights
- `v2Count`: Number of associations using v2 weights
- `nullCount`: Number of associations with no version set
- `totalCollections`: Total number of articles in database
- `estimatedDurationSeconds`: Estimated time to complete migration

#### `migrate_associations_to_v2`

Starts migration from v1 to v2 weight algorithm.

```typescript
interface MigrationOptions {
  batchSize?: number;    // Associations per batch (default: 100)
  delayMs?: number;      // Delay between batches in ms (default: 100)
  priority?: 'high' | 'medium' | 'low'; // Resource priority (default: 'medium')
}

await invoke('migrate_associations_to_v2', {
  options: {
    batchSize: 100,
    delayMs: 100,
    priority: 'medium'
  }
});
```

**Error Codes:**
- `MigrationFailed`: Migration encountered an error
- `AlreadyInProgress`: Migration is already running
- `NoMigrationNeeded`: All associations are already v2

#### `rollback_associations_to_v1`

Rolls back v2 associations, restoring v1 weights.

```typescript
await invoke('rollback_associations_to_v1');
```

**Warning:** This deletes all v2 associations. Use with caution.

### Events

#### `association_migration:progress`

Emitted during migration with progress updates.

```typescript
import { listen } from '@tauri-apps/api/event';

interface MigrationProgress {
  status: 'idle' | 'inProgress' | 'completed' | 'failed';
  totalAssociations: number;
  processedAssociations: number;
  createdV2Count: number;
  currentBatch: number;
  estimatedRemainingSeconds?: number;
  error?: string;
}

const unlisten = await listen<MigrationProgress>('association_migration:progress', (event) => {
  const progress = event.payload;
  console.log(`Migration: ${progress.processedAssociations}/${progress.totalAssociations}`);
});
```

## Association Types

```typescript
type AssociationType =
  | 'semantic'   // Semantic similarity (cosine similarity)
  | 'tag'        // Shared tags
  | 'folder'     // Same favorite folder
  | 'time'       // Temporal proximity
  | 'domain'     // Same domain/website
  | 'keyword'    // Keyword overlap
  | 'topic'      // Topic similarity
  | 'reference'  // Citation/reference link
  | 'author'     // Same author;
```

## Weight Calculation Formulas

### Semantic Association

```
weight = cosine_similarity(embedding1, embedding2)
range: [0, 1]
confidence: 0.7 - 1.0
```

### Tag Association

```
shared_tags = count(tags1 ∩ tags2)
weight = min(shared_tags / 4, 1.0) × 0.85
range: [0, 0.85]
confidence: 0.7
```

### Keyword Association

```
shared_keywords = count(keywords1 ∩ keywords2)
min_len = min(len(keywords1), len(keywords2))
overlap_ratio = shared_keywords / min_len
weight = overlap_ratio × 0.8
if (using_fallback) weight ×= 0.7
range: [0, 0.8]
confidence: 0.6
```

### Folder Association

```
if (same_favorite_folder) {
  folder_size = count(articles_in_folder)
  weight = 0.5 × (3.0 / max(folder_size, 3.0))
} else {
  weight = 0
}
range: [0, 0.5]
confidence: 0.7
```

### Time Association

```
minutes_diff = abs(timestamp1 - timestamp2) / 60
weight = max(0, 1 - minutes_diff / 10) × 0.3
if (minutes_diff < 1) weight ×= 1.2
range: [0, 0.36]
confidence: 0.5
```

### Domain Association

```
if (domain1 === domain2) {
  weight = 0.4
} else {
  weight = 0
}
range: {0, 0.4}
confidence: 0.6
```

## Error Handling

All commands can return errors. Handle them appropriately:

```typescript
try {
  const result = await invoke('get_graph_data', { filters });
  if (!result.success) {
    throw new Error(result.error);
  }
  // Use result.data
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    // Handle not found
  } else if (error.code === 'DB_ERROR') {
    // Handle database error
  } else {
    // Handle other errors
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `DB_ERROR` | Database operation failed |
| `INVALID_INPUT` | Invalid request parameters |
| `NOT_FOUND` | Resource not found |
| `SERVER_ERROR` | Internal server error |
| `MigrationFailed` | Migration operation failed |
| `AlreadyInProgress` | Operation already in progress |

## Rate Limiting

There are no explicit rate limits, but operations are batched:
- Migration processes `batchSize` associations at a time
- Default batch size: 100 associations
- Default delay between batches: 100ms

## Performance Considerations

1. **Large Graphs**: For graphs with 1000+ nodes, use `maxNodes` filter to limit response size
2. **Focused Mode**: Use `focusedNodeId` to get only relevant associations for a specific article
3. **Weight Threshold**: Use `minWeight` to filter out weak associations
4. **Migration**: Run during idle time; migration can take 5+ minutes for large databases

## Examples

### Fetch Graph with Filters

```typescript
const graphData = await invoke<CommandResult<GraphData>>('get_graph_data', {
  filters: {
    minWeight: 0.5,
    types: ['semantic', 'tag'],
    maxNodes: 50
  }
});

console.log(`Loaded ${graphData.data.nodes.length} nodes`);
```

### Get Article Associations

```typescript
const associations = await invoke<Association[]>('get_collection_associations', {
  collectionId: 42,
  limit: 20
});

// Display top 5 related articles
associations.slice(0, 5).forEach(assoc => {
  console.log(`${assoc.type}: ${assoc.weight.toFixed(2)}`);
});
```

### Monitor Migration Progress

```typescript
const unlisten = await listen<MigrationProgress>('association_migration:progress', (e) => {
  const { status, processedAssociations, totalAssociations } = e.payload;
  const percent = (processedAssociations / totalAssociations * 100).toFixed(0);
  console.log(`Migration: ${percent}%`);
});

// Start migration
await invoke('migrate_associations_to_v2', { options: {} });
```

### Handle Migration Errors

```typescript
try {
  await invoke('migrate_associations_to_v2', { options });
} catch (error) {
  if (error.code === 'AlreadyInProgress') {
    console.log('Migration already in progress');
  } else {
    console.error('Migration failed:', error.message);
  }
}
```
