//! Association calculation
//!
//! Calculates different types of associations between collections

use crate::db::{Collection, CollectionRepository, CollectionTagRepository, Database, DbError};
use crate::embedding::get_embedding_model;
use crate::graph::association::AssociationType::Keyword;
use chrono::NaiveDateTime;
use std::collections::HashSet;
use std::sync::Arc;
use thiserror::Error;
use tracing::warn;

// Fallback strategy constants
const FALLBACK_DISCOUNT: f64 = 0.5;       // Fallback keyword weight discount
const MIN_KEYWORD_LEN: usize = 2;          // Minimum keyword length

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
        let min_len = keywords1.len().min(keywords2.len()).max(1);
        let weight = (shared_keywords.len() as f64 / min_len as f64).min(1.0);

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

                tracing::info!(
                    "Favorite association: {} and {} both in favorite {} ({})",
                    collection1.id,
                    collection2.id,
                    fav1,
                    favorite_name
                );
                Some((0.5, favorite_name)) // Fixed weight with favorite name
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
        let text = "机器学习和人工智能";
        let keywords = extract_keywords_from_text(text);

        assert!(keywords.contains("机器学习"));
        assert!(keywords.contains("人工智能"));
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

    // Note: Integration tests for calculate_keyword_association require
    // test database setup, which should be implemented in db/test_utils.rs
    // These test cases are documented for future implementation:
    //
    // - test_both_have_ai_keywords: Both collections with AI keywords
    // - test_one_side_fallback: One with AI keywords, one with tags
    // - test_both_empty: Both without keywords or tags
    // - test_weight_formula_relative: Verify relative weight calculation
    // - test_fallback_weight_discount: Verify 0.5x discount for fallback
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
