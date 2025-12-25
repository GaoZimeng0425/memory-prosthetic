//! Favorites CRUD operations
//!
//! Provides repository pattern for managing favorites (folders).

use super::connection::{Database, DbError};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tracing::info;

/// Favorite entity from database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Favorite {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Input for creating a new favorite
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFavorite {
    pub name: String,
    pub icon: Option<String>,
}

/// Input for updating a favorite
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFavorite {
    pub name: Option<String>,
    pub icon: Option<String>,
}

/// Repository for favorite operations
pub struct FavoriteRepository<'a> {
    db: &'a Database,
}

impl<'a> FavoriteRepository<'a> {
    /// Create a new repository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Create a new favorite
    pub fn create(&self, input: &CreateFavorite) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT INTO favorites (name, icon)
                VALUES (?1, ?2)
                "#,
                params![&input.name, &input.icon],
            )?;

            let id = conn.last_insert_rowid();
            info!("Created favorite id={} name={}", id, &input.name);
            Ok(id)
        })
    }

    /// Update a favorite
    pub fn update(&self, id: i64, input: &UpdateFavorite) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            let mut updates = Vec::new();
            let mut params_vec: Vec<&dyn rusqlite::ToSql> = Vec::new();

            if let Some(ref name) = input.name {
                updates.push("name = ?");
                params_vec.push(name);
            }

            if let Some(ref icon) = input.icon {
                updates.push("icon = ?");
                params_vec.push(icon);
            }

            if updates.is_empty() {
                return Ok(());
            }

            updates.push("updated_at = datetime('now')");
            params_vec.push(&id);

            let sql = format!(
                "UPDATE favorites SET {} WHERE id = ?",
                updates.join(", ")
            );

            // Build params array manually
            let mut final_params: Vec<&dyn rusqlite::ToSql> = Vec::new();
            for param in &params_vec {
                final_params.push(*param);
            }

            conn.execute(&sql, rusqlite::params_from_iter(final_params.iter().cloned()))?;
            info!("Updated favorite id={}", id);
            Ok(())
        })
    }

    /// Delete a favorite
    pub fn delete(&self, id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            // Check if favorite is the default "未分类" (Uncategorized)
            let name: String = conn.query_row(
                "SELECT name FROM favorites WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )?;

            if name == "未分类" {
                return Err(rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CONSTRAINT),
                    Some("Cannot delete default '未分类' favorite".to_string()),
                ));
            }

            // Move all collections in this favorite to "未分类"
            let uncategorized_id: i64 = conn.query_row(
                "SELECT id FROM favorites WHERE name = '未分类'",
                [],
                |row| row.get(0),
            )?;

            conn.execute(
                "UPDATE collections SET favorite_id = ?1 WHERE favorite_id = ?2",
                params![uncategorized_id, id],
            )?;

            // Delete the favorite
            let rows_affected = conn.execute("DELETE FROM favorites WHERE id = ?1", params![id])?;

            if rows_affected > 0 {
                info!("Deleted favorite id={}", id);
            }

            Ok(rows_affected > 0)
        })
    }

    /// Get a favorite by ID
    pub fn get_by_id(&self, id: i64) -> Result<Option<Favorite>, DbError> {
        self.db.with_connection(|conn| {
            let result = conn.query_row(
                r#"
                SELECT id, name, icon, created_at, updated_at
                FROM favorites
                WHERE id = ?1
                "#,
                params![id],
                |row| Self::row_to_favorite(row),
            );

            match result {
                Ok(favorite) => Ok(Some(favorite)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e),
            }
        })
    }

    /// List all favorites
    pub fn list(&self) -> Result<Vec<Favorite>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, name, icon, created_at, updated_at
                FROM favorites
                ORDER BY
                    CASE WHEN name = '未分类' THEN 0 ELSE 1 END,
                    created_at ASC
                "#,
            )?;

            let rows = stmt.query_map([], |row| Self::row_to_favorite(row))?;

            let mut favorites = Vec::new();
            for row in rows {
                favorites.push(row?);
            }

            Ok(favorites)
        })
    }

    /// Get collection count for a favorite
    pub fn get_collection_count(&self, favorite_id: i64) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            conn.query_row(
                r#"
                SELECT COUNT(*) FROM collections
                WHERE favorite_id = ?1 AND status = 'active'
                "#,
                params![favorite_id],
                |row| row.get(0),
            )
        })
    }

    /// Helper to convert a row to Favorite
    fn row_to_favorite(row: &Row<'_>) -> rusqlite::Result<Favorite> {
        Ok(Favorite {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
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
        let repo = FavoriteRepository::new(&db);

        let input = CreateFavorite {
            name: "Test Favorite".to_string(),
            icon: None,
        };

        let id = repo.create(&input).unwrap();
        assert!(id > 0);

        let favorite = repo.get_by_id(id).unwrap().unwrap();
        assert_eq!(favorite.name, input.name);
    }

    #[test]
    fn test_list() {
        let db = setup_test_db();
        let repo = FavoriteRepository::new(&db);

        let input1 = CreateFavorite {
            name: "Favorite 1".to_string(),
            icon: None,
        };
        let input2 = CreateFavorite {
            name: "Favorite 2".to_string(),
            icon: None,
        };

        repo.create(&input1).unwrap();
        repo.create(&input2).unwrap();

        let favorites = repo.list().unwrap();
        // Should include default "未分类" + 2 created
        assert!(favorites.len() >= 3);
    }

    #[test]
    fn test_delete() {
        let db = setup_test_db();
        let repo = FavoriteRepository::new(&db);

        let input = CreateFavorite {
            name: "To Delete".to_string(),
            icon: None,
        };

        let id = repo.create(&input).unwrap();
        assert!(repo.get_by_id(id).unwrap().is_some());

        let deleted = repo.delete(id).unwrap();
        assert!(deleted);

        assert!(repo.get_by_id(id).unwrap().is_none());
    }
}
