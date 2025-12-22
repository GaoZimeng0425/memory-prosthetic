//! SQLite connection management
//!
//! Handles database initialization and connection pooling.

use rusqlite::{Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use thiserror::Error;
use tracing::{info, error};

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
            )
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
