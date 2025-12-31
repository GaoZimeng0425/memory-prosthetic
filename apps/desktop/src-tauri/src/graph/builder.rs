//! Graph builder
//!
//! Builds graph data structures from associations

use crate::db::{Association, AssociationRepository, CollectionRepository, Database, DbError};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use tracing::warn;

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
    // 关联详情 - 用于显示具体的关联信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub semantic_similarity: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shared_tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shared_folders: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_interval: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keyword_overlap: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topic_match: Option<f64>,
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
        tracing::info!("build_graph: 获取到 {} 个 collection list items", collection_list.len());

        // Convert to full Collection objects
        let mut collections = Vec::new();
        let mut failed_count = 0;
        for item in &collection_list {
            match collection_repo.get_by_id(item.id) {
                Ok(Some(collection)) => {
                    collections.push(collection);
                }
                Ok(None) => {
                    tracing::warn!("build_graph: Collection {} 不存在", item.id);
                    failed_count += 1;
                }
                Err(e) => {
                    tracing::error!("build_graph: 获取 Collection {} 失败: {}", item.id, e);
                    failed_count += 1;
                }
            }
        }
        tracing::info!("build_graph: 成功转换 {} 个 collections，失败 {} 个", collections.len(), failed_count);

        // Get associations (deduplicated by ID)
        // Note: get_by_collection returns associations where collection is source OR target,
        // so each association may be returned twice when iterating over all collections.
        let mut seen_assoc_ids: HashSet<String> = HashSet::new();
        let mut all_associations = Vec::new();
        for collection in &collections {
            let assocs = association_repo.get_by_collection(
                collection.id,
                r#type,
                min_weight,
            )?;
            for assoc in assocs {
                if seen_assoc_ids.insert(assoc.id.clone()) {
                    all_associations.push(assoc);
                }
            }
        }
        tracing::info!("build_graph: 获取到 {} 个去重后的关联", all_associations.len());

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

            // Parse collected_at timestamp (SQLite datetime format: 'YYYY-MM-DD HH:MM:SS')
            let collected_at = if collection.created_at.is_empty() {
                tracing::warn!("Collection {} has empty created_at, using 0", collection.id);
                0
            } else {
                match NaiveDateTime::parse_from_str(&collection.created_at, "%Y-%m-%d %H:%M:%S") {
                    Ok(dt) => dt.and_utc().timestamp(),
                    Err(e) => {
                        warn!("Failed to parse created_at for collection {}: {} (value: '{}'), using 0",
                            collection.id, e, collection.created_at);
                        0
                    }
                }
            };

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
                // 关联详情
                semantic_similarity: a.semantic_similarity,
                shared_tags: a.shared_tags,
                shared_folders: a.shared_folders,
                time_interval: a.time_interval,
                domain: a.domain,
                keyword_overlap: a.keyword_overlap,
                topic_match: a.topic_match,
            })
            .collect();

        tracing::info!("build_graph: 返回 {} 个节点，{} 条边", nodes.len(), edges.len());
        Ok(GraphData { nodes, edges })
    }

    /// Build focused graph data (only nodes related to the focused node)
    /// Uses BFS traversal to find related nodes up to max_depth levels
    pub fn build_focused_graph(
        &self,
        focused_id: i64,
        max_depth: usize,
        r#type: Option<&str>,
        min_weight: Option<f64>,
        max_nodes: Option<usize>,
    ) -> Result<GraphData, DbError> {
        let association_repo = AssociationRepository::new(self.db.clone());
        let collection_repo = CollectionRepository::new(&self.db);

        // BFS traversal to find all related nodes
        let related_node_ids = self.get_related_nodes(
            &association_repo,
            focused_id,
            max_depth,
            r#type,
            min_weight,
        )?;

        if related_node_ids.is_empty() {
            // No related nodes found, return empty graph
            return Ok(GraphData {
                nodes: Vec::new(),
                edges: Vec::new(),
            });
        }

        // Get collections for related nodes
        let mut collections = Vec::new();
        for node_id in &related_node_ids {
            if let Ok(Some(collection)) = collection_repo.get_by_id(*node_id) {
                collections.push(collection);
            }
        }

        // Get all associations between related nodes
        let mut all_associations = Vec::new();
        let related_set: HashSet<i64> = related_node_ids.iter().copied().collect();

        for node_id in &related_node_ids {
            let assocs = association_repo.get_by_collection(*node_id, r#type, min_weight)?;
            // Filter to only include associations between related nodes
            for assoc in assocs {
                if related_set.contains(&assoc.source_id) && related_set.contains(&assoc.target_id) {
                    // Avoid duplicates
                    if !all_associations.iter().any(|a: &Association| a.id == assoc.id) {
                        all_associations.push(assoc);
                    }
                }
            }
        }

        // Calculate degrees (only within the focused subgraph)
        let mut degrees: HashMap<i64, i64> = HashMap::new();
        for assoc in &all_associations {
            *degrees.entry(assoc.source_id).or_insert(0) += 1;
            *degrees.entry(assoc.target_id).or_insert(0) += 1;
        }

        // Build nodes
        let mut nodes = Vec::new();
        for collection in collections {
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

            // Parse collected_at timestamp (SQLite datetime format: 'YYYY-MM-DD HH:MM:SS')
            let collected_at = if collection.created_at.is_empty() {
                tracing::warn!("Collection {} has empty created_at, using 0", collection.id);
                0
            } else {
                match NaiveDateTime::parse_from_str(&collection.created_at, "%Y-%m-%d %H:%M:%S") {
                    Ok(dt) => dt.and_utc().timestamp(),
                    Err(e) => {
                        warn!("Failed to parse created_at for collection {}: {} (value: '{}'), using 0",
                            collection.id, e, collection.created_at);
                        0
                    }
                }
            };

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
                // Sort by degree and take top N (but always include focused node)
                nodes.sort_by(|a, b| {
                    if a.id == focused_id {
                        std::cmp::Ordering::Less
                    } else if b.id == focused_id {
                        std::cmp::Ordering::Greater
                    } else {
                        b.degree.cmp(&a.degree)
                    }
                });
                nodes.truncate(max);

                // Filter edges to only include selected nodes
                let selected_ids: HashSet<i64> = nodes.iter().map(|n| n.id).collect();
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
                // 关联详情
                semantic_similarity: a.semantic_similarity,
                shared_tags: a.shared_tags,
                shared_folders: a.shared_folders,
                time_interval: a.time_interval,
                domain: a.domain,
                keyword_overlap: a.keyword_overlap,
                topic_match: a.topic_match,
            })
            .collect();

        Ok(GraphData { nodes, edges })
    }

    /// Get related nodes using BFS traversal
    fn get_related_nodes(
        &self,
        association_repo: &AssociationRepository,
        center_id: i64,
        max_depth: usize,
        r#type: Option<&str>,
        min_weight: Option<f64>,
    ) -> Result<Vec<i64>, DbError> {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        let mut result = HashSet::new();

        queue.push_back((center_id, 0)); // (node_id, depth)
        visited.insert(center_id);
        result.insert(center_id);

        while let Some((node_id, depth)) = queue.pop_front() {
            if depth >= max_depth {
                continue;
            }

            // Get associations for this node
            let associations = association_repo.get_by_collection(node_id, r#type, min_weight)?;

            for assoc in associations {
                // Get neighbor node ID
                let neighbor_id = if assoc.source_id == node_id {
                    assoc.target_id
                } else {
                    assoc.source_id
                };

                if !visited.contains(&neighbor_id) {
                    visited.insert(neighbor_id);
                    result.insert(neighbor_id);
                    queue.push_back((neighbor_id, depth + 1));
                }
            }
        }

        Ok(result.into_iter().collect())
    }
}
