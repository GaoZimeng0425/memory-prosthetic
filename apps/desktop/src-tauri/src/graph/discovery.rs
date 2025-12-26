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
                    time_interval: None,
                    domain: Some(domain),
                    keyword_overlap: None,
                    topic_match: None,
                });
            }
        }

        Ok(associations)
    }
}
