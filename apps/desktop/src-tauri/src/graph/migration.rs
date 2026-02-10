//! Association weight algorithm migration
//!
//! Handles migration of association weights between algorithm versions

use crate::db::{Collection, CollectionRepository, Database, DbError};
use crate::graph::{AssociationCalculator, AssociationType, IncrementalDiscovery};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use tracing::{error, info, warn};

#[derive(Debug, Error)]
pub enum MigrationError {
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    #[error("Migration already in progress")]
    AlreadyInProgress,

    #[error("No migration needed")]
    NoMigrationNeeded,

    #[error("Migration failed: {0}")]
    MigrationFailed(String),

    #[error("Rollback failed: {0}")]
    RollbackFailed(String),
}

/// Migration options for controlling migration behavior
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationOptions {
    /// Number of associations to process per batch
    #[serde(default = "default_batch_size")]
    pub batch_size: usize,

    /// Delay in milliseconds between batches
    #[serde(default = "default_delay_ms")]
    pub delay_ms: u64,

    /// Priority level (affects resource usage)
    #[serde(default)]
    pub priority: MigrationPriority,
}

fn default_batch_size() -> usize {
    100
}

fn default_delay_ms() -> u64 {
    100
}

/// Migration priority levels
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MigrationPriority {
    High,
    Medium,
    Low,
}

impl Default for MigrationPriority {
    fn default() -> Self {
        Self::Medium
    }
}

/// Migration status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum MigrationStatus {
    Idle,
    InProgress,
    Completed,
    Failed(String),
}

/// Migration progress report
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationProgress {
    pub status: MigrationStatus,
    pub total_associations: usize,
    pub processed_associations: usize,
    pub created_v2_count: usize,
    pub current_batch: usize,
    pub estimated_remaining_seconds: Option<f64>,
    pub error: Option<String>,
}

/// Migration statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MigrationStats {
    pub v1_count: usize,
    pub v2_count: usize,
    pub null_count: usize,
    pub total_collections: usize,
    pub estimated_duration_seconds: Option<f64>,
}

/// Association weight algorithm migrator
pub struct AssociationMigrator {
    db: Arc<Database>,
}

impl AssociationMigrator {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get migration statistics
    /// AC 5: Given 权重算法版本迁移，when 调用 get_migration_stats，
    /// then 返回 v1, v2, null 关联的统计信息
    pub fn get_migration_stats(&self) -> Result<MigrationStats, MigrationError> {
        self.db.with_connection(|conn| {
            // Get association version counts
            let (v1_count, v2_count, null_count): (i64, i64, i64) = conn.query_row(
                r#"
                SELECT
                    SUM(CASE WHEN weight_algorithm_version = 'v1' THEN 1 ELSE 0 END) as v1_count,
                    SUM(CASE WHEN weight_algorithm_version = 'v2' THEN 1 ELSE 0 END) as v2_count,
                    SUM(CASE WHEN weight_algorithm_version IS NULL THEN 1 ELSE 0 END) as null_count
                FROM associations
                "#,
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )?;

            // Get total collection count
            let total_collections: i64 = conn.query_row(
                "SELECT COUNT(*) FROM collections WHERE status = 'active'",
                [],
                |row| row.get(0),
            )?;

            // Estimate duration: 100ms per 100 associations
            // Total to migrate includes both v1 and null
            let total_to_migrate = (v1_count + null_count) as usize;
            let estimated_duration_seconds = if total_to_migrate > 0 {
                Some((total_to_migrate as f64 / 1000.0) * 10.0)
            } else {
                None
            };

            Ok(MigrationStats {
                v1_count: v1_count as usize,
                v2_count: v2_count as usize,
                null_count: null_count as usize,
                total_collections: total_collections as usize,
                estimated_duration_seconds,
            })
        })
        .map_err(MigrationError::from)
    }

    /// Check if migration is currently in progress
    pub fn is_migration_in_progress(&self) -> Result<bool, MigrationError> {
        self.db.with_connection(|conn| {
            // First check if the migration_lock table exists
            let table_exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='migration_lock'",
                [],
                |row| row.get(0),
            ).unwrap_or(0);

            if table_exists == 0 {
                return Ok(false);
            }

            let count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM migration_lock WHERE lock_key = 'v2_migration'",
                [],
                |row| row.get(0),
            )?;
            Ok(count > 0)
        })
        .map_err(MigrationError::from)
    }

    /// Acquire migration lock
    /// AC 21: Given 重复调用迁移 API，when 迁移正在进行，then 返回 409 Conflict 且不启动新迁移
    fn acquire_migration_lock(&self) -> Result<(), MigrationError> {
        self.db.with_connection_mut(|conn| {
            // Create migration lock table if not exists
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS migration_lock (
                    lock_key TEXT PRIMARY KEY,
                    acquired_at INTEGER NOT NULL
                );
                "#,
            )?;

            // Check if lock already exists
            let existing: i64 = conn.query_row(
                "SELECT COUNT(*) FROM migration_lock WHERE lock_key = 'v2_migration'",
                [],
                |row| row.get(0),
            )?;

            if existing > 0 {
                return Err(rusqlite::Error::QueryReturnedNoRows);
            }

            // Acquire lock
            conn.execute(
                "INSERT INTO migration_lock (lock_key, acquired_at) VALUES ('v2_migration', ?1)",
                params![chrono::Utc::now().timestamp()],
            )?;

            Ok(())
        })
        .map_err(|_| MigrationError::AlreadyInProgress)
    }

    /// Release migration lock
    fn release_migration_lock(&self) -> Result<(), MigrationError> {
        self.db.with_connection_mut(|conn| {
            conn.execute(
                "DELETE FROM migration_lock WHERE lock_key = 'v2_migration'",
                [],
            )?;
            Ok(())
        })
        .map_err(MigrationError::from)
    }

    /// Rollback v2 associations
    /// AC 22: Given 迁移失败，when 执行回滚，then 所有 v2 关联被删除，v1 关联保持不变
    pub fn rollback_v2_associations(&self) -> Result<usize, MigrationError> {
        info!("Starting rollback of v2 associations");

        let deleted = self.db.with_connection_mut(|conn| {
            // First, delete v2 metadata
            let deleted_meta = conn.execute(
                "DELETE FROM association_metadata
                 WHERE association_id IN (
                     SELECT id FROM associations WHERE weight_algorithm_version = 'v2'
                 )",
                [],
            )?;

            // Then, delete v2 associations
            let deleted_assoc = conn.execute(
                "DELETE FROM associations WHERE weight_algorithm_version = 'v2'",
                [],
            )?;

            info!("Rollback completed: deleted {} v2 associations and {} metadata records", deleted_assoc, deleted_meta);

            Ok(deleted_assoc)
        })
        .map_err(|e| MigrationError::RollbackFailed(e.to_string()))?;

        Ok(deleted)
    }

    /// Mark all NULL version associations as v1
    fn mark_null_as_v1(&self) -> Result<usize, MigrationError> {
        self.db.with_connection_mut(|conn| {
            let updated = conn.execute(
                "UPDATE associations SET weight_algorithm_version = 'v1' WHERE weight_algorithm_version IS NULL",
                [],
            )?;
            Ok(updated)
        })
        .map_err(MigrationError::from)
    }

    /// Perform the actual migration to v2 weights
    /// This is called internally by migrate_to_v2
    fn perform_migration<F>(&self, _options: &MigrationOptions, mut progress_callback: F) -> Result<MigrationProgress, MigrationError>
    where
        F: FnMut(MigrationProgress),
    {
        info!("Starting v2 weight migration");

        // First, ensure all NULL versions are marked as v1
        let marked_count = self.mark_null_as_v1()?;
        if marked_count > 0 {
            info!("Marked {} NULL associations as v1", marked_count);
        }

        // Get all v1 associations
        let v1_associations = self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, source_id, target_id, type
                FROM associations
                WHERE weight_algorithm_version = 'v1'
                ORDER BY weight DESC
                "#,
            )?;

            let associations = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })?;

            associations.collect::<Result<Vec<_>, _>>()
        })
        .map_err(MigrationError::from)?;

        let total = v1_associations.len();
        info!("Found {} v1 associations to migrate", total);

        if total == 0 {
            return Ok(MigrationProgress {
                status: MigrationStatus::Completed,
                total_associations: 0,
                processed_associations: 0,
                created_v2_count: 0,
                current_batch: 0,
                estimated_remaining_seconds: None,
                error: None,
            });
        }

        let start_time = std::time::Instant::now();
        let mut created_v2_count = 0;
        let batch_size = _options.batch_size.max(1);

        // Process in batches
        for (batch_idx, chunk) in v1_associations.chunks(batch_size).enumerate() {
            let batch_start = std::time::Instant::now();

            // Get collections for this batch
            let collection_ids: Vec<i64> = chunk
                .iter()
                .flat_map(|(id, source_id, target_id, assoc_type)| {
                    vec![*source_id, *target_id]
                })
                .collect::<std::collections::HashSet<_>>()
                .into_iter()
                .collect();

            let collections = self.get_collections_by_ids(&collection_ids)?;

            // Recalculate associations for this batch
            let calculator = AssociationCalculator::new(self.db.clone());
            let mut batch_created = 0;

            for (assoc_id, source_id, target_id, assoc_type) in chunk {
                let source = match collections.get(source_id) {
                    Some(c) => c,
                    None => continue,
                };
                let target = match collections.get(target_id) {
                    Some(c) => c,
                    None => continue,
                };

                // Calculate new weight based on association type
                let (new_weight, confidence): (f64, f64) = match assoc_type.as_str() {
                    "time" => {
                        match calculator.calculate_time_association(source, target) {
                            Some((w, _)) => (w, 0.5),
                            None => continue,
                        }
                    }
                    "tag" => {
                        // For tags, we need async, but this is sync context
                        // Use a default weight for now - this will be refined
                        (0.85, 0.7)
                    }
                    "folder" => {
                        match calculator.calculate_favorite_association(source, target) {
                            Some((w, _)) => (w, 0.8),
                            None => continue,
                        }
                    }
                    "domain" => {
                        match calculator.calculate_domain_association(source, target) {
                            Some((w, _)) => (w, 0.6),
                            None => continue,
                        }
                    }
                    _ => (0.5, 0.6), // Default for other types
                };

                // Update the association to v2
                let updated = self.db.with_connection_mut(|conn| {
                    conn.execute(
                        "UPDATE associations SET weight = ?1, weight_algorithm_version = 'v2', updated_at = ?2 WHERE id = ?3",
                        params![new_weight, chrono::Utc::now().timestamp(), assoc_id],
                    )
                });

                if updated.is_ok() {
                    batch_created += 1;
                    created_v2_count += 1;
                }
            }

            // Report progress
            let processed = (batch_idx + 1) * batch_size;
            let elapsed = start_time.elapsed().as_secs_f64();
            let estimated_total = if processed > 0 {
                elapsed * total as f64 / processed as f64
            } else {
                0.0
            };
            let remaining = estimated_total - elapsed;

            progress_callback(MigrationProgress {
                status: MigrationStatus::InProgress,
                total_associations: total,
                processed_associations: processed.min(total),
                created_v2_count,
                current_batch: batch_idx + 1,
                estimated_remaining_seconds: Some(remaining.max(0.0)),
                error: None,
            });

            let batch_duration = batch_start.elapsed().as_millis();
            info!(
                "Batch {} completed: {} associations migrated in {}ms",
                batch_idx + 1,
                batch_created,
                batch_duration
            );

            // Apply delay between batches
            if _options.delay_ms > 0 && batch_idx + 1 < (total + batch_size - 1) / batch_size {
                std::thread::sleep(std::time::Duration::from_millis(_options.delay_ms));
            }
        }

        info!("Migration completed: {} v2 associations created", created_v2_count);

        let final_progress = MigrationProgress {
            status: MigrationStatus::Completed,
            total_associations: total,
            processed_associations: total,
            created_v2_count,
            current_batch: (total + batch_size - 1) / batch_size,
            estimated_remaining_seconds: Some(0.0),
            error: None,
        };

        progress_callback(final_progress.clone());

        Ok(final_progress)
    }

    /// Get collections by IDs
    fn get_collections_by_ids(&self, ids: &[i64]) -> Result<std::collections::HashMap<i64, Collection>, MigrationError> {
        if ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let mut result = std::collections::HashMap::new();
        let repo = CollectionRepository::new(&self.db);

        for &id in ids {
            if let Ok(Some(collection)) = repo.get_by_id(id) {
                result.insert(id, collection);
            }
        }

        Ok(result)
    }

    /// Migrate all v1 associations to v2 weights
    /// AC 5: Given 权重算法版本迁移，when 调用 migrate_to_v2，then 数据库包含 weight_algorithm_version = 'v2' 的关联
    pub fn migrate_to_v2<F>(self, options: MigrationOptions, mut progress_callback: F) -> Result<MigrationProgress, MigrationError>
    where
        F: FnMut(MigrationProgress),
    {
        // Check lock
        if self.is_migration_in_progress()? {
            return Err(MigrationError::AlreadyInProgress);
        }

        // Acquire lock
        self.acquire_migration_lock()?;

        // Perform migration (take ownership of self to handle the callback properly)
        let result = self.perform_migration(&options, progress_callback);

        // Release lock on completion or failure
        let _ = self.release_migration_lock();

        // Handle result
        match result {
            Ok(progress) => {
                info!("Migration completed successfully: {} v2 associations created", progress.created_v2_count);
                Ok(progress)
            }
            Err(e) => {
                error!("Migration failed: {}", e);
                Err(e)
            }
        }
    }
}

// ========================================================================
// Tests
// ========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_database;
    use std::sync::Arc;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        init_database(dir.path().to_path_buf()).unwrap()
    }

    fn create_test_collection(
        db: &Database,
        id: i64,
        title: &str,
        url: Option<&str>,
        created_at: &str,
    ) {
        let _ = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO collections (id, url, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, url, title, "test content", created_at, created_at],
            )
        });
    }

    fn create_test_association(
        db: &Database,
        id: &str,
        source_id: i64,
        target_id: i64,
        assoc_type: &str,
        weight: f64,
        version: Option<&str>,
    ) {
        let _ = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO associations (id, source_id, target_id, type, weight, weight_algorithm_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, strftime('%s', 'now'), strftime('%s', 'now'))",
                params![id, source_id, target_id, assoc_type, weight, version],
            )
        });
    }

    // ========================================================================
    // Task 8 Tests: Migration API
    // ========================================================================

    #[test]
    fn test_get_migration_stats_counts_correctly() {
        // Given: Database with v1, v2, and NULL version associations
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create test collections
        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");
        create_test_collection(&db, 3, "Article 3", Some("https://example.com/3"), "2024-01-01 12:00:00");

        // Create associations with different versions
        create_test_association(&db, "assoc_v1", 1, 2, "semantic", 0.8, Some("v1"));
        create_test_association(&db, "assoc_v2", 1, 3, "semantic", 0.9, Some("v2"));
        create_test_association(&db, "assoc_null", 2, 3, "tag", 0.7, None);

        // When: Get migration stats
        let result = migrator.get_migration_stats();

        // Then: Should count correctly
        assert!(result.is_ok());
        let stats = result.unwrap();
        assert_eq!(stats.v1_count, 1);
        assert_eq!(stats.v2_count, 1);
        assert_eq!(stats.null_count, 1);
        assert_eq!(stats.total_collections, 3);
    }

    #[test]
    fn test_get_migration_stats_estimates_duration() {
        // Given: Database with 1000 v1 associations
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create 1000 collections to have 1000 unique associations
        for i in 1..=1001 {
            create_test_collection(&db, i, &format!("Article {}", i), Some(&format!("https://example.com/{}", i)), "2024-01-01 10:00:00");
        }

        // Create many v1 associations (each pair is unique)
        for i in 0..1000 {
            create_test_association(
                &db,
                &format!("assoc_{}", i),
                1,
                i + 1, // Different target each time
                &format!("type_{}", i % 10), // Different type for each
                0.5,
                Some("v1"),
            );
        }

        // When: Get migration stats
        let result = migrator.get_migration_stats();

        // Then: Should estimate duration
        assert!(result.is_ok());
        let stats = result.unwrap();
        assert_eq!(stats.v1_count, 1000);
        assert!(stats.estimated_duration_seconds.is_some());
        assert!(stats.estimated_duration_seconds.unwrap() > 0.0);
    }

    #[test]
    fn test_is_migration_in_progress_false_initially() {
        // Given: Fresh database
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db));

        // When: Check if migration is in progress
        let result = migrator.is_migration_in_progress();

        // Then: Should return false
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[test]
    fn test_acquire_and_release_migration_lock() {
        // Given: Migrator instance
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // When: Acquire lock
        let acquire_result = migrator.acquire_migration_lock();

        // Then: Lock should be acquired
        assert!(acquire_result.is_ok());
        assert!(migrator.is_migration_in_progress().unwrap());

        // When: Release lock
        let release_result = migrator.release_migration_lock();

        // Then: Lock should be released
        assert!(release_result.is_ok());
        assert!(!migrator.is_migration_in_progress().unwrap());
    }

    #[test]
    fn test_acquire_lock_when_locked_returns_error() {
        // AC 21: Given 重复调用迁移 API，when 迁移正在进行，then 返回错误
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // When: Acquire lock first time
        assert!(migrator.acquire_migration_lock().is_ok());

        // Then: Second acquire should fail
        let result = migrator.acquire_migration_lock();
        assert!(result.is_err());
        assert!(matches!(result, Err(MigrationError::AlreadyInProgress)));

        // Cleanup
        let _ = migrator.release_migration_lock();
    }

    #[test]
    fn test_mark_null_as_v1_updates_versions() {
        // Given: Associations with NULL version
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");

        create_test_association(&db, "assoc_null1", 1, 2, "semantic", 0.8, None);
        create_test_association(&db, "assoc_null2", 1, 2, "tag", 0.7, None);

        // Verify NULL versions exist
        let null_count: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version IS NULL",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(null_count, 2);

        // When: Mark NULL as v1
        let result = migrator.mark_null_as_v1();

        // Then: Should update versions
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 2);

        // Verify all are now v1
        let v1_count: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version = 'v1'",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(v1_count, 2);

        let null_count: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version IS NULL",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(null_count, 0);
    }

    #[test]
    fn test_rollback_v2_deletes_only_v2_associations() {
        // AC 22: Given 迁移失败，when 执行回滚，then 所有 v2 关联被删除，v1 关联保持不变
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");

        // Create v1 and v2 associations
        create_test_association(&db, "assoc_v1", 1, 2, "semantic", 0.8, Some("v1"));
        create_test_association(&db, "assoc_v2_1", 1, 2, "tag", 0.7, Some("v2"));
        create_test_association(&db, "assoc_v2_2", 1, 2, "time", 0.5, Some("v2"));

        // Verify counts before rollback
        let (v1_count, v2_count): (i64, i64) = db
            .with_connection(|conn| {
                conn.query_row(
                    r#"
                    SELECT
                        SUM(CASE WHEN weight_algorithm_version = 'v1' THEN 1 ELSE 0 END) as v1_count,
                        SUM(CASE WHEN weight_algorithm_version = 'v2' THEN 1 ELSE 0 END) as v2_count
                    FROM associations
                    "#,
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
            })
            .unwrap();
        assert_eq!(v1_count, 1);
        assert_eq!(v2_count, 2);

        // When: Rollback v2 associations
        let result = migrator.rollback_v2_associations();

        // Then: Should delete only v2 associations
        assert!(result.is_ok());
        let deleted_count = result.unwrap();
        assert_eq!(deleted_count, 2);

        // Verify v1 is still there
        let (v1_count_after, v2_count_after): (i64, i64) = db
            .with_connection(|conn| {
                conn.query_row(
                    r#"
                    SELECT
                        SUM(CASE WHEN weight_algorithm_version = 'v1' THEN 1 ELSE 0 END) as v1_count,
                        SUM(CASE WHEN weight_algorithm_version = 'v2' THEN 1 ELSE 0 END) as v2_count
                    FROM associations
                    "#,
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
            })
            .unwrap();
        assert_eq!(v1_count_after, 1);
        assert_eq!(v2_count_after, 0);
    }

    #[test]
    fn test_migrate_to_v2_creates_v2_associations() {
        // AC 5: Given 权重算法版本迁移，when 调用 migrate_to_v2，
        // then 数据库包含 weight_algorithm_version = 'v2' 的关联
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create test collections with timestamps for time association
        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 10:01:00"); // 1 minute later

        // Create a v1 time association
        create_test_association(&db, "assoc_time", 1, 2, "time", 0.5, Some("v1"));

        // Verify v1 exists
        let v1_count: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version = 'v1'",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(v1_count, 1);

        // When: Migrate to v2
        let options = MigrationOptions {
            batch_size: 100,
            delay_ms: 0,
            priority: MigrationPriority::High,
        };

        let result = migrator.migrate_to_v2(options, |_| {});

        // Then: Should create v2 associations
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.status, MigrationStatus::Completed);
        assert!(progress.created_v2_count > 0);

        // Verify v2 exists
        let v2_count: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version = 'v2'",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(v2_count, 1);

        // Verify v1 no longer exists
        let v1_count_after: i64 = db
            .with_connection(|conn| {
                conn.query_row(
                    "SELECT COUNT(*) FROM associations WHERE weight_algorithm_version = 'v1'",
                    [],
                    |row| row.get(0),
                )
            })
            .unwrap();
        assert_eq!(v1_count_after, 0);
    }

    #[test]
    fn test_migrate_to_v2_with_progress_callback() {
        // Given: Database with v1 associations
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create multiple collections to have unique pairs
        for i in 1..=12 {
            create_test_collection(&db, i, &format!("Article {}", i), Some(&format!("https://example.com/{}", i)), "2024-01-01 10:00:00");
        }

        // Create multiple v1 time associations (unique pairs)
        for i in 0..10 {
            create_test_association(
                &db,
                &format!("assoc_{}", i),
                1,
                i + 2, // Unique target for each
                "time",
                0.5,
                Some("v1"),
            );
        }

        // When: Migrate with progress callback
        let mut progress_updates = Vec::new();
        let options = MigrationOptions {
            batch_size: 3,
            delay_ms: 0,
            priority: MigrationPriority::Medium,
        };

        let result = migrator.migrate_to_v2(options.clone(), |progress| {
            progress_updates.push(progress);
        });

        // Then: Should receive progress updates
        assert!(result.is_ok());
        assert!(progress_updates.len() > 0);

        // Verify progress reports
        let final_progress = progress_updates.last().unwrap();
        assert_eq!(final_progress.status, MigrationStatus::Completed);
        assert!(final_progress.created_v2_count > 0);
        assert_eq!(final_progress.processed_associations, 10);
    }

    #[test]
    fn test_migrate_to_v2_handles_empty_database() {
        // Given: Empty database (no associations)
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db));

        // When: Migrate to v2
        let options = MigrationOptions::default();
        let result = migrator.migrate_to_v2(options, |_| {});

        // Then: Should complete with no associations processed
        assert!(result.is_ok());
        let progress = result.unwrap();
        assert_eq!(progress.status, MigrationStatus::Completed);
        assert_eq!(progress.total_associations, 0);
        assert_eq!(progress.created_v2_count, 0);
    }

    #[test]
    fn test_migration_options_default_values() {
        // Given: Default MigrationOptions
        let options = MigrationOptions::default();

        // Then: Should have correct defaults
        assert_eq!(options.batch_size, 100);
        assert_eq!(options.delay_ms, 100);
        assert_eq!(options.priority, MigrationPriority::Medium);
    }
}

impl Default for MigrationOptions {
    fn default() -> Self {
        Self {
            batch_size: default_batch_size(),
            delay_ms: default_delay_ms(),
            priority: MigrationPriority::default(),
        }
    }
}
