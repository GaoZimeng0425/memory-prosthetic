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

            // Keyword association
            if let Ok(Some(weight)) = self
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
                    time_interval: None,
                    domain: None,
                    keyword_overlap: Some(weight),
                    topic_match: None,
                });
            }

            // Topic association
            if let Ok(Some(weight)) = self
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
                    shared_folders: None,
                    time_interval: None,
                    domain: None,
                    keyword_overlap: None,
                    topic_match: Some(weight),
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
        let collection_repo = CollectionRepository::new(&self.db);
        // Get all collections (up to 1000)
        let all_list = collection_repo
            .list(1000, 0, None, false, None, None)
            .map_err(DiscoveryError::Database)?;

        tracing::info!("🔍 discover_all_pairs: 找到 {} 个内容", all_list.len());

        // Convert to full Collection objects
        let mut all_contents = Vec::new();
        for item in all_list {
            if let Ok(Some(collection)) = collection_repo.get_by_id(item.id) {
                all_contents.push(collection);
            }
        }

        tracing::info!("📦 discover_all_pairs: 成功加载 {} 个内容对象", all_contents.len());

        // 检查关键词和主题数据
        use crate::db::AiMetadataRepository;
        let ai_repo = AiMetadataRepository::new(self.db.clone());
        let mut collections_with_keywords = 0;
        let mut collections_with_topics = 0;
        for content in &all_contents {
            if let Ok(keywords) = ai_repo.get_keywords(content.id) {
                if !keywords.is_empty() {
                    collections_with_keywords += 1;
                }
            }
            if let Ok(topics) = ai_repo.get_topics(content.id) {
                if !topics.is_empty() {
                    collections_with_topics += 1;
                }
            }
        }
        tracing::info!(
            "📊 数据统计: {} 个内容有关键词, {} 个内容有主题",
            collections_with_keywords,
            collections_with_topics
        );

        // 详细列出有关键词和主题的collection
        for content in &all_contents {
            if let Ok(keywords) = ai_repo.get_keywords(content.id) {
                if !keywords.is_empty() {
                    tracing::info!(
                        "  Collection {}: {} 个关键词: {:?}",
                        content.id,
                        keywords.len(),
                        keywords.iter().map(|k| k.keyword.clone()).collect::<Vec<_>>()
                    );
                }
            }
            if let Ok(topics) = ai_repo.get_topics(content.id) {
                if !topics.is_empty() {
                    tracing::info!(
                        "  Collection {}: {} 个主题: {:?}",
                        content.id,
                        topics.len(),
                        topics.iter().map(|t| t.topic.clone()).collect::<Vec<_>>()
                    );
                }
            }
        }

        let mut associations = Vec::new();
        let mut keyword_count = 0;
        let mut topic_count = 0;

        // Compare each pair of collections
        for i in 0..all_contents.len() {
            let content1 = &all_contents[i];
            for j in (i + 1)..all_contents.len() {
                let content2 = &all_contents[j];

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
                        time_interval: None,
                        domain: Some(domain),
                        keyword_overlap: None,
                        topic_match: None,
                    });
                }

                // Keyword association
                if let Ok(Some(weight)) = self
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
                        time_interval: None,
                        domain: None,
                        keyword_overlap: Some(weight),
                        topic_match: None,
                    });
                }

                // Topic association
                if let Ok(Some(weight)) = self
                    .calculator
                    .calculate_topic_association(content1.id, content2.id)
                    .await
                {
                    topic_count += 1;
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
                        shared_folders: None,
                        time_interval: None,
                        domain: None,
                        keyword_overlap: None,
                        topic_match: Some(weight),
                    });
                }
            }
        }

        tracing::info!(
            "🎯 discover_all_pairs: 发现 {} 个关联（关键词: {}, 主题: {}）",
            associations.len(),
            keyword_count,
            topic_count
        );

        // 详细日志：列出所有发现的关联
        for assoc in &associations {
            tracing::info!(
                "  → 关联: {} -> {} (type: {}, weight: {:.2}, keyword_overlap: {:?}, topic_match: {:?})",
                assoc.source_id,
                assoc.target_id,
                assoc.r#type,
                assoc.weight,
                assoc.keyword_overlap,
                assoc.topic_match
            );
        }

        Ok(associations)
    }
}
