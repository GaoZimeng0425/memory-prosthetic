//! AI metadata database operations
//!
//! Handles storage and retrieval of AI-generated metadata

use crate::db::{Database, DbError};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Keyword {
    pub id: String,
    pub collection_id: i64,
    pub keyword: String,
    pub weight: f64,
    pub extraction_method: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Topic {
    pub id: String,
    pub collection_id: i64,
    pub topic: String,
    pub confidence: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProcessingLog {
    pub id: String,
    pub collection_id: i64,
    pub task_type: String,
    pub model_name: Option<String>,
    pub status: String,
    pub processing_time: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: i64,
}

pub struct AiMetadataRepository {
    db: Arc<Database>,
}

impl AiMetadataRepository {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Update AI metadata for a collection
    pub fn update_collection_metadata(
        &self,
        collection_id: i64,
        metadata: &UpdateAiMetadata,
    ) -> Result<(), DbError> {
        let now = Utc::now().timestamp();

        self.db.with_connection_mut(|conn| {
            // Update collections table
            conn.execute(
                r#"
                UPDATE collections SET
                    summary = ?1,
                    summary_type = ?2,
                    content_type = ?3,
                    domain = ?4,
                    difficulty = ?5,
                    language = ?6,
                    quality_score = ?7,
                    processed_at = ?8,
                    updated_at = datetime('now')
                WHERE id = ?9
                "#,
                params![
                    metadata.summary,
                    metadata.summary_type,
                    metadata.content_type,
                    metadata.domain,
                    metadata.difficulty,
                    metadata.language,
                    metadata.quality_score,
                    metadata.processed_at,
                    collection_id,
                ],
            )?;

            // Delete existing keywords and topics
            conn.execute(
                "DELETE FROM keywords WHERE collection_id = ?1",
                params![collection_id],
            )?;
            conn.execute(
                "DELETE FROM topics WHERE collection_id = ?1",
                params![collection_id],
            )?;

            // Insert new keywords
            for keyword in &metadata.keywords {
                conn.execute(
                    r#"
                    INSERT INTO keywords (id, collection_id, keyword, weight, extraction_method, created_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                    "#,
                    params![
                        keyword.id,
                        collection_id,
                        keyword.keyword,
                        keyword.weight,
                        keyword.extraction_method,
                        now,
                    ],
                )?;
            }

            // Insert new topics
            for topic in &metadata.topics {
                conn.execute(
                    r#"
                    INSERT INTO topics (id, collection_id, topic, confidence, created_at)
                    VALUES (?1, ?2, ?3, ?4, ?5)
                    "#,
                    params![
                        topic.id,
                        collection_id,
                        topic.topic,
                        topic.confidence,
                        now,
                    ],
                )?;
            }

            Ok(())
        })
    }

    /// Get keywords for a collection
    pub fn get_keywords(&self, collection_id: i64) -> Result<Vec<Keyword>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, collection_id, keyword, weight, extraction_method, created_at FROM keywords WHERE collection_id = ?1 ORDER BY weight DESC",
            )?;

            let rows = stmt.query_map(params![collection_id], |row| {
                Ok(Keyword {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    keyword: row.get(2)?,
                    weight: row.get(3)?,
                    extraction_method: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })?;

            let mut keywords = Vec::new();
            for row in rows {
                keywords.push(row?);
            }

            Ok(keywords)
        })
    }

    /// Get topics for a collection
    pub fn get_topics(&self, collection_id: i64) -> Result<Vec<Topic>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                "SELECT id, collection_id, topic, confidence, created_at FROM topics WHERE collection_id = ?1 ORDER BY confidence DESC",
            )?;

            let rows = stmt.query_map(params![collection_id], |row| {
                Ok(Topic {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    topic: row.get(2)?,
                    confidence: row.get(3)?,
                    created_at: row.get(4)?,
                })
            })?;

            let mut topics = Vec::new();
            for row in rows {
                topics.push(row?);
            }

            Ok(topics)
        })
    }

    /// Create AI processing log
    pub fn create_log(&self, log: &CreateAiLog) -> Result<(), DbError> {
        let id = format!("log_{}_{}_{}", log.collection_id, log.task_type, Utc::now().timestamp());
        let now = Utc::now().timestamp();

        self.db.with_connection_mut(|conn| {
            conn.execute(
                r#"
                INSERT INTO ai_processing_logs (
                    id, collection_id, task_type, model_name, status,
                    processing_time, error_message, created_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                "#,
                params![
                    id,
                    log.collection_id,
                    log.task_type,
                    log.model_name,
                    log.status,
                    log.processing_time,
                    log.error_message,
                    now,
                ],
            )?;

            Ok(())
        })
    }

    /// Create a single keyword for a collection (helper for tests)
    #[cfg(test)]
    pub fn create_keyword_direct(&self, collection_id: i64, keyword: &CreateKeyword) -> Result<(), DbError> {
        let now = Utc::now().timestamp();

        self.db.with_connection_mut(|conn| {
            conn.execute(
                r#"
                INSERT INTO keywords (id, collection_id, keyword, weight, extraction_method, created_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                "#,
                params![
                    keyword.id,
                    collection_id,
                    keyword.keyword,
                    keyword.weight,
                    keyword.extraction_method,
                    now,
                ],
            )?;

            Ok(())
        })
    }

    /// Get processing logs for a collection
    pub fn get_logs(&self, collection_id: i64) -> Result<Vec<AiProcessingLog>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, collection_id, task_type, model_name, status,
                       processing_time, error_message, created_at
                FROM ai_processing_logs
                WHERE collection_id = ?1
                ORDER BY created_at DESC
                "#,
            )?;

            let rows = stmt.query_map(params![collection_id], |row| {
                Ok(AiProcessingLog {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    task_type: row.get(2)?,
                    model_name: row.get(3)?,
                    status: row.get(4)?,
                    processing_time: row.get(5)?,
                    error_message: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })?;

            let mut logs = Vec::new();
            for row in rows {
                logs.push(row?);
            }

            Ok(logs)
        })
    }
}

#[derive(Debug, Clone)]
pub struct UpdateAiMetadata {
    pub summary: Option<String>,
    pub summary_type: Option<String>,
    pub content_type: Option<String>,
    pub domain: Option<String>,
    pub difficulty: Option<String>,
    pub language: Option<String>,
    pub quality_score: Option<f64>,
    pub processed_at: Option<i64>,
    pub keywords: Vec<CreateKeyword>,
    pub topics: Vec<CreateTopic>,
}

#[derive(Debug, Clone)]
pub struct CreateKeyword {
    pub id: String,
    pub keyword: String,
    pub weight: f64,
    pub extraction_method: String,
}

#[derive(Debug, Clone)]
pub struct CreateTopic {
    pub id: String,
    pub topic: String,
    pub confidence: f64,
}

#[derive(Debug, Clone)]
pub struct CreateAiLog {
    pub collection_id: i64,
    pub task_type: String,
    pub model_name: Option<String>,
    pub status: String,
    pub processing_time: Option<i64>,
    pub error_message: Option<String>,
}
