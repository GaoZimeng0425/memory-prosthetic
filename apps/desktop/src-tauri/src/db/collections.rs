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

/// Collection status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum CollectionStatus {
    Active,
    Archived,
    Deleted,
}

impl CollectionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            CollectionStatus::Active => "active",
            CollectionStatus::Archived => "archived",
            CollectionStatus::Deleted => "deleted",
        }
    }
}

impl From<String> for CollectionStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "active" => CollectionStatus::Active,
            "archived" => CollectionStatus::Archived,
            "deleted" => CollectionStatus::Deleted,
            _ => CollectionStatus::Active,
        }
    }
}

/// Collection entity from database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: i64,
    pub url: Option<String>, // Optional: NULL for user-created notes
    pub title: String,
    pub content: String,
    pub summary: Option<String>,
    pub starred: bool,
    pub embedding_status: EmbeddingStatus,
    pub favorite_id: Option<i64>,
    pub status: CollectionStatus,
    #[serde(default = "default_collection_type")]
    pub r#type: String,
    pub created_at: String,
    pub updated_at: String,
}

fn default_collection_type() -> String {
    "网页".to_string()
}

fn default_collection_type_option() -> Option<String> {
    Some("网页".to_string())
}

/// Input for creating a new collection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollection {
    pub url: Option<String>, // Optional: NULL for user-created notes
    pub title: String,
    pub content: String,
    #[serde(default = "default_collection_type_option")]
    pub r#type: Option<String>, // Optional, defaults to '网页' if None
}

/// Input for creating a new note (user-created content without URL)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNote {
    pub title: String,
    pub content: String,
    pub favorite_id: Option<i64>,
    #[serde(default = "default_note_type")]
    pub r#type: Option<String>, // Optional, defaults to '笔记' if None
}

fn default_note_type() -> Option<String> {
    Some("笔记".to_string())
}

/// Collection statistics
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionStats {
    pub total: i64,
    pub this_week: i64,
    pub archived: i64,
    pub deleted: i64,
    pub last_collected_at: Option<String>,
}

/// Collection list item (lightweight)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionListItem {
    pub id: i64,
    pub url: Option<String>, // Optional: NULL for user-created notes
    pub title: String,
    pub domain: String,
    pub starred: bool,
    pub favorite_id: Option<i64>,
    #[serde(default = "default_collection_type")]
    pub r#type: String, // Collection type, defaults to '网页'
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

    /// Insert a new collection, replacing existing if URL exists
    /// This deletes the old record (and its embeddings via CASCADE) and inserts a new one
    /// Note: For notes (url=None), this will not delete existing records (no URL to match)
    pub fn upsert(&self, input: &CreateCollection) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            // Delete existing record with same URL (only if URL is provided)
            // For notes (url=None), skip deletion step
            if let Some(ref url) = input.url {
                let deleted = conn.execute(
                    "DELETE FROM collections WHERE url = ?1",
                    params![url],
                )?;

                if deleted > 0 {
                    info!("Deleted existing collection with url={}", url);
                }
            }

            // Determine type value (use provided type or default to '网页')
            let type_value = input.r#type.as_ref().map(|s| s.as_str()).unwrap_or("网页");

            // Insert new record
            conn.execute(
                r#"
                INSERT INTO collections (url, title, content, type)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![&input.url, &input.title, &input.content, type_value],
            )?;

            let id = conn.last_insert_rowid();
            if let Some(ref url) = input.url {
                info!("Inserted new collection id={} url={} type={}", id, url, type_value);
            } else {
                info!("Inserted new collection id={} url=NULL type={}", id, type_value);
            }
            Ok(id)
        })
    }

    /// Create a new note (user-created content without URL)
    /// Notes have url=NULL and type defaults to '笔记' if not specified
    pub fn create_note(&self, input: &CreateNote) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            // Use provided type or default to '笔记'
            let type_value = input.r#type.as_deref().unwrap_or("笔记");

            // Insert new note with url=NULL
            conn.execute(
                r#"
                INSERT INTO collections (url, title, content, type, favorite_id)
                VALUES (NULL, ?1, ?2, ?3, ?4)
                "#,
                params![&input.title, &input.content, type_value, &input.favorite_id],
            )?;

            let id = conn.last_insert_rowid();
            info!("Created new note id={} title={} type={} favorite_id={:?}", id, &input.title, type_value, &input.favorite_id);
            Ok(id)
        })
    }

    /// Get a collection by ID
    pub fn get_by_id(&self, id: i64) -> Result<Option<Collection>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, url, title, content, summary, starred, embedding_status, favorite_id, status, type, created_at, updated_at
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
                SELECT id, url, title, content, summary, starred, embedding_status, favorite_id, status, type, created_at, updated_at
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
                SELECT id, url, title, content, summary, starred, embedding_status, favorite_id, status, type, created_at, updated_at
                FROM collections
                WHERE embedding_status = 'pending' AND status = 'active'
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

    /// List collections with optional filters (paginated)
    pub fn list(
        &self,
        limit: i64,
        offset: i64,
        favorite_id: Option<i64>,
        uncategorized: bool,
        tag_ids: Option<&[i64]>,
        status: Option<CollectionStatus>,
    ) -> Result<Vec<CollectionListItem>, DbError> {
        self.db.with_connection(|conn| {
            let status_filter = status.unwrap_or(CollectionStatus::Active);
            let status_str = status_filter.as_str();

            // Build query based on filters
            // For tag filtering, we'll use a simpler approach with a JOIN
            if let Some(tag_ids) = tag_ids {
                if !tag_ids.is_empty() {
                    // Use EXISTS for tag filtering - simpler and more efficient
                    // This will match collections that have ANY of the specified tags
                    // Convert tag_ids to JSON array for json_each
                    let tag_ids_json = serde_json::to_string(tag_ids).map_err(|e| {
                        rusqlite::Error::SqliteFailure(
                            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                            Some(format!("Failed to serialize tag_ids: {}", e)),
                        )
                    })?;

                    // Helper closure to map rows
                    let map_row = |row: &Row<'_>| -> rusqlite::Result<CollectionListItem> {
                        let url: Option<String> = row.get(1)?;
                        let domain = url.as_ref().map(|u| extract_domain(u)).unwrap_or_else(|| "笔记".to_string());
                        let starred: i64 = row.get(3)?;
                        let favorite_id: Option<i64> = row.get(4)?;
                        let type_str: String = row.get(6).unwrap_or_else(|_| "网页".to_string());

                        Ok(CollectionListItem {
                            id: row.get(0)?,
                            url,
                            title: row.get(2)?,
                            domain,
                            starred: starred != 0,
                            favorite_id,
                            r#type: type_str,
                            created_at: row.get(5)?,
                        })
                    };

                    // This will match collections that have ANY of the specified tags
                    let sql = if uncategorized {
                        r#"
                        SELECT DISTINCT c.id, c.url, c.title, c.starred, c.favorite_id, c.created_at, c.type
                        FROM collections c
                        WHERE c.status = ?1
                          AND c.favorite_id IS NULL
                          AND EXISTS (
                              SELECT 1 FROM collection_tags ct
                              WHERE ct.collection_id = c.id
                                AND ct.tag_id IN (SELECT value FROM json_each(?2))
                          )
                        ORDER BY c.created_at DESC
                        LIMIT ?3 OFFSET ?4
                        "#
                    } else if favorite_id.is_some() {
                        r#"
                        SELECT DISTINCT c.id, c.url, c.title, c.starred, c.favorite_id, c.created_at, c.type
                        FROM collections c
                        WHERE c.status = ?1
                          AND c.favorite_id = ?2
                          AND EXISTS (
                              SELECT 1 FROM collection_tags ct
                              WHERE ct.collection_id = c.id
                                AND ct.tag_id IN (SELECT value FROM json_each(?3))
                          )
                        ORDER BY c.created_at DESC
                        LIMIT ?4 OFFSET ?5
                        "#
                    } else {
                        r#"
                        SELECT DISTINCT c.id, c.url, c.title, c.starred, c.favorite_id, c.created_at, c.type
                        FROM collections c
                        WHERE c.status = ?1
                          AND EXISTS (
                              SELECT 1 FROM collection_tags ct
                              WHERE ct.collection_id = c.id
                                AND ct.tag_id IN (SELECT value FROM json_each(?2))
                          )
                        ORDER BY c.created_at DESC
                        LIMIT ?3 OFFSET ?4
                        "#
                    };

                    let mut stmt = conn.prepare(sql)?;
                    let rows = if uncategorized {
                        stmt.query_map(
                            params![status_str, tag_ids_json, limit, offset],
                            map_row,
                        )?
                    } else if let Some(fav_id) = favorite_id {
                        stmt.query_map(
                            params![status_str, fav_id, tag_ids_json, limit, offset],
                            map_row,
                        )?
                    } else {
                        stmt.query_map(
                            params![status_str, tag_ids_json, limit, offset],
                            map_row,
                        )?
                    };

                    let mut collections = Vec::new();
                    for row in rows {
                        collections.push(row?);
                    }
                    return Ok(collections);
                }
            }

            // Simple query without tag filtering
            // Helper function to map rows
            let map_row = |row: &Row<'_>| -> rusqlite::Result<CollectionListItem> {
                let url: Option<String> = row.get(1)?;
                let domain = url.as_ref().map(|u| extract_domain(u)).unwrap_or_else(|| "笔记".to_string());
                let starred: i64 = row.get(3)?;
                let favorite_id: Option<i64> = row.get(4)?;
                let type_str: String = row.get(6).unwrap_or_else(|_| "网页".to_string());

                Ok(CollectionListItem {
                    id: row.get(0)?,
                    url,
                    title: row.get(2)?,
                    domain,
                    starred: starred != 0,
                    favorite_id,
                    r#type: type_str,
                    created_at: row.get(5)?,
                })
            };

            let mut collections = Vec::new();

            if uncategorized {
                // Query for collections with favorite_id IS NULL
                let sql = r#"
                    SELECT id, url, title, starred, favorite_id, created_at, type
                    FROM collections
                    WHERE status = ?1 AND favorite_id IS NULL
                    ORDER BY created_at DESC
                    LIMIT ?2 OFFSET ?3
                    "#;
                let mut stmt = conn.prepare(sql)?;
                let rows = stmt.query_map(params![status_str, limit, offset], map_row)?;
                for row in rows {
                    collections.push(row?);
                }
            } else {
                match favorite_id {
                    Some(fav_id) => {
                        let sql = r#"
                            SELECT id, url, title, starred, favorite_id, created_at, type
                            FROM collections
                            WHERE status = ?1 AND favorite_id = ?2
                            ORDER BY created_at DESC
                            LIMIT ?3 OFFSET ?4
                            "#;
                        let mut stmt = conn.prepare(sql)?;
                        let rows = stmt.query_map(params![status_str, fav_id, limit, offset], map_row)?;
                        for row in rows {
                            collections.push(row?);
                        }
                    }
                    None => {
                        // No favorite filter - return all collections
                        let sql = r#"
                            SELECT id, url, title, starred, favorite_id, created_at, type
                            FROM collections
                            WHERE status = ?1
                            ORDER BY created_at DESC
                            LIMIT ?2 OFFSET ?3
                            "#;
                        let mut stmt = conn.prepare(sql)?;
                        let rows = stmt.query_map(params![status_str, limit, offset], map_row)?;
                        for row in rows {
                            collections.push(row?);
                        }
                    }
                }
            }

            Ok(collections)
        })
    }

    /// Toggle starred status for a collection
    pub fn toggle_star(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            // Get current starred status
            let current: i64 = conn.query_row(
                "SELECT starred FROM collections WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;

            let new_status = if current != 0 { 0 } else { 1 };

            conn.execute(
                "UPDATE collections SET starred = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![new_status, id],
            )?;

            info!("Toggled star for collection id={} to {}", id, new_status != 0);
            Ok(new_status != 0)
        })
    }

    /// Soft delete a collection (set status to 'deleted')
    pub fn delete(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            let rows_affected = conn.execute(
                "UPDATE collections SET status = 'deleted', updated_at = datetime('now') WHERE id = ?1",
                params![id],
            )?;

            if rows_affected > 0 {
                info!("Soft deleted collection id={}", id);
            }

            Ok(rows_affected > 0)
        })
    }

    /// Permanently delete a collection (hard delete)
    pub fn permanently_delete(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            let rows_affected = conn.execute(
                "DELETE FROM collections WHERE id = ?1",
                params![id],
            )?;

            if rows_affected > 0 {
                info!("Permanently deleted collection id={}", id);
            }

            Ok(rows_affected > 0)
        })
    }

    /// Cleanup deleted collections older than specified days
    pub fn cleanup_deleted_older_than(&self, days: u32) -> Result<usize, DbError> {
        self.db.with_connection(|conn| {
            let sql = format!(
                "DELETE FROM collections WHERE status = 'deleted' AND updated_at < datetime('now', '-{} days')",
                days
            );

            let rows_affected = conn.execute(&sql, [])?;
            if rows_affected > 0 {
                info!("Cleaned up {} deleted collections older than {} days", rows_affected, days);
            }

            Ok(rows_affected as usize)
        })
    }

    /// Archive a collection (set status to 'archived')
    pub fn archive(&self, id: i64) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE collections SET status = 'archived', updated_at = datetime('now') WHERE id = ?1",
                params![id],
            )?;

            info!("Archived collection id={}", id);
            Ok(())
        })
    }

    /// Restore a collection (set status to 'active')
    pub fn restore(&self, id: i64) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                "UPDATE collections SET status = 'active', updated_at = datetime('now') WHERE id = ?1",
                params![id],
            )?;

            info!("Restored collection id={}", id);
            Ok(())
        })
    }

    /// Update collection favorite
    /// If favorite_id is None, it will be converted to the "未分类" favorite ID
    pub fn set_favorite(&self, id: i64, favorite_id: Option<i64>) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            // If favorite_id is None, find the "未分类" favorite ID
            let final_favorite_id = if favorite_id.is_none() {
                match conn.query_row(
                    "SELECT id FROM favorites WHERE name = '未分类' ORDER BY created_at ASC LIMIT 1",
                    [],
                    |row| row.get(0),
                ) {
                    Ok(uncategorized_id) => Some(uncategorized_id),
                    Err(e) => {
                        tracing::error!("Failed to find '未分类' favorite: {}", e);
                        return Err(e);
                    }
                }
            } else {
                favorite_id
            };

            conn.execute(
                "UPDATE collections SET favorite_id = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![final_favorite_id, id],
            )?;

            info!("Updated collection id={} favorite_id={:?}", id, final_favorite_id);
            Ok(())
        })
    }

    /// Get collection statistics
    pub fn get_stats(&self) -> Result<CollectionStats, DbError> {
        self.db.with_connection(|conn| {
            // Total count should only include active collections
            let total: i64 = conn.query_row(
                "SELECT COUNT(*) FROM collections WHERE status = 'active'",
                [],
                |row| row.get(0),
            )?;

            // This week count should only include active collections
            let this_week: i64 = conn.query_row(
                r#"
                SELECT COUNT(*) FROM collections
                WHERE status = 'active' AND created_at >= datetime('now', '-7 days')
                "#,
                [],
                |row| row.get(0),
            )?;

            // Last collected at should only consider active collections
            let last_collected_at: Option<String> = conn
                .query_row(
                    "SELECT created_at FROM collections WHERE status = 'active' ORDER BY created_at DESC LIMIT 1",
                    [],
                    |row| row.get(0),
                )
                .ok();

            // Get archived count
            let archived: i64 = conn.query_row(
                "SELECT COUNT(*) FROM collections WHERE status = 'archived'",
                [],
                |row| row.get(0),
            )?;

            // Get deleted count
            let deleted: i64 = conn.query_row(
                "SELECT COUNT(*) FROM collections WHERE status = 'deleted'",
                [],
                |row| row.get(0),
            )?;

            Ok(CollectionStats {
                total,
                this_week,
                archived,
                deleted,
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
        let starred: i64 = row.get(5)?;
        let embedding_status_str: String = row.get(6)?;
        let favorite_id: Option<i64> = row.get(7)?;
        let status_str: String = row.get(8)?;
        let type_str: String = row.get(9)?;
        Ok(Collection {
            id: row.get(0)?,
            url: row.get(1)?, // Option<String> - can be NULL for notes
            title: row.get(2)?,
            content: row.get(3)?,
            summary: row.get(4)?,
            starred: starred != 0,
            embedding_status: EmbeddingStatus::from(embedding_status_str),
            favorite_id,
            status: CollectionStatus::from(status_str),
            r#type: type_str,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
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
            url: Some("https://example.com/article".to_string()),
            title: "Test Article".to_string(),
            content: "This is test content.".to_string(),
            r#type: Some("网页".to_string()),
        };

        let id = repo.upsert(&input).unwrap();
        assert!(id > 0);

        let collection = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(collection.url, input.url);
        assert_eq!(collection.title, input.title);
        assert_eq!(collection.content, input.content);
    }

    #[test]
    fn test_upsert_replaces_existing() {
        let db = setup_test_db();
        let repo = CollectionRepository::new(&db);

        let input1 = CreateCollection {
            url: Some("https://example.com/article".to_string()),
            title: "Original Title".to_string(),
            content: "Original content.".to_string(),
            r#type: Some("网页".to_string()),
        };

        let id1 = repo.upsert(&input1).unwrap();

        let input2 = CreateCollection {
            url: Some("https://example.com/article".to_string()),
            title: "Updated Title".to_string(),
            content: "Updated content.".to_string(),
            r#type: Some("网页".to_string()),
        };

        let id2 = repo.upsert(&input2).unwrap();

        // Should be different ID (old deleted, new inserted)
        assert_ne!(id1, id2);

        // Old record should not exist
        assert!(repo.get_by_id(id1).unwrap().is_none());

        // New record should have updated content
        let collection = repo.get_by_id(id2).unwrap().unwrap();
        assert_eq!(collection.title, "Updated Title");
        assert_eq!(collection.content, "Updated content.");
    }

    #[test]
    fn test_delete() {
        let db = setup_test_db();
        let repo = CollectionRepository::new(&db);

        let input = CreateCollection {
            url: Some("https://example.com/delete-me".to_string()),
            title: "To Delete".to_string(),
            content: "Content".to_string(),
            r#type: Some("网页".to_string()),
        };

        let id = repo.upsert(&input).unwrap();
        let collection = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(collection.status, CollectionStatus::Active);

        // Soft delete
        let deleted = repo.delete(id).unwrap();
        assert!(deleted);

        // Collection still exists but with deleted status
        let deleted_collection = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(deleted_collection.status, CollectionStatus::Deleted);

        // Should not appear in active list
        let active_list = repo.list(10, 0, None, false, None, Some(CollectionStatus::Active)).unwrap();
        assert!(!active_list.iter().any(|c| c.id == id));
    }

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("https://example.com/path"), "example.com");
        assert_eq!(extract_domain("http://sub.example.com/"), "sub.example.com");
        assert_eq!(extract_domain("https://example.com"), "example.com");
    }

    /// Test sync query logic - LEFT JOIN + GROUP BY + conditional aggregation
    /// This test verifies the optimized query structure used in /api/sync endpoint
    #[test]
    fn test_sync_query_structure() {
        let db = setup_test_db();

        // Create a new favorite for testing
        let fav_repo = crate::db::FavoriteRepository::new(&db);
        let fav1_id = fav_repo.create(&crate::db::CreateFavorite {
            name: "测试收藏夹".to_string(),
            icon: Some("📁".to_string()),
        }).unwrap();

        // Create test collections
        let coll_repo = CollectionRepository::new(&db);

        // Add 3 collections to fav1
        for i in 1..=3 {
            let input = CreateCollection {
                url: Some(format!("https://example.com/article{}", i)),
                title: format!("Article {}", i),
                content: "Content".to_string(),
                r#type: Some("网页".to_string()),
            };
            let id = coll_repo.upsert(&input).unwrap();
            coll_repo.set_favorite(id, Some(fav1_id)).unwrap();
        }

        // Verify counts using raw SQL query (same as in handler)
        db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT f.id, f.name, COUNT(c.id) as count
                FROM favorites f
                LEFT JOIN collections c
                    ON c.favorite_id = f.id AND c.status = 'active'
                WHERE f.id = ?1
                GROUP BY f.id
                "#,
            ).unwrap();

            let result = stmt.query_row([&fav1_id], |row| {
                Ok((
                    row.get::<_, String>(1)?, // name
                    row.get::<_, i64>(2)?,    // count
                ))
            });

            assert!(result.is_ok(), "Query should succeed");

            let (name, count) = result.unwrap();
            assert_eq!(name, "测试收藏夹");
            assert_eq!(count, 3); // 3 collections

            Ok::<_, rusqlite::Error>(())
        }).unwrap();
    }

    /// Test conditional aggregation for stats query
    #[test]
    fn test_sync_stats_conditional_aggregation() {
        let db = setup_test_db();
        let coll_repo = CollectionRepository::new(&db);

        // Create active collections
        for i in 1..=5 {
            let input = CreateCollection {
                url: Some(format!("https://example.com/active{}", i)),
                title: format!("Active {}", i),
                content: "Content".to_string(),
                r#type: Some("网页".to_string()),
            };
            coll_repo.upsert(&input).unwrap();
        }

        // Create archived collections
        for i in 1..=2 {
            let input = CreateCollection {
                url: Some(format!("https://example.com/archived{}", i)),
                title: format!("Archived {}", i),
                content: "Content".to_string(),
                r#type: Some("网页".to_string()),
            };
            let id = coll_repo.upsert(&input).unwrap();
            coll_repo.archive(id).unwrap();
        }

        // Verify conditional aggregation
        db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT
                    COUNT(*) FILTER (WHERE status = 'active') as total,
                    COUNT(*) FILTER (WHERE status = 'active' AND created_at >= datetime('now', '-7 days')) as this_week,
                    COUNT(*) FILTER (WHERE status = 'archived') as archived,
                    COUNT(*) FILTER (WHERE starred = 1) as starred
                FROM collections
                "#,
            ).unwrap();

            let (total, this_week, archived, starred) = stmt.query_row([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            }).unwrap();

            assert_eq!(total, 5);  // 5 active collections
            assert_eq!(this_week, 5); // All created within last 7 days
            assert_eq!(archived, 2); // 2 archived collections
            assert_eq!(starred, 0); // 0 starred

            Ok::<_, rusqlite::Error>(())
        }).unwrap();
    }
}
