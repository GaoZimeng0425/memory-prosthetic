//! Tags CRUD operations
//!
//! Provides repository pattern for managing tags.

use super::connection::{Database, DbError};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tracing::info;

/// Tag entity from database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
    pub count: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a new tag
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTag {
    pub name: String,
    pub color: Option<String>,
}

/// Input for updating a tag
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTag {
    pub name: Option<String>,
    pub color: Option<String>,
}

/// Tag sort order
#[derive(Debug, Clone, Copy)]
pub enum TagSortOrder {
    NameAsc,
    UsageDesc,
    CreatedDesc,
}

impl TagSortOrder {
    pub fn to_sql(&self) -> &'static str {
        match self {
            TagSortOrder::NameAsc => "name ASC",
            TagSortOrder::UsageDesc => "usage_count DESC, name ASC",
            TagSortOrder::CreatedDesc => "created_at DESC",
        }
    }
}

/// Repository for tag operations
pub struct TagRepository<'a> {
    db: &'a Database,
}

impl<'a> TagRepository<'a> {
    /// Create a new repository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new tag
    pub fn create(&self, input: &CreateTag) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT INTO tags (name, color)
                VALUES (?1, ?2)
                "#,
                params![&input.name, &input.color],
            )?;

            let id = conn.last_insert_rowid();
            info!("Created tag id={} name={}", id, &input.name);
            Ok(id)
        })
    }

    /// Update a tag
    pub fn update(&self, id: i64, input: &UpdateTag) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            let mut updates = Vec::new();
            let mut params_vec: Vec<&dyn rusqlite::ToSql> = Vec::new();

            if let Some(ref name) = input.name {
                updates.push("name = ?");
                params_vec.push(name);
            }

            if let Some(ref color) = input.color {
                updates.push("color = ?");
                params_vec.push(color);
            }

            if updates.is_empty() {
                return Ok(());
            }

            updates.push("updated_at = datetime('now')");
            params_vec.push(&id);

            let sql = format!("UPDATE tags SET {} WHERE id = ?", updates.join(", "));

            // Build params array manually
            let mut final_params: Vec<&dyn rusqlite::ToSql> = Vec::new();
            for param in &params_vec {
                final_params.push(*param);
            }

            conn.execute(&sql, rusqlite::params_from_iter(final_params.iter().cloned()))?;
            info!("Updated tag id={}", id);
            Ok(())
        })
    }

    /// Delete a tag
    pub fn delete(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            // Delete all collection_tags associations (CASCADE handled by foreign key)
            conn.execute("DELETE FROM collection_tags WHERE tag_id = ?1", params![id])?;

            // Delete the tag
            let rows_affected = conn.execute("DELETE FROM tags WHERE id = ?1", params![id])?;

            if rows_affected > 0 {
                info!("Deleted tag id={}", id);
            }

            Ok(rows_affected > 0)
        })
    }

    /// Get a tag by ID
    pub fn get_by_id(&self, id: i64) -> Result<Option<Tag>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, color, created_at, updated_at
                FROM tags
                WHERE id = ?1
                "#,
                params![id],
                |row| Self::row_to_tag(row),
            );

            match result {
                Ok(tag) => Ok(Some(tag)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
    }

    /// Get a tag by name
    pub fn get_by_name(&self, name: &str) -> Result<Option<Tag>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, color, created_at, updated_at
                FROM tags
                WHERE name = ?1
                "#,
                params![name],
                |row| Self::row_to_tag(row),
            );

            match result {
                Ok(tag) => Ok(Some(tag)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
    }

    /// List all tags with optional sorting
    pub fn list(&self, sort_order: Option<TagSortOrder>) -> Result<Vec<Tag>, DbError> {
        self.db.with_connection(|conn| {
            let order = sort_order
                .unwrap_or(TagSortOrder::NameAsc)
                .to_sql();

            let sql = match sort_order {
                Some(TagSortOrder::UsageDesc) => {
                    format!(
                        r#"
                        SELECT t.id, t.name, t.color, ct.usage_count as count, t.created_at, t.updated_at
                        FROM tags t
                        LEFT JOIN (
                            SELECT tag_id, COUNT(*) as usage_count
                            FROM collection_tags
                            GROUP BY tag_id
                        ) ct ON t.id = ct.tag_id
                        ORDER BY {}
                        "#,
                        order
                    )
                }
                _ => {
                    format!(
                        r#"
                        SELECT t.id, t.name, t.color, 0 as count, t.created_at, t.updated_at
                        FROM tags t
                        ORDER BY {}
                        "#,
                        order
                    )
                }
            };

            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map([], |row| Self::row_to_tag(row))?;

            let mut tags = Vec::new();
            for row in rows {
                tags.push(row?);
            }

            Ok(tags)
        })
    }

    /// Get usage count for a tag
    pub fn get_usage_count(&self, tag_id: i64) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            conn.query_row(
                r#"
                SELECT COUNT(*) FROM collection_tags
                WHERE tag_id = ?1
                "#,
                params![tag_id],
                |row| row.get(0),
            )
        })
    }

    /// Helper to convert a row to Tag
    fn row_to_tag(row: &Row<'_>) -> rusqlite::Result<Tag> {
        Ok(Tag {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            count: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
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
    fn test_create_and_get() {
        let db = setup_test_db();
        let repo = TagRepository::new(&db);

        let input = CreateTag {
            name: "Test Tag".to_string(),
            color: Some("#FF0000".to_string()),
        };

        let id = repo.create(&input).unwrap();
        assert!(id > 0);

        let tag = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(tag.name, input.name);
        assert_eq!(tag.color, input.color);
    }

    #[test]
    fn test_list() {
        let db = setup_test_db();
        let repo = TagRepository::new(&db);

        let input1 = CreateTag {
            name: "Tag A".to_string(),
            color: None,
        };
        let input2 = CreateTag {
            name: "Tag B".to_string(),
            color: None,
        };

        repo.create(&input1).unwrap();
        repo.create(&input2).unwrap();

        let tags = repo.list(None).unwrap();
        assert!(tags.len() >= 2);
    }

    #[test]
    fn test_delete() {
        let db = setup_test_db();
        let repo = TagRepository::new(&db);

        let input = CreateTag {
            name: "To Delete".to_string(),
            color: None,
        };

        let id = repo.create(&input).unwrap();
        assert!(repo.get_by_id(id).unwrap().is_some());

        let deleted = repo.delete(id).unwrap();
        assert!(deleted);

        assert!(repo.get_by_id(id).unwrap().is_none());
    }
}
