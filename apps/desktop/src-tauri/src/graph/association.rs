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

// Fallback strategy constants
const FALLBACK_DISCOUNT: f64 = 0.7;       // Fallback keyword weight discount (updated from 0.5)
const MIN_KEYWORD_LEN: usize = 2;          // Minimum keyword length

// Association weight calculation constants
const TAG_WEIGHT_DIVISOR: f64 = 4.0;      // Divisor for tag association weight calculation
const TAG_MAX_WEIGHT: f64 = 0.85;         // Maximum weight for tag associations
const KEYWORD_MAX_WEIGHT: f64 = 0.8;      // Maximum weight for keyword associations

// Time association constants
const TIME_WINDOW_SECONDS: i64 = 600;     // 10 minutes in seconds
const TIME_DECAY_MINUTES: f64 = 10.0;     // Time decay factor in minutes
const TIME_BASE_WEIGHT: f64 = 0.3;        // Base weight for time associations
const TIME_CLUSTER_BOOST: f64 = 1.2;      // Weight boost for time clusters (within 1 minute)
const TIME_CLUSTER_THRESHOLD_SECONDS: i64 = 60;  // Threshold for time cluster boost

// Domain association constants
const DOMAIN_ASSOCIATION_WEIGHT: f64 = 0.4;  // Weight for domain associations

// Favorite association constants
const FAVORITE_WEIGHT_DIVISOR: f64 = 3.0;     // Divisor for favorite weight calculation
const FAVORITE_BASE_WEIGHT: f64 = 0.5;        // Base weight for favorite associations
const FAVORITE_DEFAULT_COUNT: usize = 2;      // Default collection count for favorite weight

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

        // Weight calculation: min(共享标签数 / TAG_WEIGHT_DIVISOR, 1.0) * TAG_MAX_WEIGHT
        let weight = (shared_tags.len() as f64 / TAG_WEIGHT_DIVISOR).min(1.0) * TAG_MAX_WEIGHT;

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

        // Time window: TIME_WINDOW_SECONDS (10 minutes)
        if time_diff > TIME_WINDOW_SECONDS {
            return None;
        }

        // Weight calculation: max(0, 1 - 间隔分钟数 / TIME_DECAY_MINUTES) * TIME_BASE_WEIGHT
        // 距离越近，权重越高；10分钟内线性衰减
        let mut weight = (1.0 - (minutes_diff as f64 / TIME_DECAY_MINUTES)).max(0.0) * TIME_BASE_WEIGHT;

        // Time cluster boost: within TIME_CLUSTER_THRESHOLD_SECONDS (very close in time)
        if time_diff < TIME_CLUSTER_THRESHOLD_SECONDS {
            weight *= TIME_CLUSTER_BOOST;
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
            Some((DOMAIN_ASSOCIATION_WEIGHT, domain1))
        } else {
            None
        }
    }

    /// Calculate keyword-based association with fallback strategy
    pub async fn calculate_keyword_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<(f64, Vec<String>)>, CalculationError> {
        // 1. Get keywords with fallback support
        let (keywords1, is_fallback1) =
            get_keywords_with_fallback(&self.db, collection1_id).await?;
        let (keywords2, is_fallback2) =
            get_keywords_with_fallback(&self.db, collection2_id).await?;

        // 2. Only return None if BOTH are empty
        if keywords1.is_empty() && keywords2.is_empty() {
            return Ok(None);
        }

        // 3. Calculate intersection and get shared keywords
        let shared_keywords: Vec<String> = keywords1
            .intersection(&keywords2)
            .cloned()
            .collect();

        if shared_keywords.is_empty() {
            return Ok(None);
        }

        // 4. Relative weight formula (fix Issue 2)
        // max_weight: KEYWORD_MAX_WEIGHT
        let min_len = keywords1.len().min(keywords2.len()).max(1);
        let weight = (shared_keywords.len() as f64 / min_len as f64).min(1.0) * KEYWORD_MAX_WEIGHT;

        // 5. Apply fallback discount if applicable
        let is_fallback = is_fallback1 || is_fallback2;
        let final_weight = if is_fallback {
            weight * FALLBACK_DISCOUNT
        } else {
            weight
        };

        // 6. Sort keywords for consistent display
        let mut shared_sorted: Vec<String> = shared_keywords.into_iter().collect();
        shared_sorted.sort();

        // 7. Enhanced logging (mark keyword source)
        let source1 = if is_fallback1 { "fallback" } else { "AI" };
        let source2 = if is_fallback2 { "fallback" } else { "AI" };

        tracing::info!(
            "Keyword association: {} ({}, {} keywords) <-> {} ({}, {} keywords): {} shared ({:?}), weight={:.2}, final={:.2}",
            collection1_id,
            source1,
            keywords1.len(),
            collection2_id,
            source2,
            keywords2.len(),
            shared_sorted.len(),
            shared_sorted,
            weight,
            final_weight
        );

        Ok(Some((final_weight, shared_sorted)))
    }

    /// Calculate topic-based association
    pub async fn calculate_topic_association(
        &self,
        collection1_id: i64,
        collection2_id: i64,
    ) -> Result<Option<(f64, Vec<String>)>, CalculationError> {
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

        // Get shared topics as a sorted vector
        let shared_topics: Vec<String> = topics1
            .intersection(&topics2)
            .cloned()
            .collect();

        if shared_topics.is_empty() {
            return Ok(None);
        }

        // Relative weight formula (consistent with keyword calculation)
        let min_len = topics1.len().min(topics2.len()).max(1);
        let weight = (shared_topics.len() as f64 / min_len as f64).min(1.0);

        // Sort topics for consistent display
        let mut shared_sorted: Vec<String> = shared_topics.into_iter().collect();
        shared_sorted.sort();

        tracing::info!(
            "Topic association: {} ({} topics) <-> {} ({} topics): {} shared ({:?}), weight={:.2}",
            collection1_id,
            topics1.len(),
            collection2_id,
            topics2.len(),
            shared_sorted.len(),
            shared_sorted,
            weight
        );

        Ok(Some((weight, shared_sorted)))
    }

    /// Calculate favorite-based association
    pub fn calculate_favorite_association(
        &self,
        collection1: &Collection,
        collection2: &Collection,
    ) -> Option<(f64, String)> {
        // Check if both collections belong to the same favorite
        match (collection1.favorite_id, collection2.favorite_id) {
            (Some(fav1), Some(fav2)) if fav1 == fav2 => {
                // Get favorite name
                use crate::db::FavoriteRepository;
                let fav_repo = FavoriteRepository::new(&self.db);
                let favorite_name = match fav_repo.get_by_id(fav1) {
                    Ok(Some(fav)) => fav.name,
                    Ok(None) => "Unknown Favorite".to_string(),
                    Err(_) => "Unknown Favorite".to_string(),
                };

                // Get collection count for this favorite
                let count = match fav_repo.get_collection_count(fav1) {
                    Ok(c) => c,
                    Err(_) => FAVORITE_DEFAULT_COUNT as i64,
                };

                // Dynamic weight formula: (FAVORITE_WEIGHT_DIVISOR / max(count, FAVORITE_WEIGHT_DIVISOR)) * FAVORITE_BASE_WEIGHT
                // This ensures large favorites don't overwhelm the graph
                let weight = (FAVORITE_WEIGHT_DIVISOR / (count as f64).max(FAVORITE_WEIGHT_DIVISOR)) * FAVORITE_BASE_WEIGHT;

                tracing::info!(
                    "Favorite association: {} and {} both in favorite {} ({}), count={}, weight={:.2}",
                    collection1.id,
                    collection2.id,
                    fav1,
                    favorite_name,
                    count,
                    weight
                );
                Some((weight, favorite_name))
            }
            _ => None,
        }
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

// ===== Test Framework =====

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Collection, Database};
    use crate::db::init_database;
    use tempfile::tempdir;
    use std::sync::Arc;

    /// Helper to create a test database
    fn setup_test_db() -> Database {
        let dir = tempdir().expect("Failed to create temp directory for test database");
        init_database(dir.path().to_path_buf()).expect("Failed to initialize test database")
    }

    /// Helper to create a test collection
    fn create_test_collection(db: &Database, id: i64, title: &str, url: Option<&str>, favorite_id: Option<i64>, created_at: &str) -> Collection {
        db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO collections (id, url, title, content, favorite_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![id, url, title, "test content", favorite_id, created_at, created_at],
            ).expect("Failed to insert test collection");

            // Get the created collection
            conn.query_row(
                "SELECT id, url, title, content, summary, starred, embedding_status, favorite_id, status, type, created_at, updated_at FROM collections WHERE id = ?1",
                rusqlite::params![id],
                |row| {
                    Ok(Collection {
                        id: row.get(0)?,
                        url: row.get(1)?,
                        title: row.get(2)?,
                        content: row.get(3)?,
                        summary: row.get(4)?,
                        starred: row.get::<_, i32>(5)? == 1,
                        embedding_status: row.get::<_, String>(6)?.into(),
                        favorite_id: row.get(7)?,
                        status: row.get::<_, String>(8)?.into(),
                        r#type: row.get(9)?,
                        created_at: row.get(10)?,
                        updated_at: row.get(11)?,
                    })
                },
            )
        }).expect("Failed to query test collection")
    }

    /// Helper to add tags to a collection
    fn add_tags_to_collection(db: &Database, collection_id: i64, tags: &[&str]) {
        for tag_name in tags {
            // First create the tag if it doesn't exist
            let tag_id: i64 = db.with_connection(|conn| {
                // Try to get existing tag
                let result = conn.query_row(
                    "SELECT id FROM tags WHERE name = ?1",
                    rusqlite::params![tag_name],
                    |row| row.get::<_, i64>(0),
                );

                match result {
                    Ok(id) => Ok(id),
                    Err(_) => {
                        // Tag doesn't exist, create it
                        conn.execute(
                            "INSERT INTO tags (name) VALUES (?1)",
                            rusqlite::params![tag_name],
                        ).expect("Failed to insert test tag");
                        Ok(conn.last_insert_rowid())
                    }
                }
            }).expect("Failed to get or create test tag");

            // Link tag to collection
            db.with_connection(|conn| {
                conn.execute(
                    "INSERT OR IGNORE INTO collection_tags (collection_id, tag_id) VALUES (?1, ?2)",
                    rusqlite::params![collection_id, tag_id],
                )
            }).expect("Failed to link tag to collection");
        }
    }

    // ========================================================================
    // Task 1: Time Association Weight Tests
    // ========================================================================

    #[test]
    fn test_time_association_same_minute_max_weight() {
        // Given: Two collections created at the same minute
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,
            "2024-01-01 10:00:00",  // Same minute
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            None,
            "2024-01-01 10:00:30",  // 30 seconds later
        );

        // When: Calculate time association
        let result = calc.calculate_time_association(&coll1, &coll2);

        // Then: Weight should be max with boost (0.3 * 1.2 = 0.36)
        assert!(result.is_some());
        let (weight, minutes_diff) = result.unwrap();
        assert!((weight - 0.36).abs() < 0.001, "Expected weight ~0.36, got {}", weight);
        assert_eq!(minutes_diff, 0);
    }

    #[test]
    fn test_time_association_within_time_window() {
        // Given: Two collections created 5 minutes apart
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            None,
            "2024-01-01 10:05:00",  // 5 minutes later
        );

        // When: Calculate time association
        let result = calc.calculate_time_association(&coll1, &coll2);

        // Then: Weight should be (1 - 5/10) * 0.3 = 0.15 (no boost)
        assert!(result.is_some());
        let (weight, minutes_diff) = result.unwrap();
        assert!((weight - 0.15).abs() < 0.001, "Expected weight ~0.15, got {}", weight);
        assert_eq!(minutes_diff, 5);
    }

    #[test]
    fn test_time_association_outside_time_window() {
        // Given: Two collections created 15 minutes apart
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            None,
            "2024-01-01 10:15:00",  // 15 minutes later - outside window
        );

        // When: Calculate time association
        let result = calc.calculate_time_association(&coll1, &coll2);

        // Then: No association (outside 10-minute window)
        assert!(result.is_none());
    }

    #[test]
    fn test_time_association_max_weight_capped() {
        // Given: Two collections created within 1 minute (boost applied)
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            None,
            "2024-01-01 10:00:45",  // 45 seconds later - boost applies
        );

        // When: Calculate time association
        let result = calc.calculate_time_association(&coll1, &coll2);

        // Then: Weight should be capped at 0.36 (0.3 * 1.2)
        assert!(result.is_some());
        let (weight, _) = result.unwrap();
        assert!(weight <= 0.36, "Expected weight <= 0.36, got {}", weight);
        assert!((weight - 0.36).abs() < 0.001, "Expected weight ~0.36, got {}", weight);
    }

    // ========================================================================
    // Task 2: Tag Association Weight Tests
    // ========================================================================

    #[tokio::test]
    async fn test_tag_association_four_shared_tags_max_weight() {
        // AC 2: Given 两篇文章共享 4 个标签，when 计算标签关联时，then 权重为 0.85 (4/4 * 0.85)
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        // Create collections
        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), None, "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), None, "2024-01-01 11:00:00");

        // Add 4 shared tags to both collections
        let shared_tags = vec!["rust", "programming", "tutorial", "code"];
        add_tags_to_collection(&db, 1, &shared_tags);
        add_tags_to_collection(&db, 2, &shared_tags);

        // When: Calculate tag association
        let result = calc.calculate_tag_association(1, 2).await;

        // Then: Weight should be 0.85 (4/4 * 0.85)
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.is_some());
        let (weight, shared) = result.unwrap();
        assert!((weight - 0.85).abs() < 0.001, "Expected weight ~0.85, got {}", weight);
        assert_eq!(shared.len(), 4);
    }

    #[tokio::test]
    async fn test_tag_association_two_shared_tags_partial_weight() {
        // Given: Two collections share 2 tags
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), None, "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), None, "2024-01-01 11:00:00");

        let shared_tags = vec!["rust", "programming"];
        add_tags_to_collection(&db, 1, &shared_tags);
        add_tags_to_collection(&db, 2, &shared_tags);

        // When: Calculate tag association
        let result = calc.calculate_tag_association(1, 2).await;

        // Then: Weight should be 0.425 (2/4 * 0.85)
        assert!(result.is_ok());
        let result = result.unwrap();
        assert!(result.is_some());
        let (weight, shared) = result.unwrap();
        assert!((weight - 0.425).abs() < 0.001, "Expected weight ~0.425, got {}", weight);
        assert_eq!(shared.len(), 2);
    }

    #[tokio::test]
    async fn test_tag_association_no_shared_tags_none() {
        // Given: Two collections with no shared tags
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), None, "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), None, "2024-01-01 11:00:00");

        add_tags_to_collection(&db, 1, &["rust", "programming"]);
        add_tags_to_collection(&db, 2, &["python", "data"]);

        // When: Calculate tag association
        let result = calc.calculate_tag_association(1, 2).await;

        // Then: No association
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    // ========================================================================
    // Task 3: Keyword Association Weight Tests
    // ========================================================================
    // NOTE: Keyword tests are skipped because they require complex AI metadata setup
    // These will be tested in integration tests instead

    // ========================================================================
    // Task 4: Favorite Association Weight Tests
    // ========================================================================

    #[test]
    fn test_favorite_association_two_articles_max_weight() {
        // AC 4: Given 两篇文章在同一收藏夹（共 2 篇），when 计算收藏夹关联时，then 权重为 0.5
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        // Create a favorite
        let favorite_id: i64 = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO favorites (name) VALUES ('Test Favorite')",
                [],
            ).unwrap();
            Ok(conn.last_insert_rowid())
        }).unwrap();

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            Some(favorite_id),
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            Some(favorite_id),
            "2024-01-01 11:00:00",
        );

        // When: Calculate favorite association
        let result = calc.calculate_favorite_association(&coll1, &coll2);

        // Then: Weight should be 0.5 (max for 2 articles)
        assert!(result.is_some());
        let (weight, favorite_name) = result.unwrap();
        assert!((weight - 0.5).abs() < 0.001, "Expected weight ~0.5, got {}", weight);
        assert_eq!(favorite_name, "Test Favorite");
    }

    #[test]
    fn test_favorite_association_ten_articles_dynamic_weight() {
        // Given: Two articles in a favorite with 10 total articles
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let favorite_id: i64 = db.with_connection(|conn| {
            conn.execute(
                "INSERT INTO favorites (name) VALUES ('Large Favorite')",
                [],
            ).unwrap();
            Ok(conn.last_insert_rowid())
        }).unwrap();

        // Create 10 articles in the same favorite
        for i in 1..=10 {
            create_test_collection(
                &db,
                i,
                &format!("Article {}", i),
                Some(&format!("https://example.com/{}", i)),
                Some(favorite_id),
                "2024-01-01 10:00:00",
            );
        }

        let coll1 = create_test_collection(
            &db,
            11,
            "Article 11",
            Some("https://example.com/11"),
            Some(favorite_id),
            "2024-01-01 11:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            12,
            "Article 12",
            Some("https://example.com/12"),
            Some(favorite_id),
            "2024-01-01 12:00:00",
        );

        // When: Calculate favorite association
        let result = calc.calculate_favorite_association(&coll1, &coll2);

        // Then: Weight should be 0.125 (0.5 * 3/12 = 0.125)
        // Note: We created 12 total articles (10 + coll1 + coll2)
        assert!(result.is_some());
        let (weight, _) = result.unwrap();
        assert!((weight - 0.125).abs() < 0.001, "Expected weight ~0.125, got {}", weight);
    }

    #[test]
    fn test_favorite_association_different_favorites_none() {
        // Given: Two articles in different favorites
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let fav1_id: i64 = db.with_connection(|conn| {
            conn.execute("INSERT INTO favorites (name) VALUES ('Favorite 1')", []).unwrap();
            Ok(conn.last_insert_rowid())
        }).unwrap();

        let fav2_id: i64 = db.with_connection(|conn| {
            conn.execute("INSERT INTO favorites (name) VALUES ('Favorite 2')", []).unwrap();
            Ok(conn.last_insert_rowid())
        }).unwrap();

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            Some(fav1_id),
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            Some(fav2_id),
            "2024-01-01 11:00:00",
        );

        // When: Calculate favorite association
        let result = calc.calculate_favorite_association(&coll1, &coll2);

        // Then: No association
        assert!(result.is_none());
    }

    #[test]
    fn test_favorite_association_no_favorite_none() {
        // Given: Two articles with no favorite
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,  // No favorite
            "2024-01-01 10:00:00",
        );
        let coll2 = create_test_collection(
            &db,
            2,
            "Article 2",
            Some("https://example.com/2"),
            None,  // No favorite
            "2024-01-01 11:00:00",
        );

        // When: Calculate favorite association
        let result = calc.calculate_favorite_association(&coll1, &coll2);

        // Then: No association
        assert!(result.is_none());
    }

    // ========================================================================
    // Edge Cases and Boundary Tests
    // ========================================================================

    #[test]
    fn test_time_association_invalid_timestamp_none() {
        // Given: Collection with invalid timestamp
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        let coll1 = create_test_collection(
            &db,
            1,
            "Article 1",
            Some("https://example.com/1"),
            None,
            "2024-01-01 10:00:00",
        );
        let coll2 = Collection {
            id: 2,
            url: Some("https://example.com/2".to_string()),
            title: "Article 2".to_string(),
            content: "test content".to_string(),
            summary: None,
            starred: false,
            embedding_status: crate::db::EmbeddingStatus::Pending,
            favorite_id: None,
            status: crate::db::CollectionStatus::Active,
            r#type: "网页".to_string(),
            created_at: "".to_string(),  // Empty timestamp
            updated_at: "2024-01-01 10:00:00".to_string(),
        };

        // When: Calculate time association
        let result = calc.calculate_time_association(&coll1, &coll2);

        // Then: No association
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_tag_association_empty_tags_none() {
        // Given: Two collections with no tags
        let db = setup_test_db();
        let calc = AssociationCalculator::new(Arc::new(db.clone()));

        create_test_collection(&db, 1, "Article 1", Some("https://example.com/1"), None, "2024-01-01 10:00:00");
        create_test_collection(&db, 2, "Article 2", Some("https://example.com/2"), None, "2024-01-01 11:00:00");

        // When: Calculate tag association
        let result = calc.calculate_tag_association(1, 2).await;

        // Then: No association
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    // Legacy tests from original implementation
    #[test]
    fn test_extract_keywords_from_text_english() {
        // Test English keyword extraction
        let text = "Machine Learning and Artificial Intelligence";
        let keywords = extract_keywords_from_text(text);

        assert!(keywords.contains("machine"));
        assert!(keywords.contains("learning"));
        assert!(keywords.contains("artificial"));
        assert!(keywords.contains("intelligence"));
        assert!(!keywords.contains("and")); // Stop word filtered
    }

    #[test]
    fn test_extract_keywords_from_text_chinese() {
        // Test Chinese keyword extraction
        // Note: Current simple tokenization doesn't handle multi-character Chinese words well
        let text = "机器学习和人工智能";
        let keywords = extract_keywords_from_text(text);

        // At minimum, individual characters should be extracted
        // In a real implementation, proper Chinese word segmentation would be needed
        assert!(!keywords.is_empty(), "Should extract some keywords from Chinese text");
    }

    #[test]
    fn test_extract_keywords_filters_numbers() {
        // Test that pure numbers are filtered
        let text = "test 123 456 keyword";
        let keywords = extract_keywords_from_text(text);

        assert!(keywords.contains("test"));
        assert!(keywords.contains("keyword"));
        assert!(!keywords.contains("123"));
        assert!(!keywords.contains("456"));
    }

    #[test]
    fn test_extract_keywords_min_length() {
        // Test minimum length filtering
        let text = "a an the machine learning";
        let keywords = extract_keywords_from_text(text);

        assert!(!keywords.contains("a"));
        assert!(!keywords.contains("an"));
        // "the" is filtered by stop word, not length
        assert!(keywords.contains("machine"));
        assert!(keywords.contains("learning"));
    }

    #[test]
    fn test_is_stop_word_english() {
        assert!(is_stop_word("the"));
        assert!(is_stop_word("and"));
        assert!(is_stop_word("of"));
        assert!(!is_stop_word("machine"));
        assert!(!is_stop_word("learning"));
    }

    #[test]
    fn test_is_stop_word_chinese() {
        assert!(is_stop_word("的"));
        assert!(is_stop_word("了"));
        assert!(is_stop_word("在"));
        assert!(!is_stop_word("机器学习"));
        assert!(!is_stop_word("人工智能"));
    }

    #[test]
    fn test_is_stop_word_case_insensitive() {
        assert!(is_stop_word("The"));
        assert!(is_stop_word("AND"));
        assert!(is_stop_word("Of"));
    }
}

/// Extract keywords from text with filtering (supports Chinese and English)
fn extract_keywords_from_text(text: &str) -> HashSet<String> {
    // Simple tokenization (supports Chinese and English whitespace)
    let words = text
        .split(|c: char| c.is_whitespace())
        .filter(|s| !s.is_empty())
        .map(|s| s.trim())
        .collect::<Vec<_>>();

    let mut keywords = HashSet::new();

    for word in words {
        // Filter single characters
        if word.chars().count() < MIN_KEYWORD_LEN {
            continue;
        }

        // Filter stop words
        if is_stop_word(word) {
            continue;
        }

        // Filter pure numbers
        if word.chars().all(|c| c.is_numeric()) {
            continue;
        }

        // Filter special characters (keep Chinese, English, hyphens, underscores)
        let cleaned: String = word
            .chars()
            .filter(|c| c.is_alphabetic() || *c == '-' || *c == '_')
            .collect();

        if !cleaned.is_empty() {
            keywords.insert(cleaned.to_lowercase());
        }
    }

    keywords
}

/// Check if a word is a stop word (Chinese and English)
fn is_stop_word(word: &str) -> bool {
    // English stop words (common function words)
    const EN_STOP_WORDS: &[&str] = &[
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "be", "this",
        "that", "it", "not", "have", "has", "can", "will", "just", "do",
    ];

    // Chinese stop words (common function words, particles)
    const CN_STOP_WORDS: &[&str] = &[
        "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "这",
        "能", "去", "说", "要", "会", "他", "她", "它", "很", "也", "都", "而",
        "及", "等", "或", "个", "中", "为", "之", "以", "于", "对", "把",
    ];

    let word_lower = word.to_lowercase();
    EN_STOP_WORDS.contains(&word_lower.as_str()) || CN_STOP_WORDS.contains(&word_lower.as_str())
}

/// Get keywords with fallback strategy
///
/// First tries AI-extracted keywords, then falls back to title and tags
async fn get_keywords_with_fallback(
    db: &Arc<Database>,
    collection_id: i64,
) -> Result<(HashSet<String>, bool), CalculationError> {
    use crate::db::{AiMetadataRepository, CollectionRepository, CollectionTagRepository};

    // 1. Try AI keywords first (with error tolerance)
    let ai_repo = AiMetadataRepository::new(db.clone());
    let ai_keywords: HashSet<String> = match ai_repo.get_keywords(collection_id) {
        Ok(keywords) => keywords
            .into_iter()
            .map(|k| k.keyword.to_lowercase())
            .collect(),
        Err(e) => {
            warn!(
                "Failed to get AI keywords for collection {}, using fallback: {}",
                collection_id, e
            );
            HashSet::new() // Return empty set on failure, continue processing
        }
    };

    if !ai_keywords.is_empty() {
        return Ok((ai_keywords, false)); // false = AI source
    }

    // 2. Fallback: extract from title and tags
    let collection_repo = CollectionRepository::new(&*db);
    let collection = match collection_repo.get_by_id(collection_id) {
        Ok(Some(c)) => c,
        Ok(None) => {
            warn!("Collection {} does not exist", collection_id);
            return Ok((HashSet::new(), true));
        }
        Err(e) => {
            warn!("Failed to get collection {}, skipping: {}", collection_id, e);
            return Ok((HashSet::new(), true));
        }
    };

    let mut keywords = HashSet::new();

    // Extract from title
    if !collection.title.is_empty() {
        keywords.extend(extract_keywords_from_text(&collection.title));
    }

    // Extract from tags
    let tag_repo = CollectionTagRepository::new(db);
    let tags = tag_repo.get_tags_by_collection(collection_id).unwrap_or_default();
    for tag in tags {
        keywords.extend(extract_keywords_from_text(&tag.name));
    }

    tracing::debug!(
        "Collection {} using fallback keywords: {:?}",
        collection_id,
        keywords
    );

    Ok((keywords, true)) // true = fallback source
}
