//! Graph builder
//!
//! Builds graph data structures from associations

use crate::db::{Association, AssociationRepository, CollectionRepository, Database, DbError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub summary: Option<String>,
    pub tags: Vec<String>,
    pub folder: Option<String>,
    pub collected_at: i64,
    pub degree: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub id: String,
    pub source_id: i64,
    pub target_id: i64,
    pub r#type: String,
    pub weight: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
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

pub struct GraphBuilder {
    db: Arc<Database>,
}

impl GraphBuilder {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Build graph data with filters
    pub fn build_graph(
        &self,
        r#type: Option<&str>,
        min_weight: Option<f64>,
        max_nodes: Option<usize>,
    ) -> Result<GraphData, DbError> {
        let association_repo = AssociationRepository::new(self.db.clone());
        let collection_repo = CollectionRepository::new(&self.db);

        // Get all collections
        let collection_list = collection_repo.list(1000, 0, None, false, None, None)?;

        // Convert to full Collection objects
        let mut collections = Vec::new();
        for item in collection_list {
            if let Ok(Some(collection)) = collection_repo.get_by_id(item.id) {
                collections.push(collection);
            }
        }

        // Get associations
        let mut all_associations = Vec::new();
        for collection in &collections {
            let assocs = association_repo.get_by_collection(
                collection.id,
                r#type,
                min_weight,
            )?;
            all_associations.extend(assocs);
        }

        // Build node set from collections and associations
        let mut node_ids: std::collections::HashSet<i64> = collections.iter().map(|c| c.id).collect();
        for assoc in &all_associations {
            node_ids.insert(assoc.source_id);
            node_ids.insert(assoc.target_id);
        }

        // Calculate degrees
        let mut degrees: std::collections::HashMap<i64, i64> = std::collections::HashMap::new();
        for assoc in &all_associations {
            *degrees.entry(assoc.source_id).or_insert(0) += 1;
            *degrees.entry(assoc.target_id).or_insert(0) += 1;
        }

        // Build nodes
        let mut nodes = Vec::new();
        for collection in collections {
            if !node_ids.contains(&collection.id) {
                continue;
            }

            // Get tags
            use crate::db::CollectionTagRepository;
            let tag_repo = CollectionTagRepository::new(&self.db);
            let tags: Vec<String> = tag_repo
                .get_tags_by_collection(collection.id)
                .unwrap_or_default()
                .into_iter()
                .map(|t| t.name)
                .collect();

            // Get folder name
            let folder = collection.favorite_id.and_then(|fid| {
                use crate::db::FavoriteRepository;
                let fav_repo = FavoriteRepository::new(&self.db);
                fav_repo.get_by_id(fid).ok().flatten().map(|f| f.name)
            });

            // Parse collected_at timestamp
            let collected_at = chrono::DateTime::parse_from_rfc3339(&collection.created_at)
                .ok()
                .map(|dt| dt.timestamp())
                .unwrap_or(0);

            nodes.push(GraphNode {
                id: collection.id,
                title: collection.title,
                url: collection.url,
                summary: collection.summary,
                tags,
                folder,
                collected_at,
                degree: degrees.get(&collection.id).copied().unwrap_or(0),
            });
        }

        // Limit nodes if specified
        if let Some(max) = max_nodes {
            if nodes.len() > max {
                // Sort by degree and take top N
                nodes.sort_by(|a, b| b.degree.cmp(&a.degree));
                nodes.truncate(max);

                // Filter edges to only include selected nodes
                let selected_ids: std::collections::HashSet<i64> =
                    nodes.iter().map(|n| n.id).collect();
                all_associations.retain(|a| {
                    selected_ids.contains(&a.source_id) && selected_ids.contains(&a.target_id)
                });
            }
        }

        // Build edges
        let edges: Vec<GraphEdge> = all_associations
            .into_iter()
            .map(|a| GraphEdge {
                id: a.id,
                source_id: a.source_id,
                target_id: a.target_id,
                r#type: a.r#type,
                weight: a.weight,
                confidence: a.confidence,
            })
            .collect();

        Ok(GraphData { nodes, edges })
    }
}
