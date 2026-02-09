//! Association discovery
//!
//! Discovers associations between collections using various strategies

use crate::db::{Collection, CollectionRepository, Database, DbError};
use crate::graph::association::{AssociationCalculator, AssociationType, CalculationError};
use crate::graph::builder::CreateAssociation;
use std::sync::Arc;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DiscoveryError {
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    #[error("Calculation error: {0}")]
    Calculation(#[from] CalculationError),
}

/// Incremental association discovery
pub struct IncrementalDiscovery {
    db: Arc<Database>,
    calculator: AssociationCalculator,
}

impl IncrementalDiscovery {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db: db.clone(),
            calculator: AssociationCalculator::new(db),
        }
    }

    /// Discover associations for a new collection
    pub async fn discover_for_new_content(
        &self,
        new_content: &Collection,
    ) -> Result<Vec<CreateAssociation>, DiscoveryError> {
        // Get recent collections (last 100) for comparison
        let collection_repo = CollectionRepository::new(&self.db);
        let recent_list = collection_repo
            .list(100, 0, None, false, None, None)
            .map_err(DiscoveryError::Database)?;

        // Convert to full Collection objects
        let mut recent_contents = Vec::new();
        for item in recent_list {
            if let Ok(Some(collection)) = collection_repo.get_by_id(item.id) {
                recent_contents.push(collection);
            }
        }

        let mut associations = Vec::new();

        // Parallel discovery of different association types
        for existing in &recent_contents {
            if existing.id == new_content.id {
                continue;
            }

            // Semantic similarity
            if let Ok(similarity) = self
                .calculator
                .calculate_semantic_similarity(new_content, existing)
                .await
            {
                if similarity >= 0.7 {
                    associations.push(CreateAssociation {
                        source_id: new_content.id,
                        target_id: existing.id,
                        r#type: AssociationType::Semantic.as_str().to_string(),
                        types: None,
                        weight: similarity,
                        confidence: if similarity > 0.85 { 1.0 } else { 0.7 },
                        quality_score: similarity,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: Some(similarity),
                        shared_tags: None,
                        shared_folders: None,
                        shared_keywords: None,
                        time_interval: None,
                        domain: None,
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }
            }

            // Tag association
            if let Ok(Some((weight, shared_tags))) = self
                .calculator
                .calculate_tag_association(new_content.id, existing.id)
                .await
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Tag.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.7,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: Some(shared_tags),
                    shared_folders: None,
                        shared_keywords: None,
                    time_interval: None,
                    domain: None,
                    keyword_overlap: None,
                    topic_match: None,
                });
            }

            // Time association
            if let Some((weight, time_interval)) =
                self.calculator.calculate_time_association(new_content, existing)
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Time.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.5,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: None,
                    shared_folders: None,
                        shared_keywords: None,
                    time_interval: Some(time_interval),
                    domain: None,
                    keyword_overlap: None,
                    topic_match: None,
                });
            }

            // Domain association
            if let Some((weight, domain)) =
                self.calculator.calculate_domain_association(new_content, existing)
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Domain.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.6,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: None,
                    shared_folders: None,
                        shared_keywords: None,
                    time_interval: None,
                    domain: Some(domain),
                    keyword_overlap: None,
                    topic_match: None,
                });
            }

            // Keyword association
            if let Ok(Some((weight, shared_keywords))) = self
                .calculator
                .calculate_keyword_association(new_content.id, existing.id)
                .await
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Keyword.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.6,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: None,
                    shared_folders: None,
                    shared_keywords: Some(shared_keywords), // Store shared keywords here
                    time_interval: None,
                    domain: None,
                    keyword_overlap: Some(weight),
                    topic_match: None,
                });
            }

            // Topic association
            if let Ok(Some((weight, shared_topics))) = self
                .calculator
                .calculate_topic_association(new_content.id, existing.id)
                .await
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Topic.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.7,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: None,
                    shared_folders: Some(shared_topics), // Store shared topics here
                    shared_keywords: None,
                    time_interval: None,
                    domain: None,
                    keyword_overlap: None,
                    topic_match: Some(weight),
                });
            }

            // Favorite (folder) association
            if let Some((weight, favorite_name)) = self
                .calculator
                .calculate_favorite_association(new_content, existing)
            {
                associations.push(CreateAssociation {
                    source_id: new_content.id,
                    target_id: existing.id,
                    r#type: AssociationType::Folder.as_str().to_string(),
                    types: None,
                    weight,
                    confidence: 0.8,
                    quality_score: weight,
                    reason: Some("auto_discovered".to_string()),
                    user_feedback: None,
                    is_expired: false,
                    is_directional: false,
                    direction: None,
                    semantic_similarity: None,
                    shared_tags: None,
                    shared_folders: None,
                        shared_keywords: None,
                    time_interval: None,
                    domain: Some(favorite_name),
                    keyword_overlap: None,
                    topic_match: None,
                });
            }
        }

        Ok(associations)
    }

    /// Discover associations for all collections (batch discovery)
    /// This method compares all collections with each other, not just recent ones
    pub async fn discover_all_pairs(
        &self,
    ) -> Result<Vec<CreateAssociation>, DiscoveryError> {
        use std::time::Instant;

        let start = Instant::now();

        // Auto-cleanup old keyword, folder, and topic associations in a single transaction
        let (deleted_keyword, deleted_folder, deleted_topic, deleted_meta) = self
            .db
            .with_connection_mut(|conn| {
                // Delete keyword associations
                let deleted_kw = conn.execute("DELETE FROM associations WHERE type = 'keyword'", [])?;

                // Delete folder associations (old ones without domain info)
                let deleted_fol = conn.execute("DELETE FROM associations WHERE type = 'folder'", [])?;

                // Delete topic associations (old ones without shared topics)
                let deleted_tp = conn.execute("DELETE FROM associations WHERE type = 'topic'", [])?;

                // Delete orphaned metadata
                let deleted_meta = conn.execute(
                    "DELETE FROM association_metadata
                     WHERE association_id IN (
                         SELECT id FROM associations WHERE type = 'keyword'
                     )",
                    [],
                )?;

                Ok((deleted_kw, deleted_fol, deleted_tp, deleted_meta))
            })
            .map_err(DiscoveryError::Database)?;

        tracing::info!(
            "Cleaned up {} old keyword associations, {} old folder associations, {} old topic associations, and {} metadata records",
            deleted_keyword,
            deleted_folder,
            deleted_topic,
            deleted_meta
        );

        let collection_repo = CollectionRepository::new(&self.db);
        // Get all collections (up to 1000)
        let all_list = collection_repo
            .list(1000, 0, None, false, None, None)
            .map_err(DiscoveryError::Database)?;

        tracing::info!("discover_all_pairs: found {} collections", all_list.len());

        // Convert to full Collection objects
        let mut all_contents = Vec::new();
        for item in all_list {
            if let Ok(Some(collection)) = collection_repo.get_by_id(item.id) {
                all_contents.push(collection);
            }
        }

        tracing::info!(
            "discover_all_pairs: loaded {} collection objects",
            all_contents.len()
        );

        let mut associations = Vec::new();
        let mut keyword_count = 0;
        let mut topic_count = 0;
        let mut favorite_count = 0;

        // Track statistics
        let mut total_attempts = 0;
        let mut topic_attempts = 0;
        let mut topic_created = 0;

        // Compare each pair of collections
        for i in 0..all_contents.len() {
            let content1 = &all_contents[i];
            for j in (i + 1)..all_contents.len() {
                let content2 = &all_contents[j];
                total_attempts += 1;

                // Semantic similarity
                if let Ok(similarity) = self
                    .calculator
                    .calculate_semantic_similarity(content1, content2)
                    .await
                {
                    if similarity >= 0.7 {
                        associations.push(CreateAssociation {
                            source_id: content1.id,
                            target_id: content2.id,
                            r#type: AssociationType::Semantic.as_str().to_string(),
                            types: None,
                            weight: similarity,
                            confidence: if similarity > 0.85 { 1.0 } else { 0.7 },
                            quality_score: similarity,
                            reason: Some("auto_discovered".to_string()),
                            user_feedback: None,
                            is_expired: false,
                            is_directional: false,
                            direction: None,
                            semantic_similarity: Some(similarity),
                            shared_tags: None,
                            shared_folders: None,
                        shared_keywords: None,
                            time_interval: None,
                            domain: None,
                            keyword_overlap: None,
                            topic_match: None,
                        });
                    }
                }

                // Tag association
                if let Ok(Some((weight, shared_tags))) = self
                    .calculator
                    .calculate_tag_association(content1.id, content2.id)
                    .await
                {
                    associations.push(CreateAssociation {
                        source_id: content1.id,
                        target_id: content2.id,
                        r#type: AssociationType::Tag.as_str().to_string(),
                        types: None,
                        weight,
                        confidence: 0.7,
                        quality_score: weight,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: None,
                        shared_tags: Some(shared_tags),
                        shared_folders: None,
                        shared_keywords: None,
                        time_interval: None,
                        domain: None,
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }

                // Time association
                if let Some((weight, time_interval)) =
                    self.calculator.calculate_time_association(content1, content2)
                {
                    associations.push(CreateAssociation {
                        source_id: content1.id,
                        target_id: content2.id,
                        r#type: AssociationType::Time.as_str().to_string(),
                        types: None,
                        weight,
                        confidence: 0.5,
                        quality_score: weight,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: None,
                        shared_tags: None,
                        shared_folders: None,
                        shared_keywords: None,
                        time_interval: Some(time_interval),
                        domain: None,
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }

                // Domain association
                if let Some((weight, domain)) =
                    self.calculator.calculate_domain_association(content1, content2)
                {
                    associations.push(CreateAssociation {
                        source_id: content1.id,
                        target_id: content2.id,
                        r#type: AssociationType::Domain.as_str().to_string(),
                        types: None,
                        weight,
                        confidence: 0.6,
                        quality_score: weight,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: None,
                        shared_tags: None,
                        shared_folders: None,
                        shared_keywords: None,
                        time_interval: None,
                        domain: Some(domain),
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }

                // Keyword association
                if let Ok(Some((weight, shared_keywords))) = self
                    .calculator
                    .calculate_keyword_association(content1.id, content2.id)
                    .await
                {
                    keyword_count += 1;
                    associations.push(CreateAssociation {
                        source_id: content1.id,
                        target_id: content2.id,
                        r#type: AssociationType::Keyword.as_str().to_string(),
                        types: None,
                        weight,
                        confidence: 0.6,
                        quality_score: weight,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: None,
                        shared_tags: None,
                        shared_folders: None,
                        shared_keywords: Some(shared_keywords), // Store shared keywords here
                        time_interval: None,
                        domain: None,
                        keyword_overlap: Some(weight),
                        topic_match: None,
                    });
                }

                // Topic association
                topic_attempts += 1;
                match self.calculator.calculate_topic_association(content1.id, content2.id).await {
                    Ok(Some((weight, shared_topics))) => {
                        topic_count += 1;
                        topic_created += 1;
                        tracing::info!(
                            "Creating topic association: {} <-> {} with topics {:?}",
                            content1.id,
                            content2.id,
                            shared_topics
                        );
                        associations.push(CreateAssociation {
                            source_id: content1.id,
                            target_id: content2.id,
                            r#type: AssociationType::Topic.as_str().to_string(),
                            types: None,
                            weight,
                            confidence: 0.7,
                            quality_score: weight,
                            reason: Some("auto_discovered".to_string()),
                            user_feedback: None,
                            is_expired: false,
                            is_directional: false,
                            direction: None,
                            semantic_similarity: None,
                            shared_tags: None,
                            shared_folders: Some(shared_topics), // Store shared topics here
                            shared_keywords: None,
                            time_interval: None,
                            domain: None,
                            keyword_overlap: None,
                            topic_match: Some(weight),
                        });
                    }
                    Ok(None) => {
                        // No shared topics between these collections
                        tracing::debug!(
                            "No shared topics between {} and {}",
                            content1.id,
                            content2.id
                        );
                    }
                    Err(e) => {
                        tracing::warn!(
                            "Failed to calculate topic association between {} and {}: {}",
                            content1.id,
                            content2.id,
                            e
                        );
                    }
                }

                // Favorite (folder) association
                if let Some((weight, favorite_name)) = self
                    .calculator
                    .calculate_favorite_association(content1, content2)
                {
                    favorite_count += 1;
                    associations.push(CreateAssociation {
                        source_id: content1.id,
                        target_id: content2.id,
                        r#type: AssociationType::Folder.as_str().to_string(),
                        types: None,
                        weight,
                        confidence: 0.8,
                        quality_score: weight,
                        reason: Some("auto_discovered".to_string()),
                        user_feedback: None,
                        is_expired: false,
                        is_directional: false,
                        direction: None,
                        semantic_similarity: None,
                        shared_tags: None,
                        shared_folders: None,
                        shared_keywords: None,
                        time_interval: None,
                        domain: Some(favorite_name),
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }
            }
        }

        let duration = start.elapsed();

        // Calculate statistics
        let avg_weight = if !associations.is_empty() {
            associations.iter().map(|a| a.weight).sum::<f64>() / associations.len() as f64
        } else {
            0.0
        };

        // Detailed statistics log
        tracing::info!(
            "Association discovery statistics:
            - Total pairs attempted: {}
            - Associations created: {}
            - Keyword associations: {}
            - Topic associations: {} (attempts: {}, created: {})
            - Favorite associations: {}
            - Average weight: {:.2}
            - Duration: {:?}",
            total_attempts,
            associations.len(),
            keyword_count,
            topic_count,
            topic_attempts,
            topic_created,
            favorite_count,
            avg_weight,
            duration
        );

        if duration.as_secs() > 30 {
            tracing::warn!(
                "Association discovery took over 30 seconds ({:?}), consider optimization",
                duration
            );
        }

        Ok(associations)
    }
}
