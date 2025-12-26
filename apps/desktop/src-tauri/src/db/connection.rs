//! SQLite connection management
//!
//! Handles database initialization and connection pooling.

use rusqlite::{params, Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use thiserror::Error;
use tracing::{debug, error, info};

/// Database error types
#[derive(Error, Debug)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Database not initialized")]
    NotInitialized,

    #[error("Lock error: {0}")]
    Lock(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Thread-safe database wrapper
#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
    path: PathBuf,
}

impl Database {
    /// Create a new database connection
    pub fn new(path: PathBuf) -> Result<Self, DbError> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&path)?;

        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        info!("Database opened at: {:?}", path);

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            path,
        })
    }

    /// Get the database path
    pub fn path(&self) -> &PathBuf {
        &self.path
    }

    /// Execute a function with the connection
    pub fn with_connection<F, T>(&self, f: F) -> Result<T, DbError>
    where
        F: FnOnce(&Connection) -> SqliteResult<T>,
    {
        let conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        f(&conn).map_err(DbError::from)
    }

    /// Execute a function with mutable connection
    pub fn with_connection_mut<F, T>(&self, f: F) -> Result<T, DbError>
    where
        F: FnOnce(&mut Connection) -> SqliteResult<T>,
    {
        let mut conn = self.conn.lock().map_err(|e| DbError::Lock(e.to_string()))?;
        f(&mut conn).map_err(DbError::from)
    }

    /// Run database migrations
    pub fn migrate(&self) -> Result<(), DbError> {
        self.with_connection(|conn| {
            conn.execute_batch(
                r#"
                -- Collections table
                CREATE TABLE IF NOT EXISTS collections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    summary TEXT,
                    starred INTEGER NOT NULL DEFAULT 0,
                    embedding_status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- Index for URL lookups
                CREATE INDEX IF NOT EXISTS idx_collections_url ON collections(url);

                -- Index for created_at sorting
                CREATE INDEX IF NOT EXISTS idx_collections_created_at ON collections(created_at DESC);

                -- Index for embedding status
                CREATE INDEX IF NOT EXISTS idx_collections_embedding_status ON collections(embedding_status);

                -- Embeddings table for vector storage
                -- Stores 384-dimensional f32 vectors as BLOB (384 * 4 = 1536 bytes)
                CREATE TABLE IF NOT EXISTS embeddings (
                    id INTEGER PRIMARY KEY,
                    collection_id INTEGER NOT NULL UNIQUE,
                    vector BLOB NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
                );

                -- Index for collection lookups
                CREATE INDEX IF NOT EXISTS idx_embeddings_collection_id ON embeddings(collection_id);
                "#,
            )?;

            // Migration: Add starred column if not exists (ignore error if already exists)
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN starred INTEGER NOT NULL DEFAULT 0",
                [],
            );

            // Migration: Add favorite_id and status columns to collections table
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN favorite_id INTEGER",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN status TEXT NOT NULL DEFAULT 'active'",
                [],
            );

            // Create favorites table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS favorites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    icon TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE INDEX IF NOT EXISTS idx_favorites_name ON favorites(name);
                CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
                "#,
            )?;

            // Create tags table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    color TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
                CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at DESC);
                "#,
            )?;

            // Create collection_tags junction table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS collection_tags (
                    collection_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    PRIMARY KEY (collection_id, tag_id),
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_collection_tags_collection_id ON collection_tags(collection_id);
                CREATE INDEX IF NOT EXISTS idx_collection_tags_tag_id ON collection_tags(tag_id);
                "#,
            )?;

            // Add foreign key constraint for collections.favorite_id
            let _ = conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_collections_favorite_id ON collections(favorite_id)",
                [],
            );

            // Clean up duplicate "未分类" favorites if any exist
            // Keep only the oldest one and move collections from others to it
            let duplicate_count: i64 = match conn.query_row(
                "SELECT COUNT(*) FROM favorites WHERE name = '未分类'",
                [],
                |row| row.get(0),
            ) {
                Ok(count) => count,
                Err(_) => 0,
            };

            if duplicate_count > 1 {
                // Get the oldest "未分类" favorite (the one to keep)
                let keep_id: i64 = match conn.query_row(
                    "SELECT id FROM favorites WHERE name = '未分类' ORDER BY created_at ASC LIMIT 1",
                    [],
                    |row| row.get(0),
                ) {
                    Ok(id) => id,
                    Err(_) => {
                        error!("Failed to find '未分类' favorite to keep");
                        0
                    }
                };

                if keep_id > 0 {
                    // Move all collections from duplicate "未分类" favorites to the one we're keeping
                    let _ = conn.execute(
                        "UPDATE collections SET favorite_id = ?1 WHERE favorite_id IN (SELECT id FROM favorites WHERE name = '未分类' AND id != ?1)",
                        params![keep_id],
                    );

                    // Delete duplicate "未分类" favorites
                    let deleted = conn.execute(
                        "DELETE FROM favorites WHERE name = '未分类' AND id != ?1",
                        params![keep_id],
                    );
                    match deleted {
                        Ok(count) => {
                            info!("Cleaned up {} duplicate '未分类' favorites, kept id={}", count, keep_id);
                        }
                        Err(e) => {
                            error!("Failed to clean up duplicate '未分类' favorites: {}", e);
                        }
                    }
                }
            }

            // Create default "未分类" (Uncategorized) favorite if it doesn't exist
            let default_favorite_exists: i64 = match conn.query_row(
                "SELECT COUNT(*) FROM favorites WHERE name = '未分类'",
                [],
                |row| row.get(0),
            ) {
                Ok(count) => count,
                Err(e) => {
                    // If query fails (e.g., table doesn't exist yet), log and continue
                    error!("Error checking for default '未分类' favorite: {}", e);
                    0 // Assume it doesn't exist
                }
            };

            if default_favorite_exists == 0 {
                // No existing "未分类", create it
                match conn.execute(
                    "INSERT INTO favorites (name) VALUES ('未分类')",
                    [],
                ) {
                    Ok(_) => {
                        info!("Created default '未分类' favorite");
                    }
                    Err(e) => {
                        // If insert fails (e.g., duplicate), log but don't fail migration
                        error!("Failed to create default '未分类' favorite: {}", e);
                    }
                }
            } else {
                debug!("Default '未分类' favorite already exists (count: {})", default_favorite_exists);
            }

            // ========== Knowledge Graph & AI Schema Extensions ==========

            // Add AI metadata columns to collections table
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN summary_type TEXT",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN content_type TEXT",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN domain TEXT",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN difficulty TEXT",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN language TEXT",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN quality_score REAL",
                [],
            );
            let _ = conn.execute(
                "ALTER TABLE collections ADD COLUMN processed_at INTEGER",
                [],
            );

            // Create associations table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS associations (
                    id TEXT PRIMARY KEY,
                    source_id INTEGER NOT NULL,
                    target_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    types TEXT,
                    weight REAL NOT NULL DEFAULT 0.0,
                    confidence REAL DEFAULT 0.0,
                    quality_score REAL DEFAULT 0.0,
                    reason TEXT,
                    user_feedback TEXT,
                    access_count INTEGER DEFAULT 0,
                    last_accessed_at INTEGER,
                    is_expired INTEGER DEFAULT 0,
                    is_directional INTEGER DEFAULT 0,
                    direction TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (source_id) REFERENCES collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (target_id) REFERENCES collections(id) ON DELETE CASCADE,
                    UNIQUE(source_id, target_id, type)
                );

                CREATE INDEX IF NOT EXISTS idx_associations_source_id ON associations(source_id);
                CREATE INDEX IF NOT EXISTS idx_associations_target_id ON associations(target_id);
                CREATE INDEX IF NOT EXISTS idx_associations_type ON associations(type);
                CREATE INDEX IF NOT EXISTS idx_associations_weight ON associations(weight);
                CREATE INDEX IF NOT EXISTS idx_associations_created_at ON associations(created_at);
                "#,
            )?;

            // Create association_metadata table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS association_metadata (
                    association_id TEXT NOT NULL,
                    semantic_similarity REAL,
                    shared_tags TEXT,
                    shared_folders TEXT,
                    time_interval INTEGER,
                    domain TEXT,
                    keyword_overlap REAL,
                    topic_match REAL,
                    PRIMARY KEY (association_id),
                    FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE
                );
                "#,
            )?;

            // Create keywords table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS keywords (
                    id TEXT PRIMARY KEY,
                    collection_id INTEGER NOT NULL,
                    keyword TEXT NOT NULL,
                    weight REAL NOT NULL DEFAULT 0.0,
                    extraction_method TEXT,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_keywords_collection_id ON keywords(collection_id);
                "#,
            )?;

            // Create topics table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS topics (
                    id TEXT PRIMARY KEY,
                    collection_id INTEGER NOT NULL,
                    topic TEXT NOT NULL,
                    confidence REAL NOT NULL DEFAULT 0.0,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_topics_collection_id ON topics(collection_id);
                "#,
            )?;

            // Create ai_processing_logs table
            conn.execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS ai_processing_logs (
                    id TEXT PRIMARY KEY,
                    collection_id INTEGER NOT NULL,
                    task_type TEXT NOT NULL,
                    model_name TEXT,
                    status TEXT NOT NULL,
                    processing_time INTEGER,
                    error_message TEXT,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_ai_logs_collection_id ON ai_processing_logs(collection_id);
                CREATE INDEX IF NOT EXISTS idx_ai_logs_task_type ON ai_processing_logs(task_type);
                "#,
            )?;

            Ok(())
        })?;

        info!("Database migrations completed");
        Ok(())
    }
}

/// Initialize the database with app data directory
pub fn init_database(app_data_dir: PathBuf) -> Result<Database, DbError> {
    let db_path = app_data_dir.join("data.db");

    info!("Initializing database at: {:?}", db_path);

    let db = Database::new(db_path)?;
    db.migrate()?;

    Ok(db)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_database_creation() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let db = Database::new(db_path.clone()).unwrap();
        assert!(db_path.exists());
    }

    #[test]
    fn test_migrations() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let db = Database::new(db_path).unwrap();
        db.migrate().unwrap();

        // Verify table exists
        db.with_connection(|conn| {
            let count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='collections'",
                [],
                |row| row.get(0),
            )?;
            assert_eq!(count, 1);
            Ok(())
        }).unwrap();
    }
}
