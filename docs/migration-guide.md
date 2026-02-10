# Knowledge Graph Migration Guide

## Overview

The knowledge graph has been upgraded with a new weight algorithm (v2) that provides more accurate and meaningful associations between articles. This guide explains how to migrate your existing associations to the new algorithm.

## What's New in v2

### Weight Algorithm Changes

| Association Type | v1 Max Weight | v2 Max Weight | Change |
|-----------------|---------------|---------------|---------|
| Semantic | 1.0 | 1.0 | No change |
| Tag | 1.0 | 0.85 | Decreased |
| Keyword | 1.0 | 0.8 | Decreased |
| Folder | 0.5 | 0.5 (dynamic) | Dynamic based on folder size |
| Domain | 0.4 | 0.4 | No change |
| Time | 1.0 | 0.3 (boosted to 0.36) | Significantly decreased |

### Key Improvements

1. **Time associations no longer dominate**: Time-based associations now have a maximum weight of 0.3 (with a 1.2x boost for very recent articles, max 0.36), preventing them from overshadowing more meaningful connections.

2. **Dynamic folder association weights**: Large folders now have proportionally lower weights to prevent them from drowning out other valuable associations.

3. **More balanced graph**: The overall graph now better reflects semantic and content-based relationships rather than temporal proximity.

## Migration Process

### Automatic Migration

The migration will trigger automatically when you first launch the updated application. The process:

1. Checks if migration is needed
2. Shows a progress indicator
3. Migrates associations in batches
4. Notifies when complete

### Manual Migration

You can manually trigger the migration:

1. Go to Settings > Knowledge Graph
2. Click "Recalculate All Associations"
3. Confirm when prompted
4. Wait for migration to complete

### Migration Duration

| Number of Articles | Estimated Time |
|-------------------|----------------|
| < 100 | < 1 minute |
| 100 - 500 | 1 - 5 minutes |
| 500 - 1000 | 5 - 15 minutes |
| 1000+ | Proportional to count |

## What You'll Notice

### Before Migration

- Articles collected around the same time appear strongly connected
- Recent articles dominate recommendations
- Folder associations are uniform regardless of folder size

### After Migration

- Semantically similar articles are more prominently connected
- Tag and keyword associations are more visible
- Folder associations adjust based on folder size
- Time associations provide subtle context without dominating

## Rollback

If you need to rollback to v1 weights:

1. Go to Settings > Knowledge Graph
2. Click "Rollback to v1 Weights"
3. Confirm when prompted

Note: This will delete all v2 associations and restore v1 associations from backup.

## Troubleshooting

### Migration Stuck

If migration appears stuck:

1. Check the progress indicator - it may be processing a large batch
2. Wait at least 5 minutes before taking action
3. If still stuck, restart the application - migration will resume

### High Memory Usage

Migration may use up to 500MB of memory during processing. This is normal and will decrease after completion.

### Associations Look Different

This is expected! The v2 algorithm produces different (and more accurate) associations. Give it a try for a few days to see if it improves your experience.

## Technical Details

### Migration API

```typescript
// Check migration status
const stats = await invoke<MigrationStats>('get_migration_stats');

// Start migration
const options = {
  batchSize: 100,
  delayMs: 100,
  priority: 'medium'
};

await invoke('migrate_associations_to_v2', { options });

// Listen to progress
await listen<MigrationProgress>('association_migration:progress', (event) => {
  console.log(`${event.payload.processed}/${event.payload.total}`);
});
```

### Weights Formula

**Time Association:**
```
weight = max(0, 1 - (minutesDifference / 10)) * 0.3
if (minutesDifference < 1) weight *= 1.2
max_weight = 0.3 * 1.2 = 0.36
```

**Tag Association:**
```
weight = min(sharedTags / 4, 1.0) * 0.85
max_weight = 0.85
```

**Keyword Association:**
```
weight = (sharedKeywords / min(len1, len2)) * 0.8
if (usingFallback) weight *= 0.7
max_weight = 0.8
```

**Folder Association (Dynamic):**
```
weight = 0.5 * (3.0 / max(folderSize, 3.0))
- 2 articles: 0.5
- 10 articles: 0.15
- 100 articles: 0.015
```

## Support

If you encounter issues with migration:

1. Check the troubleshooting section above
2. View logs in Settings > Advanced > View Logs
3. Report issues at [GitHub Issues](https://github.com/your-repo/issues)
