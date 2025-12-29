//! Association database operations
//!
//! Handles CRUD operations for knowledge graph associations

use crate::db::{Database, DbError};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    // Type-specific metadata
    pub semantic_similarity: Option<f64>,
    pub shared_tags: Option<Vec<String>>,
    pub shared_folders: Option<Vec<String>>,
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
                || assoc.time_interval.is_some()
                || assoc.domain.is_some()
                || assoc.keyword_overlap.is_some()
                || assoc.topic_match.is_some()
            {
                conn.execute(
                    r#"
                    INSERT INTO association_metadata (
                        association_id, semantic_similarity, shared_tags, shared_folders,
                        time_interval, domain, keyword_overlap, topic_match
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                    "#,
                    params![
                        id,
                        assoc.semantic_similarity,
                        assoc.shared_tags.as_ref().map(|t| serde_json::to_string(t).unwrap()),
                        assoc.shared_folders.as_ref().map(|t| serde_json::to_string(t).unwrap()),
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
                    a.created_at, a.updated_at,
                    m.semantic_similarity, m.shared_tags, m.shared_folders,
                    m.time_interval, m.domain, m.keyword_overlap, m.topic_match
                FROM associations a
                LEFT JOIN association_metadata m ON a.id = m.association_id
                WHERE a.id = ?1
                "#,
            )?;

            let row = stmt.query_row(params![id], |row| {
                // Column indices: see row_to_association for full mapping
                let types: Option<String> = row.get(4)?;
                let shared_tags: Option<String> = row.get(18)?;
                let shared_folders: Option<String> = row.get(19)?;

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
                    semantic_similarity: row.get(17)?,
                    shared_tags: shared_tags.and_then(|t| serde_json::from_str(&t).ok()),
                    shared_folders: shared_folders.and_then(|t| serde_json::from_str(&t).ok()),
                    time_interval: row.get(20)?,
                    domain: row.get(21)?,
                    keyword_overlap: row.get(22)?,
                    topic_match: row.get(23)?,
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
                    a.created_at, a.updated_at,
                    m.semantic_similarity, m.shared_tags, m.shared_folders,
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

    fn row_to_association(&self, row: &rusqlite::Row) -> rusqlite::Result<Association> {
        // SQL query column indices:
        // 0: id, 1: source_id, 2: target_id, 3: type, 4: types
        // 5: weight, 6: confidence, 7: quality_score, 8: reason
        // 9: user_feedback, 10: access_count, 11: last_accessed_at
        // 12: is_expired, 13: is_directional, 14: direction
        // 15: created_at, 16: updated_at
        // 17: semantic_similarity, 18: shared_tags, 19: shared_folders
        // 20: time_interval, 21: domain, 22: keyword_overlap, 23: topic_match
        let types: Option<String> = row.get(4)?;
        let shared_tags: Option<String> = row.get(18)?;
        let shared_folders: Option<String> = row.get(19)?;

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
            semantic_similarity: row.get(17)?,
            shared_tags: shared_tags.and_then(|t| serde_json::from_str(&t).ok()),
            shared_folders: shared_folders.and_then(|t| serde_json::from_str(&t).ok()),
            time_interval: row.get(20)?,
            domain: row.get(21)?,
            keyword_overlap: row.get(22)?,
            topic_match: row.get(23)?,
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
    pub time_interval: Option<i64>,
    pub domain: Option<String>,
    pub keyword_overlap: Option<f64>,
    pub topic_match: Option<f64>,
}
