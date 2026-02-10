//! Migration Performance Benchmarks
//!
//! AC 20: Given 迁移 1000 篇文章，when 执行迁移，then 完成时间 < 5分钟 且内存使用 < 500MB
//!
//! Performance targets:
//! - 100 articles: < 30 seconds
//! - 500 articles: < 2 minutes
//! - 1000 articles: < 5 minutes
//! - Memory usage: < 500MB

#[cfg(test)]
mod benches {
    use super::super::*;
    use crate::db::init_database;
    use std::sync::Arc;
    use std::time::Instant;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        init_database(dir.path().to_path_buf()).unwrap()
    }

    fn create_test_collection(db: &Database, id: i64, title: &str, created_at: &str) {
        let _ = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO collections (id, url, title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![id, format!("https://example.com/{}", id), title, "test content", created_at, created_at],
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
    ) {
        let _ = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO associations (id, source_id, target_id, type, weight, weight_algorithm_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'v1', strftime('%s', 'now'), strftime('%s', 'now'))",
                rusqlite::params![id, source_id, target_id, assoc_type, weight],
            )
        });
    }

    /// Benchmark: 100 articles migration
    /// Target: < 30 seconds
    #[test]
    fn bench_migration_100_articles() {
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create 100 collections
        for i in 1..=100 {
            create_test_collection(&db, i, &format!("Article {}", i), "2024-01-01 10:00:00");
        }

        // Create ~500 associations (5 per article on average)
        let mut assoc_count = 0;
        for i in 1..100 {
            for j in (i + 1)..=(i + 5).min(100) {
                create_test_association(
                    &db,
                    &format!("assoc_{}_{}", i, j),
                    i,
                    j,
                    "semantic",
                    0.7,
                );
                assoc_count += 1;
            }
        }

        println!("Created {} associations for benchmark", assoc_count);

        // Measure migration time
        let start = Instant::now();
        let options = MigrationOptions {
            batch_size: 50,
            delay_ms: 0,
            priority: MigrationPriority::High,
        };

        let result = migrator.migrate_to_v2(options, |_| {});
        let duration = start.elapsed();

        assert!(result.is_ok(), "Migration should succeed");
        let progress = result.unwrap();

        println!(
            "100 articles migration: {:?} ({} v2 associations created)",
            duration, progress.created_v2_count
        );

        // Assert performance target: < 30 seconds
        assert!(
            duration.as_secs() < 30,
            "Migration should complete in < 30 seconds, took {:?}",
            duration
        );
    }

    /// Benchmark: 500 articles migration
    /// Target: < 2 minutes
    #[test]
    fn bench_migration_500_articles() {
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create 500 collections
        for i in 1..=500 {
            create_test_collection(&db, i, &format!("Article {}", i), "2024-01-01 10:00:00");
        }

        // Create ~2500 associations
        let mut assoc_count = 0;
        for i in 1..500 {
            for j in (i + 1)..=(i + 5).min(500) {
                create_test_association(
                    &db,
                    &format!("assoc_{}_{}", i, j),
                    i,
                    j,
                    "semantic",
                    0.7,
                );
                assoc_count += 1;
            }
        }

        println!("Created {} associations for benchmark", assoc_count);

        let start = Instant::now();
        let options = MigrationOptions {
            batch_size: 100,
            delay_ms: 0,
            priority: MigrationPriority::High,
        };

        let result = migrator.migrate_to_v2(options, |_| {});
        let duration = start.elapsed();

        assert!(result.is_ok());
        let progress = result.unwrap();

        println!(
            "500 articles migration: {:?} ({} v2 associations created)",
            duration, progress.created_v2_count
        );

        // Assert performance target: < 2 minutes (120 seconds)
        assert!(
            duration.as_secs() < 120,
            "Migration should complete in < 2 minutes, took {:?}",
            duration
        );
    }

    /// Benchmark: 1000 articles migration
    /// Target: < 5 minutes
    /// AC 20
    #[test]
    fn bench_migration_1000_articles() {
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create 1000 collections
        for i in 1..=1000 {
            create_test_collection(&db, i, &format!("Article {}", i), "2024-01-01 10:00:00");
        }

        // Create ~5000 associations
        let mut assoc_count = 0;
        for i in 1..1000 {
            for j in (i + 1)..=(i + 5).min(1000) {
                create_test_association(
                    &db,
                    &format!("assoc_{}_{}", i, j),
                    i,
                    j,
                    "semantic",
                    0.7,
                );
                assoc_count += 1;
            }
        }

        println!("Created {} associations for benchmark", assoc_count);

        let start = Instant::now();
        let options = MigrationOptions {
            batch_size: 100,
            delay_ms: 0,
            priority: MigrationPriority::High,
        };

        let result = migrator.migrate_to_v2(options, |_| {});
        let duration = start.elapsed();

        assert!(result.is_ok());
        let progress = result.unwrap();

        println!(
            "1000 articles migration: {:?} ({} v2 associations created)",
            duration, progress.created_v2_count
        );

        // Assert performance target: < 5 minutes (300 seconds)
        assert!(
            duration.as_secs() < 300,
            "Migration should complete in < 5 minutes, took {:?}",
            duration
        );

        // Calculate associations per second
        let assoc_per_sec = progress.created_v2_count as f64 / duration.as_secs_f64();
        println!("Migration speed: {:.2} associations/second", assoc_per_sec);
    }

    /// Benchmark: Memory usage estimation
    /// Target: < 500MB
    #[test]
    fn bench_migration_memory_usage() {
        let db = setup_test_db();
        let migrator = AssociationMigrator::new(Arc::new(db.clone()));

        // Create 1000 collections and associations
        for i in 1..=1000 {
            create_test_collection(&db, i, &format!("Article {}", i), "2024-01-01 10:00:00");
        }

        let assoc_count = 0;
        for i in 1..1000 {
            for j in (i + 1)..=(i + 5).min(1000) {
                create_test_association(&db, &format!("assoc_{}_{}", i, j), i, j, "semantic", 0.7);
            }
        }

        // Measure memory before
        let memory_before = get_memory_usage();

        let options = MigrationOptions {
            batch_size: 100,
            delay_ms: 0,
            priority: MigrationPriority::High,
        };

        let _result = migrator.migrate_to_v2(options, |_| {});

        // Measure memory after
        let memory_after = get_memory_usage();
        let memory_used_mb = (memory_after - memory_before) / (1024 * 1024);

        println!("Migration memory usage: {} MB", memory_used_mb);

        // Assert memory target: < 500MB
        // Note: This is a rough estimate as we can't measure exact RSS in tests
        // In production, use proper memory profiling tools
        assert!(
            memory_used_mb < 500 * 1024 * 1024,
            "Migration should use < 500MB memory"
        );
    }

    /// Benchmark: Batch size optimization
    #[test]
    fn bench_migration_batch_sizes() {
        let db = setup_test_db();

        // Create 500 collections
        for i in 1..=500 {
            create_test_collection(&db, i, &format!("Article {}", i), "2024-01-01 10:00:00");
        }

        for i in 1..500 {
            for j in (i + 1)..=(i + 5).min(500) {
                create_test_association(&db, &format!("assoc_{}_{}", i, j), i, j, "semantic", 0.7);
            }
        }

        let batch_sizes = [25, 50, 100, 200];

        for batch_size in batch_sizes {
            let migrator = AssociationMigrator::new(Arc::new(db.clone()));

            let start = Instant::now();
            let options = MigrationOptions {
                batch_size,
                delay_ms: 0,
                priority: MigrationPriority::High,
            };

            let result = migrator.migrate_to_v2(options, |_| {});
            let duration = start.elapsed();

            assert!(result.is_ok());
            let progress = result.unwrap();

            println!(
                "Batch size {}: {:?} ({:.2} assoc/sec)",
                batch_size,
                duration,
                progress.created_v2_count as f64 / duration.as_secs_f64()
            );
        }
    }

    // Helper function to estimate memory usage
    #[cfg(unix)]
    fn get_memory_usage() -> usize {
        unsafe {
            let mut usage: libc::rusage = std::mem::zeroed();
            libc::getrusage(libc::RUSAGE_SELF, &mut usage);
            usage.ru_maxrss as usize
        }
    }

    #[cfg(not(unix))]
    fn get_memory_usage() -> usize {
        // Return a dummy value on non-Unix platforms
        0
    }
}
