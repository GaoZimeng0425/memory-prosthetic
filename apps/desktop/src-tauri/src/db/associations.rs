//! Association database operations
//!
//! Handles CRUD operations for knowledge graph associations

use crate::db::{Database, DbError};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Association {
    pub id: String,
    pub source_id: i64,
    pub target_id: i64,
    pub r#type: String,
    pub types: Option<Vec<String>>,
    pub weight: f64,
    pub confidence: f64,
    pub quality_score: f64,
    pub reason: Option<String>,
    pub user_feedback: Option<String>,
    pub access_count: i64,
    pub last_accessed_at: Option<i64>,
    pub is_expired: bool,
    pub is_directional: bool,
    pub direction: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    /// Weight algorithm version (e.g., "v1", "v2")
    pub weight_algorithm_version: Option<String>,
    // Type-specific metadata
    pub semantic_similarity: Option<f64>,
    pub shared_tags: Option<Vec<String>>,
    pub shared_folders: Option<Vec<String>>,
    pub shared_keywords: Option<Vec<String>>,
    pub time_interval: Option<i64>,
    pub domain: Option<String>,
    pub keyword_overlap: Option<f64>,
    pub topic_match: Option<f64>,
}

pub struct AssociationRepository {
    db: Arc<Database>,
}

impl AssociationRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Create a new association
    pub fn create(&self, assoc: &CreateAssociation) -> Result<Association, DbError> {
        let id = format!("assoc_{}_{}_{}", assoc.source_id, assoc.target_id, assoc.r#type);
        let now = Utc::now().timestamp();

        self.db.with_connection_mut(|conn| {
            // Auto-cleanup: Delete old keyword associations for the same pair
            // This prevents accumulation of stale keyword associations
            if assoc.r#type == "keyword" {
                let deleted = conn.execute(
                    "DELETE FROM associations
                     WHERE source_id = ?1 AND target_id = ?2 AND type = 'keyword'",
                    params![assoc.source_id, assoc.target_id],
                )?;
                if deleted > 0 {
                    tracing::debug!(
                        "Auto-cleaned {} old keyword associations for {} <-> {}",
                        deleted,
                        assoc.source_id,
                        assoc.target_id
                    );
                }
            }

            // Insert association
            conn.execute(
                r#"
                INSERT INTO associations (
                    id, source_id, target_id, type, types, weight, confidence,
                    quality_score, reason, user_feedback, access_count,
                    last_accessed_at, is_expired, is_directional, direction,
                    created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
                "#,
                params![
                    id,
                    assoc.source_id,
                    assoc.target_id,
                    assoc.r#type,
                    assoc.types.as_ref().map(|t| serde_json::to_string(t).unwrap()),
                    assoc.weight,
                    assoc.confidence,
                    assoc.quality_score,
                    assoc.reason,
                    assoc.user_feedback,
                    0i64,
                    None::<i64>,
                    assoc.is_expired as i64,
                    assoc.is_directional as i64,
                    assoc.direction,
                    now,
                    now,
                ],
            )?;

            // Insert metadata if present
            if assoc.semantic_similarity.is_some()
                || assoc.shared_tags.is_some()
                || assoc.shared_folders.is_some()
                || assoc.shared_keywords.is_some()
                || assoc.time_interval.is_some()
                || assoc.domain.is_some()
                || assoc.keyword_overlap.is_some()
                || assoc.topic_match.is_some()
            {
                conn.execute(
                    r#"
                    INSERT INTO association_metadata (
                        association_id, semantic_similarity, shared_tags, shared_folders,
                        shared_keywords, time_interval, domain, keyword_overlap, topic_match
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                    "#,
                    params![
                        id,
                        assoc.semantic_similarity,
                        assoc.shared_tags.as_ref().map(|t| serde_json::to_string(t).unwrap()),
                        assoc.shared_folders.as_ref().map(|t| serde_json::to_string(t).unwrap()),
                        assoc.shared_keywords.as_ref().map(|t| serde_json::to_string(t).unwrap()),
                        assoc.time_interval,
                        assoc.domain,
                        assoc.keyword_overlap,
                        assoc.topic_match,
                    ],
                )?;
            }

            Ok(())
        })?;

        self.get_by_id(&id)
    }

    /// Get association by ID
    pub fn get_by_id(&self, id: &str) -> Result<Association, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT
                    a.id, a.source_id, a.target_id, a.type, a.types,
                    a.weight, a.confidence, a.quality_score, a.reason,
                    a.user_feedback, a.access_count, a.last_accessed_at,
                    a.is_expired, a.is_directional, a.direction,
                    a.created_at, a.updated_at, a.weight_algorithm_version,
                    m.semantic_similarity, m.shared_tags, m.shared_folders, m.shared_keywords,
                    m.time_interval, m.domain, m.keyword_overlap, m.topic_match
                FROM associations a
                LEFT JOIN association_metadata m ON a.id = m.association_id
                WHERE a.id = ?1
                "#,
            )?;

            let row = stmt.query_row(params![id], |row| {
                // Column indices: see row_to_association for full mapping
                let types: Option<String> = row.get(4)?;
                let shared_tags: Option<String> = row.get(19)?;
                let shared_folders: Option<String> = row.get(20)?;
                let shared_keywords: Option<String> = row.get(21)?;

                Ok(Association {
                    id: row.get(0)?,
                    source_id: row.get(1)?,
                    target_id: row.get(2)?,
                    r#type: row.get(3)?,
                    types: types.and_then(|t| serde_json::from_str(&t).ok()),
                    weight: row.get(5)?,
                    confidence: row.get(6)?,
                    quality_score: row.get(7)?,
                    reason: row.get(8)?,
                    user_feedback: row.get(9)?,
                    access_count: row.get(10)?,
                    last_accessed_at: row.get(11)?,
                    is_expired: row.get::<_, i64>(12)? != 0,
                    is_directional: row.get::<_, i64>(13)? != 0,
                    direction: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                    weight_algorithm_version: row.get(17)?,
                    semantic_similarity: row.get(18)?,
                    shared_tags: shared_tags.and_then(|t| serde_json::from_str(&t).ok()),
                    shared_folders: shared_folders.and_then(|t| serde_json::from_str(&t).ok()),
                    shared_keywords: shared_keywords.and_then(|t| serde_json::from_str(&t).ok()),
                    time_interval: row.get(22)?,
                    domain: row.get(23)?,
                    keyword_overlap: row.get(24)?,
                    topic_match: row.get(25)?,
                })
            })?;

            Ok(row)
        })
    }

    /// Get associations for a collection (as source or target)
    pub fn get_by_collection(
        &self,
        collection_id: i64,
        r#type: Option<&str>,
        min_weight: Option<f64>,
    ) -> Result<Vec<Association>, DbError> {
        self.db.with_connection(|conn| {
            let mut query = String::from(
                r#"
                SELECT
                    a.id, a.source_id, a.target_id, a.type, a.types,
                    a.weight, a.confidence, a.quality_score, a.reason,
                    a.user_feedback, a.access_count, a.last_accessed_at,
                    a.is_expired, a.is_directional, a.direction,
                    a.created_at, a.updated_at, a.weight_algorithm_version,
                    m.semantic_similarity, m.shared_tags, m.shared_folders, m.shared_keywords,
                    m.time_interval, m.domain, m.keyword_overlap, m.topic_match
                FROM associations a
                LEFT JOIN association_metadata m ON a.id = m.association_id
                WHERE (a.source_id = ?1 OR a.target_id = ?1)
                "#,
            );

            if r#type.is_some() {
                query.push_str(" AND a.type = ?2");
            }
            if min_weight.is_some() {
                let param_num = if r#type.is_some() { 3 } else { 2 };
                query.push_str(&format!(" AND a.weight >= ?{}", param_num));
            }
            query.push_str(" ORDER BY a.weight DESC");

            let mut associations = Vec::new();
            match (r#type, min_weight) {
                (Some(t), Some(mw)) => {
                    let mut stmt = conn.prepare(&query)?;
                    let rows = stmt.query_map(params![collection_id, t, mw], |row| {
                        self.row_to_association(row)
                    })?;
                    for row in rows {
                        associations.push(row?);
                    }
                }
                (Some(t), None) => {
                    let mut stmt = conn.prepare(&query)?;
                    let rows = stmt.query_map(params![collection_id, t], |row| {
                        self.row_to_association(row)
                    })?;
                    for row in rows {
                        associations.push(row?);
                    }
                }
                (None, Some(mw)) => {
                    let mut stmt = conn.prepare(&query)?;
                    let rows = stmt.query_map(params![collection_id, mw], |row| {
                        self.row_to_association(row)
                    })?;
                    for row in rows {
                        associations.push(row?);
                    }
                }
                (None, None) => {
                    let mut stmt = conn.prepare(&query)?;
                    let rows = stmt.query_map(params![collection_id], |row| {
                        self.row_to_association(row)
                    })?;
                    for row in rows {
                        associations.push(row?);
                    }
                }
            }

            Ok(associations)
        })
    }

    /// Get associations for a collection (optimized for article view)
    /// AC 6: Given 单篇文章 ID，when 调用 get_collection_associations，
    /// then 返回按权重降序排列的关联列表（最多 limit 条）
    ///
    /// This method is optimized for the article view sidebar:
    /// - Returns associations ordered by weight DESC
    /// - Limits results to avoid overwhelming the UI
    /// - Returns all metadata for display
    pub fn get_by_collection_for_article_view(
        &self,
        collection_id: i64,
        limit: usize,
    ) -> Result<Vec<Association>, DbError> {
        self.db.with_connection(|conn| {
            let query = r#"
                SELECT
                    a.id, a.source_id, a.target_id, a.type, a.types,
                    a.weight, a.confidence, a.quality_score, a.reason,
                    a.user_feedback, a.access_count, a.last_accessed_at,
                    a.is_expired, a.is_directional, a.direction,
                    a.created_at, a.updated_at, a.weight_algorithm_version,
                    m.semantic_similarity, m.shared_tags, m.shared_folders, m.shared_keywords,
                    m.time_interval, m.domain, m.keyword_overlap, m.topic_match
                FROM associations a
                LEFT JOIN association_metadata m ON a.id = m.association_id
                WHERE (a.source_id = ?1 OR a.target_id = ?1)
                ORDER BY a.weight DESC
                LIMIT ?2
            "#;

            let mut stmt = conn.prepare(query)?;
            let rows = stmt.query_map(params![collection_id, limit as i64], |row| {
                self.row_to_association(row)
            })?;

            let mut associations = Vec::new();
            for row in rows {
                associations.push(row?);
            }

            Ok(associations)
        })
    }

    fn row_to_association(&self, row: &rusqlite::Row) -> rusqlite::Result<Association> {
        // SQL query column indices (with weight_algorithm_version):
        // 0: id, 1: source_id, 2: target_id, 3: type, 4: types
        // 5: weight, 6: confidence, 7: quality_score, 8: reason
        // 9: user_feedback, 10: access_count, 11: last_accessed_at
        // 12: is_expired, 13: is_directional, 14: direction
        // 15: created_at, 16: updated_at, 17: weight_algorithm_version
        // 18: semantic_similarity, 19: shared_tags, 20: shared_folders, 21: shared_keywords
        // 22: time_interval, 23: domain, 24: keyword_overlap, 25: topic_match
        let types: Option<String> = row.get(4)?;
        let shared_tags: Option<String> = row.get(19)?;
        let shared_folders: Option<String> = row.get(20)?;
        let shared_keywords: Option<String> = row.get(21)?;

        Ok(Association {
            id: row.get(0)?,
            source_id: row.get(1)?,
            target_id: row.get(2)?,
            r#type: row.get(3)?,
            types: types.and_then(|t| serde_json::from_str(&t).ok()),
            weight: row.get(5)?,
            confidence: row.get(6)?,
            quality_score: row.get(7)?,
            reason: row.get(8)?,
            user_feedback: row.get(9)?,
            access_count: row.get(10)?,
            last_accessed_at: row.get(11)?,
            is_expired: row.get::<_, i64>(12)? != 0,
            is_directional: row.get::<_, i64>(13)? != 0,
            direction: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            weight_algorithm_version: row.get(17)?,
            semantic_similarity: row.get(18)?,
            shared_tags: shared_tags.and_then(|t| serde_json::from_str(&t).ok()),
            shared_folders: shared_folders.and_then(|t| serde_json::from_str(&t).ok()),
            shared_keywords: shared_keywords.and_then(|t| serde_json::from_str(&t).ok()),
            time_interval: row.get(22)?,
            domain: row.get(23)?,
            keyword_overlap: row.get(24)?,
            topic_match: row.get(25)?,
        })
    }
}

#[derive(Debug, Clone)]
pub struct CreateAssociation {
    pub source_id: i64,
    pub target_id: i64,
    pub r#type: String,
    pub types: Option<Vec<String>>,
    pub weight: f64,
    pub confidence: f64,
    pub quality_score: f64,
    pub reason: Option<String>,
    pub user_feedback: Option<String>,
    pub is_expired: bool,
    pub is_directional: bool,
    pub direction: Option<String>,
    // Type-specific metadata
    pub semantic_similarity: Option<f64>,
    pub shared_tags: Option<Vec<String>>,
    pub shared_folders: Option<Vec<String>>,
    pub shared_keywords: Option<Vec<String>>,
    pub time_interval: Option<i64>,
    pub domain: Option<String>,
    pub keyword_overlap: Option<f64>,
    pub topic_match: Option<f64>,
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
                rusqlite::params![id, url, title, "test content", created_at, created_at],
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
                rusqlite::params![id, source_id, target_id, assoc_type, weight, version],
            )
        });
    }

    // ========================================================================
    // Task 7: Get Collection Associations Tests
    // ========================================================================

    #[test]
    fn test_get_by_collection_for_article_view_returns_ordered_by_weight() {
        // AC 6: Given 单篇文章 ID，when 调用 get_collection_associations，
        // then 返回按权重降序排列的关联列表
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        // Create test collections
        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");
        create_test_collection(&db, 3, "Article 3", Some("https://example.com/3"), "2024-01-01 12:00:00");
        create_test_collection(&db, 4, "Article 4", Some("https://example.com/4"), "2024-01-01 13:00:00");

        // Create associations with different weights (not in order)
        create_test_association(&db, "assoc_1_3", 1, 3, "semantic", 0.7, Some("v1"));
        create_test_association(&db, "assoc_1_2", 1, 2, "tag", 0.9, Some("v1"));  // Highest
        create_test_association(&db, "assoc_1_4", 1, 4, "time", 0.5, Some("v1"));
        create_test_association(&db, "assoc_1_5", 1, 3, "keyword", 0.8, Some("v1")); // Second highest

        // When: Get associations for collection 1
        let result = repo.get_by_collection_for_article_view(1, 50);

        // Then: Results should be ordered by weight DESC
        assert!(result.is_ok());
        let associations = result.unwrap();

        // Verify ordering: 0.9 > 0.8 > 0.7 > 0.5
        assert!(associations.len() >= 2, "Should have at least 2 associations");
        for i in 1..associations.len() {
            assert!(
                associations[i - 1].weight >= associations[i].weight,
                "Associations should be ordered by weight DESC: {} >= {}",
                associations[i - 1].weight,
                associations[i].weight
            );
        }
    }

    #[test]
    fn test_get_by_collection_for_article_view_respects_limit() {
        // Given: A collection with many associations
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");

        // Create 10 associations
        for i in 2..=11 {
            create_test_collection(&db, i, &format!("Article {}", i), Some(&format!("https://example.com/{}", i)), "2024-01-01 10:00:00");
            create_test_association(&db, &format!("assoc_1_{}", i), 1, i, "semantic", 1.0 - (i as f64 * 0.05), Some("v1"));
        }

        // When: Get associations with limit 5
        let result = repo.get_by_collection_for_article_view(1, 5);

        // Then: Should return exactly 5 associations
        assert!(result.is_ok());
        let associations = result.unwrap();
        assert_eq!(associations.len(), 5, "Should return exactly 5 associations");
    }

    #[test]
    fn test_get_by_collection_for_article_view_default_limit_50() {
        // Given: A collection with many associations
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");

        // Create 60 associations (more than default limit)
        for i in 2..=61 {
            create_test_collection(&db, i, &format!("Article {}", i), Some(&format!("https://example.com/{}", i)), "2024-01-01 10:00:00");
            create_test_association(&db, &format!("assoc_1_{}", i), 1, i, "semantic", 0.5, Some("v1"));
        }

        // When: Get associations with default limit of 50
        let result = repo.get_by_collection_for_article_view(1, 50);

        // Then: Should return exactly 50 associations
        assert!(result.is_ok());
        let associations = result.unwrap();
        assert_eq!(associations.len(), 50, "Should return exactly 50 associations (default limit)");
    }

    #[test]
    fn test_get_by_collection_for_article_view_includes_weight_algorithm_version() {
        // Given: Associations with different weight algorithm versions
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");
        create_test_collection(&db, 3, "Article 3", Some("https://example.com/3"), "2024-01-01 12:00:00");

        // Create associations with different versions
        create_test_association(&db, "assoc_v1", 1, 2, "semantic", 0.8, Some("v1"));
        create_test_association(&db, "assoc_v2", 1, 3, "semantic", 0.9, Some("v2"));

        // When: Get associations
        let result = repo.get_by_collection_for_article_view(1, 50);

        // Then: Should include weight_algorithm_version field
        assert!(result.is_ok());
        let associations = result.unwrap();
        assert_eq!(associations.len(), 2);

        let v1_assoc = associations.iter().find(|a| a.target_id == 2).unwrap();
        let v2_assoc = associations.iter().find(|a| a.target_id == 3).unwrap();

        assert_eq!(v1_assoc.weight_algorithm_version, Some("v1".to_string()));
        assert_eq!(v2_assoc.weight_algorithm_version, Some("v2".to_string()));
    }

    #[test]
    fn test_get_by_collection_for_article_view_empty_collection() {
        // Given: A collection with no associations
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");

        // When: Get associations
        let result = repo.get_by_collection_for_article_view(1, 50);

        // Then: Should return empty list
        assert!(result.is_ok());
        let associations = result.unwrap();
        assert_eq!(associations.len(), 0);
    }

    #[test]
    fn test_get_by_id_includes_weight_algorithm_version() {
        // Given: An association with weight_algorithm_version
        let db = setup_test_db();
        let repo = AssociationRepository::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), "2024-01-01 11:00:00");
        create_test_association(&db, "assoc_test", 1, 2, "semantic", 0.85, Some("v1"));

        // When: Get association by ID
        let result = repo.get_by_id("assoc_test");

        // Then: Should include weight_algorithm_version
        assert!(result.is_ok());
        let association = result.unwrap();
        assert_eq!(association.weight_algorithm_version, Some("v1".to_string()));
    }
}