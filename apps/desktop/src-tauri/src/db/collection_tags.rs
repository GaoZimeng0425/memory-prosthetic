//! Collection-Tags junction table operations
//!
//! Manages the many-to-many relationship between collections and tags.

use super::connection::{Database, DbError};
use super::tags::Tag;
use rusqlite::params;
use tracing::info;

/// Repository for collection-tag operations
pub struct CollectionTagRepository<'a> {
    db: &'a Database,
}

impl<'a> CollectionTagRepository<'a> {
    /// Create a new repository instance
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Add tags to a collection
    pub fn add_tags(&self, collection_id: i64, tag_ids: &[i64]) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            for tag_id in tag_ids {
                // Use INSERT OR IGNORE to avoid errors if association already exists
                conn.execute(
                    r#"
                    INSERT OR IGNORE INTO collection_tags (collection_id, tag_id)
                    VALUES (?1, ?2)
                    "#,
                    params![collection_id, tag_id],
                )?;
            }

            info!(
                "Added {} tags to collection id={}",
                tag_ids.len(),
                collection_id
            );
            Ok(())
        })
    }

    /// Remove a tag from a collection
    pub fn remove_tag(&self, collection_id: i64, tag_id: i64) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                "DELETE FROM collection_tags WHERE collection_id = ?1 AND tag_id = ?2",
                params![collection_id, tag_id],
            )?;

            info!(
                "Removed tag id={} from collection id={}",
                tag_id, collection_id
            );
            Ok(())
        })
    }

    /// Get all tags for a collection
    pub fn get_tags_by_collection(&self, collection_id: i64) -> Result<Vec<Tag>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT t.id, t.name, t.color, t.created_at, t.updated_at
                FROM tags t
                INNER JOIN collection_tags ct ON t.id = ct.tag_id
                WHERE ct.collection_id = ?1
                ORDER BY t.name ASC
                "#,
            )?;

            let rows = stmt.query_map(params![collection_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?;

            let mut tags = Vec::new();
            for row in rows {
                tags.push(row?);
            }

            Ok(tags)
        })
    }

    /// Get all collection IDs that have a specific tag
    pub fn get_collections_by_tag(&self, tag_id: i64) -> Result<Vec<i64>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT collection_id FROM collection_tags WHERE tag_id = ?1",
            )?;

            let rows = stmt.query_map(params![tag_id], |row| row.get(0))?;

            let mut collection_ids = Vec::new();
            for row in rows {
                collection_ids.push(row?);
            }

            Ok(collection_ids)
        })
    }

    /// Remove all tags from a collection
    pub fn remove_all_tags(&self, collection_id: i64) -> Result<(), DbError> {
        self.db.with_connection(|conn| {
            conn.execute(
                "DELETE FROM collection_tags WHERE collection_id = ?1",
                params![collection_id],
            )?;

            info!("Removed all tags from collection id={}", collection_id);
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{collections::CreateCollection, init_database, CollectionRepository};
    use crate::db::tags::{CreateTag, TagRepository};
    use tempfile::tempdir;

    fn setup_test_db() -> Database {
        let dir = tempdir().unwrap();
        init_database(dir.path().to_path_buf()).unwrap()
    }

    #[test]
    fn test_add_and_get_tags() {
        let db = setup_test_db();
        let coll_repo = CollectionRepository::new(&db);
        let tag_repo = TagRepository::new(&db);
        let ct_repo = CollectionTagRepository::new(&db);

        // Create a collection
        let coll_input = CreateCollection {
            url: Some("https://example.com".to_string()),
            title: "Test".to_string(),
            content: "Content".to_string(),
            r#type: Some("网页".to_string()),
        };
        let coll_id = coll_repo.upsert(&coll_input).unwrap();

        // Create tags
        let tag1_id = tag_repo
            .create(&CreateTag {
                name: "Tag 1".to_string(),
                color: None,
            })
            .unwrap();
        let tag2_id = tag_repo
            .create(&CreateTag {
                name: "Tag 2".to_string(),
                color: None,
            })
            .unwrap();

        // Add tags to collection
        ct_repo.add_tags(coll_id, &[tag1_id, tag2_id]).unwrap();

        // Get tags for collection
        let tags = ct_repo.get_tags_by_collection(coll_id).unwrap();
        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn test_remove_tag() {
        let db = setup_test_db();
        let coll_repo = CollectionRepository::new(&db);
        let tag_repo = TagRepository::new(&db);
        let ct_repo = CollectionTagRepository::new(&db);

        // Create collection and tag
        let coll_id = coll_repo
            .upsert(&CreateCollection {
                url: Some("https://example.com".to_string()),
                title: "Test".to_string(),
                content: "Content".to_string(),
                r#type: Some("网页".to_string()),
            })
            .unwrap();

        let tag_id = tag_repo
            .create(&CreateTag {
                name: "Tag".to_string(),
                color: None,
            })
            .unwrap();

        // Add and then remove tag
        ct_repo.add_tags(coll_id, &[tag_id]).unwrap();
        ct_repo.remove_tag(coll_id, tag_id).unwrap();

        let tags = ct_repo.get_tags_by_collection(coll_id).unwrap();
        assert_eq!(tags.len(), 0);
    }
}
