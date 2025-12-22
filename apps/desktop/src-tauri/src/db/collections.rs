//! Collections CRUD operations
//!
//! Provides repository pattern for managing collected web content.

use super::connection::{Database, DbError};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tracing::info;

/// Embedding status for a collection
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EmbeddingStatus {
    Pending,
    Processing,
    Done,
    Failed,
}

impl EmbeddingStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            EmbeddingStatus::Pending => "pending",
            EmbeddingStatus::Processing => "processing",
            EmbeddingStatus::Done => "done",
            EmbeddingStatus::Failed => "failed",
        }
    }
}

impl From<String> for EmbeddingStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "pending" => EmbeddingStatus::Pending,
            "processing" => EmbeddingStatus::Processing,
            "done" => EmbeddingStatus::Done,
            "failed" => EmbeddingStatus::Failed,
            _ => EmbeddingStatus::Pending,
        }
    }
}

/// Collection entity from database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub embedding_status: EmbeddingStatus,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a new collection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollection {
    pub url: String,
    pub title: String,
    pub content: String,
}

/// Collection statistics
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionStats {
    pub total: i64,
    pub this_week: i64,
    pub last_collected_at: Option<String>,
}

/// Collection list item (lightweight)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionListItem {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub domain: String,
    pub created_at: String,
}

/// Repository for collection operations
pub struct CollectionRepository<'a> {
    db: &'a Database,
}

impl<'a> CollectionRepository<'a> {
    /// Create a new repository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Insert a new collection or update if URL exists
    pub fn upsert(&self, input: &CreateCollection) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            // Try to find existing by URL
            let existing_id: Option<i64> = conn
                .query_row(
                    "SELECT id FROM collections WHERE url = ?1",
                    params![&input.url],
                    |row| row.get(0),
                )
                .ok();

            if let Some(id) = existing_id {
                // Update existing
                conn.execute(
                    r#"
                    UPDATE collections
                    SET title = ?1, content = ?2, updated_at = datetime('now')
                    WHERE id = ?3
                    "#,
                    params![&input.title, &input.content, id],
                )?;
                info!("Updated collection id={}", id);
                Ok(id)
            } else {
                // Insert new
                conn.execute(
                    r#"
                    INSERT INTO collections (url, title, content)
                    VALUES (?1, ?2, ?3)
                    "#,
                    params![&input.url, &input.title, &input.content],
                )?;
                let id = conn.last_insert_rowid();
                info!("Inserted new collection id={}", id);
                Ok(id)
            }
        })
    }

    /// Get a collection by ID
    pub fn get_by_id(&self, id: i64) -> Result<Option<Collection>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, url, title, content, summary, embedding_status, created_at, updated_at
                FROM collections
                WHERE id = ?1
                "#,
                params![id],
                |row| Self::row_to_collection(row),
            );

            match result {
                Ok(collection) => Ok(Some(collection)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
    }

    /// Get a collection by URL
    pub fn get_by_url(&self, url: &str) -> Result<Option<Collection>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, url, title, content, summary, embedding_status, created_at, updated_at
                FROM collections
                WHERE url = ?1
                "#,
                params![url],
                |row| Self::row_to_collection(row),
            );

            match result {
                Ok(collection) => Ok(Some(collection)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
    }

    /// Get collections with pending embedding status
    pub fn get_pending_embeddings(&self, limit: i64) -> Result<Vec<Collection>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, content, summary, embedding_status, created_at, updated_at
                FROM collections
                WHERE embedding_status = 'pending'
                ORDER BY created_at ASC
                LIMIT ?1
                "#,
            )?;

            let rows = stmt.query_map(params![limit], |row| Self::row_to_collection(row))?;

            let mut collections = Vec::new();
            for row in rows {
                collections.push(row?);
            }
            Ok(collections)
        })
    }

    /// Update embedding status for a collection
    pub fn update_embedding_status(&self, id: i64, status: &EmbeddingStatus) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE collections SET embedding_status = ?1 WHERE id = ?2",
                params![status.as_str(), id],
            )?;
            Ok(())
        })
    }

    /// List all collections (paginated)
    pub fn list(&self, limit: i64, offset: i64) -> Result<Vec<CollectionListItem>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, url, title, created_at
                FROM collections
                ORDER BY created_at DESC
                LIMIT ?1 OFFSET ?2
                "#,
            )?;

            let rows = stmt.query_map(params![limit, offset], |row| {
                let url: String = row.get(1)?;
                let domain = extract_domain(&url);

                Ok(CollectionListItem {
                    id: row.get(0)?,
                    url,
                    title: row.get(2)?,
                    domain,
                    created_at: row.get(3)?,
                })
            })?;

            let mut collections = Vec::new();
            for row in rows {
                collections.push(row?);
            }

            Ok(collections)
        })
    }

    /// Delete a collection by ID
    pub fn delete(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            let rows_affected = conn.execute(
                "DELETE FROM collections WHERE id = ?1",
                params![id],
            )?;

            if rows_affected > 0 {
                info!("Deleted collection id={}", id);
            }

            Ok(rows_affected > 0)
        })
    }

    /// Get collection statistics
    pub fn get_stats(&self) -> Result<CollectionStats, DbError> {
        self.db.with_connection(|conn| {
            let total: i64 = conn.query_row(
                "SELECT COUNT(*) FROM collections",
                [],
                |row| row.get(0),
            )?;

            let this_week: i64 = conn.query_row(
                r#"
                SELECT COUNT(*) FROM collections
                WHERE created_at >= datetime('now', '-7 days')
                "#,
                [],
                |row| row.get(0),
            )?;

            let last_collected_at: Option<String> = conn
                .query_row(
                    "SELECT created_at FROM collections ORDER BY created_at DESC LIMIT 1",
                    [],
                    |row| row.get(0),
                )
                .ok();

            Ok(CollectionStats {
                total,
                this_week,
                last_collected_at,
            })
        })
    }

    /// Count total collections
    pub fn count(&self) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            conn.query_row("SELECT COUNT(*) FROM collections", [], |row| row.get(0))
        })
    }

    /// Helper to convert a row to Collection
    fn row_to_collection(row: &Row<'_>) -> rusqlite::Result<Collection> {
        let status_str: String = row.get(5)?;
        Ok(Collection {
            id: row.get(0)?,
            url: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            summary: row.get(4)?,
            embedding_status: EmbeddingStatus::from(status_str),
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }
}

/// Extract domain from URL
fn extract_domain(url: &str) -> String {
    url.trim_start_matches("https://")
        .trim_start_matches("http://")
        .split('/')
        .next()
        .unwrap_or(url)
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_database;
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        init_database(dir.path().to_path_buf()).unwrap()
    }

    #[test]
    fn test_insert_and_get() {
        let db = setup_test_db();
        let repo = CollectionRepository::new(&db);

        let input = CreateCollection {
            url: "https://example.com/article".to_string(),
            title: "Test Article".to_string(),
            content: "This is test content.".to_string(),
        };

        let id = repo.upsert(&input).unwrap();
        assert!(id > 0);

        let collection = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(collection.url, input.url);
        assert_eq!(collection.title, input.title);
        assert_eq!(collection.content, input.content);
    }

    #[test]
    fn test_upsert_updates_existing() {
        let db = setup_test_db();
        let repo = CollectionRepository::new(&db);

        let input1 = CreateCollection {
            url: "https://example.com/article".to_string(),
            title: "Original Title".to_string(),
            content: "Original content.".to_string(),
        };

        let id1 = repo.upsert(&input1).unwrap();

        let input2 = CreateCollection {
            url: "https://example.com/article".to_string(),
            title: "Updated Title".to_string(),
            content: "Updated content.".to_string(),
        };

        let id2 = repo.upsert(&input2).unwrap();

        // Should be same ID (updated, not inserted)
        assert_eq!(id1, id2);

        let collection = repo.get_by_id(id1).unwrap().unwrap();
        assert_eq!(collection.title, "Updated Title");
    }

    #[test]
    fn test_delete() {
        let db = setup_test_db();
        let repo = CollectionRepository::new(&db);

        let input = CreateCollection {
            url: "https://example.com/delete-me".to_string(),
            title: "To Delete".to_string(),
            content: "Content".to_string(),
        };

        let id = repo.upsert(&input).unwrap();
        assert!(repo.get_by_id(id).unwrap().is_some());

        let deleted = repo.delete(id).unwrap();
        assert!(deleted);

        assert!(repo.get_by_id(id).unwrap().is_none());
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("https://example.com/path"), "example.com");
        assert_eq!(extract_domain("http://sub.example.com/"), "sub.example.com");
        assert_eq!(extract_domain("https://example.com"), "example.com");
    }
}
