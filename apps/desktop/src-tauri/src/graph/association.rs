//! Association calculation
//!
//! Calculates different types of associations between collections

use crate::db::{Collection, Database, DbError};
use crate::embedding::get_embedding_model;
use chrono::NaiveDateTime;
use std::collections::HashSet;
use std::sync::Arc;
use thiserror::Error;
use tracing::warn;

#[derive(Debug, Error)]
pub enum CalculationError {
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    #[error("Embedding model not available")]
    ModelNotAvailable,

    #[error("Embedding calculation error: {0}")]
    EmbeddingError(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssociationType {
    Semantic,
    Tag,
    Folder,
    Time,
    Domain,
    Keyword,
    Topic,
    Reference,
    Author,
}

impl AssociationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AssociationType::Semantic => "semantic",
            AssociationType::Tag => "tag",
            AssociationType::Folder => "folder",
            AssociationType::Time => "time",
            AssociationType::Domain => "domain",
            AssociationType::Keyword => "keyword",
            AssociationType::Topic => "topic",
            AssociationType::Reference => "reference",
            AssociationType::Author => "author",
        }
    }
}

/// Association calculator
pub struct AssociationCalculator {
    db: Arc<Database>,
    semantic_threshold: f64,
}

impl AssociationCalculator {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db,
            semantic_threshold: 0.7,
        }
    }

    /// Calculate semantic similarity between two collections
    pub async fn calculate_semantic_similarity(
        &self,
        collection1: &Collection,
        collection2: &Collection,
    ) -> Result<f64, CalculationError> {
        let model = get_embedding_model()
            .ok_or(CalculationError::ModelNotAvailable)?;

        // Get embeddings from database
        use crate::db::EmbeddingsRepository;
        let embedding_repo = EmbeddingsRepository::new(&self.db);

        let emb1 = embedding_repo
            .get_by_collection_id(collection1.id)
            .map_err(CalculationError::Database)?;
        let emb2 = embedding_repo
            .get_by_collection_id(collection2.id)
            .map_err(CalculationError::Database)?;

        let vec1 = emb1.ok_or_else(|| CalculationError::EmbeddingError(
            format!("No embedding for collection {}", collection1.id)
        ))?;
        let vec2 = emb2.ok_or_else(|| CalculationError::EmbeddingError(
            format!("No embedding for collection {}", collection2.id)
        ))?;

        // Calculate cosine similarity
        let similarity = cosine_similarity(&vec1.vector, &vec2.vector);

        Ok(similarity)
    }

    /// Calculate tag-based association
    pub async fn calculate_tag_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<(f64, Vec<String>)>, CalculationError> {
        use crate::db::CollectionTagRepository;
        let tag_repo = CollectionTagRepository::new(&self.db);

        let tags1: HashSet<String> = tag_repo
            .get_tags_by_collection(collection1_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|t| t.name)
            .collect();

        let tags2: HashSet<String> = tag_repo
            .get_tags_by_collection(collection2_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|t| t.name)
            .collect();

        let shared_tags: Vec<String> = tags1.intersection(&tags2).cloned().collect();

        if shared_tags.is_empty() {
            return Ok(None);
        }

        // Weight calculation: min(共享标签数 / 5, 1.0)
        let weight = (shared_tags.len() as f64 / 5.0).min(1.0);

        Ok(Some((weight, shared_tags)))
    }

    /// Calculate time-based association
    pub fn calculate_time_association(
        &self,
        collection1: &Collection,
        collection2: &Collection,
    ) -> Option<(f64, i64)> {
        // Validate created_at fields are not empty
        if collection1.created_at.is_empty() || collection2.created_at.is_empty() {
            return None;
        }

        // Parse timestamps (SQLite datetime format: 'YYYY-MM-DD HH:MM:SS')
        let time1 = match NaiveDateTime::parse_from_str(&collection1.created_at, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => dt.and_utc().timestamp(),
            Err(e) => {
                warn!("Failed to parse created_at for collection {}: {} (value: '{}')",
                    collection1.id, e, collection1.created_at);
                return None;
            }
        };

        let time2 = match NaiveDateTime::parse_from_str(&collection2.created_at, "%Y-%m-%d %H:%M:%S") {
            Ok(dt) => dt.and_utc().timestamp(),
            Err(e) => {
                warn!("Failed to parse created_at for collection {}: {} (value: '{}')",
                    collection2.id, e, collection2.created_at);
                return None;
            }
        };

        let time_diff = (time1 - time2).abs();
        let minutes_diff = time_diff / 60; // Convert to minutes

        // Time window: 10 minutes (600 seconds)
        const TIME_WINDOW_SECONDS: i64 = 600; // 10 minutes
        if time_diff > TIME_WINDOW_SECONDS {
            return None;
        }

        // Weight calculation: max(0, 1 - 间隔分钟数 / 10)
        // 距离越近，权重越高；10分钟内线性衰减
        let mut weight = (1.0 - (minutes_diff as f64 / 10.0)).max(0.0);

        // Time cluster boost: within 1 minute (very close in time)
        if time_diff < 60 {
            weight *= 1.5;
        }

        // Return minutes difference for display (instead of days)
        Some((weight.min(1.0), minutes_diff))
    }

    /// Calculate domain-based association
    pub fn calculate_domain_association(
        &self,
        collection1: &Collection,
        collection2: &Collection,
    ) -> Option<(f64, String)> {
        let domain1 = collection1.url.as_deref().and_then(|url| extract_domain(url))?;
        let domain2 = collection2.url.as_deref().and_then(|url| extract_domain(url))?;

        if domain1 == domain2 {
            Some((0.4, domain1))
        } else {
            None
        }
    }

    /// Calculate keyword-based association
    pub async fn calculate_keyword_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<f64>, CalculationError> {
        use crate::db::AiMetadataRepository;
        let ai_repo = AiMetadataRepository::new(self.db.clone());

        let keywords1: HashSet<String> = ai_repo
            .get_keywords(collection1_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|k| k.keyword.to_lowercase())
            .collect();

        let keywords2: HashSet<String> = ai_repo
            .get_keywords(collection2_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|k| k.keyword.to_lowercase())
            .collect();

        if keywords1.is_empty() || keywords2.is_empty() {
            return Ok(None);
        }

        let shared_keywords: Vec<String> = keywords1.intersection(&keywords2).cloned().collect();

        if shared_keywords.is_empty() {
            return Ok(None);
        }

        // Weight calculation: min(共享关键词数 / 5, 1.0)
        let weight = (shared_keywords.len() as f64 / 5.0).min(1.0);

        Ok(Some(weight))
    }

    /// Calculate topic-based association
    pub async fn calculate_topic_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<f64>, CalculationError> {
        use crate::db::AiMetadataRepository;
        let ai_repo = AiMetadataRepository::new(self.db.clone());

        let topics1: HashSet<String> = ai_repo
            .get_topics(collection1_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|t| t.topic.to_lowercase())
            .collect();

        let topics2: HashSet<String> = ai_repo
            .get_topics(collection2_id)
            .map_err(CalculationError::Database)?
            .into_iter()
            .map(|t| t.topic.to_lowercase())
            .collect();

        if topics1.is_empty() || topics2.is_empty() {
            return Ok(None);
        }

        let shared_topics: Vec<String> = topics1.intersection(&topics2).cloned().collect();

        if shared_topics.is_empty() {
            return Ok(None);
        }

        // Weight calculation: min(共享主题数 / 2, 1.0)
        let weight = (shared_topics.len() as f64 / 2.0).min(1.0);

        Ok(Some(weight))
    }
}

/// Calculate cosine similarity between two vectors
fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f64 {
    if v1.len() != v2.len() {
        return 0.0;
    }

    let dot_product: f64 = v1.iter().zip(v2.iter()).map(|(a, b)| (*a as f64) * (*b as f64)).sum();
    let norm1: f64 = v1.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();
    let norm2: f64 = v2.iter().map(|x| (*x as f64).powi(2)).sum::<f64>().sqrt();

    if norm1 == 0.0 || norm2 == 0.0 {
        return 0.0;
    }

    dot_product / (norm1 * norm2)
}

/// Extract domain from URL
fn extract_domain(url: &str) -> Option<String> {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.to_string()))
}
