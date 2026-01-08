//! Graph clustering and community detection
//!
//! Implements algorithms to identify clusters and communities in the knowledge graph

use crate::db::{Association, AssociationRepository, CollectionRepository, Database, DbError};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use thiserror::Error;
use tracing::{info, warn};

#[derive(Debug, Error)]
pub enum ClusteringError {
    #[error("Database error: {0}")]
    Database(#[from] DbError),

    #[error("Graph error: {0}")]
    Graph(String),
}

/// Represents a cluster of nodes in the knowledge graph
#[derive(Debug, Clone)]
pub struct Cluster {
    pub id: usize,
    pub node_ids: Vec<i64>,
    pub internal_edges: usize,
    pub external_edges: usize,
    pub total_weight: f64,
    pub density: f64,
    pub modularity_contribution: f64,
}

/// Analyzer for graph clustering
pub struct ClusterAnalyzer {
    db: Arc<Database>,
    min_weight_threshold: f64,
}

impl ClusterAnalyzer {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            db,
            min_weight_threshold: 0.3, // Minimum edge weight to consider
        }
    }

    pub fn with_threshold(mut self, threshold: f64) -> Self {
        self.min_weight_threshold = threshold;
        self
    }

    /// Detect connected components in the graph
    /// Returns clusters of nodes that are connected to each other
    pub fn detect_connected_components(&self) -> Result<Vec<Cluster>, ClusteringError> {
        let association_repo = AssociationRepository::new(self.db.clone());
        let collection_repo = CollectionRepository::new(&self.db);

        // Get all collections and associations
        let collections = collection_repo.list(1000, 0, None, false, None, None)?;
        let mut all_associations = Vec::new();

        for collection in &collections {
            let assocs = association_repo.get_by_collection(collection.id, None, Some(self.min_weight_threshold))?;
            all_associations.extend(assocs);
        }

        if all_associations.is_empty() {
            return Ok(Vec::new());
        }

        // Build adjacency list
        let mut graph: HashMap<i64, HashSet<i64>> = HashMap::new();
        let mut edges_by_nodes: HashMap<(i64, i64), f64> = HashMap::new();

        for assoc in &all_associations {
            graph.entry(assoc.source_id).or_insert_with(HashSet::new).insert(assoc.target_id);
            graph.entry(assoc.target_id).or_insert_with(HashSet::new).insert(assoc.source_id);
            
            // Store max weight for each edge pair
            let key = if assoc.source_id < assoc.target_id {
                (assoc.source_id, assoc.target_id)
            } else {
                (assoc.target_id, assoc.source_id)
            };
            edges_by_nodes.entry(key).and_modify(|w| *w = w.max(assoc.weight)).or_insert(assoc.weight);
        }

        // Find connected components using BFS
        let mut visited = HashSet::new();
        let mut clusters = Vec::new();

        for &node_id in graph.keys() {
            if visited.contains(&node_id) {
                continue;
            }

            let cluster = self.bfs_component(node_id, &graph, &mut visited);
            if !cluster.node_ids.is_empty() {
                let cluster = self.calculate_cluster_metrics(cluster, &all_associations, &collections)?;
                clusters.push(cluster);
            }
        }

        // Add isolated nodes as single-node clusters
        for collection in &collections {
            if !visited.contains(&collection.id) {
                clusters.push(Cluster {
                    id: clusters.len(),
                    node_ids: vec![collection.id],
                    internal_edges: 0,
                    external_edges: 0,
                    total_weight: 0.0,
                    density: 0.0,
                    modularity_contribution: 0.0,
                });
                visited.insert(collection.id);
            }
        }

        // Assign cluster IDs
        for (idx, cluster) in clusters.iter_mut().enumerate() {
            cluster.id = idx;
        }

        info!("Detected {} clusters", clusters.len());
        Ok(clusters)
    }

    /// Greedy weighted clustering algorithm
    /// Groups nodes based on edge weights to maximize modularity
    pub fn weighted_clustering(&self) -> Result<Vec<Cluster>, ClusteringError> {
        let association_repo = AssociationRepository::new(self.db.clone());
        let collection_repo = CollectionRepository::new(&self.db);

        // Get all collections
        let collections = collection_repo.list(1000, 0, None, false, None, None)?;
        let node_count = collections.len() as f64;

        // Get all associations
        let mut all_associations = Vec::new();
        for collection in &collections {
            let assocs = association_repo.get_by_collection(collection.id, None, Some(self.min_weight_threshold))?;
            all_associations.extend(assocs);
        }

        if all_associations.is_empty() {
            return Ok(vec![Cluster {
                id: 0,
                node_ids: collections.iter().map(|c| c.id).collect(),
                internal_edges: 0,
                external_edges: 0,
                total_weight: 0.0,
                density: 0.0,
                modularity_contribution: 0.0,
            }]);
        }

        // Build edge list with weights
        let mut edges: Vec<(i64, i64, f64)> = Vec::new();
        let mut edge_weight_map: HashMap<(i64, i64), f64> = HashMap::new();

        for assoc in &all_associations {
            let key = if assoc.source_id < assoc.target_id {
                (assoc.source_id, assoc.target_id)
            } else {
                (assoc.target_id, assoc.source_id)
            };
            edge_weight_map.entry(key)
                .and_modify(|w| *w += assoc.weight)
                .or_insert(assoc.weight);
        }

        for ((u, v), weight) in edge_weight_map.iter() {
            edges.push((*u, *v, *weight));
        }

        // Sort edges by weight (descending)
        edges.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));

        // Greedy clustering: merge nodes with strongest connections
        let mut cluster_map: HashMap<i64, usize> = HashMap::new();
        let mut cluster_members: Vec<HashSet<i64>> = Vec::new();

        // Initialize each node as its own cluster
        for collection in &collections {
            let cluster_id = cluster_members.len();
            cluster_members.push({
                let mut set = HashSet::new();
                set.insert(collection.id);
                set
            });
            cluster_map.insert(collection.id, cluster_id);
        }

        // Merge clusters based on edge weights
        for &(u, v, _weight) in &edges {
            let u_cluster = cluster_map.get(&u).copied();
            let v_cluster = cluster_map.get(&v).copied();

            if let (Some(uc), Some(vc)) = (u_cluster, v_cluster) {
                if uc != vc {
                    // Merge clusters
                    let members = cluster_members[vc].iter().copied().collect::<Vec<_>>();
                    for member in members {
                        cluster_map.insert(member, uc);
                        cluster_members[uc].insert(member);
                    }
                    cluster_members[vc].clear();
                }
            }
        }

        // Build final clusters
        let mut final_clusters = Vec::new();
        let mut processed = HashSet::new();

        for collection in &collections {
            let cluster_id = cluster_map.get(&collection.id).copied().unwrap_or(0);
            
            if processed.contains(&cluster_id) {
                continue;
            }

            let node_ids: Vec<i64> = cluster_members[cluster_id].iter().copied().collect();
            let cluster = Cluster {
                id: final_clusters.len(),
                node_ids: node_ids.clone(),
                internal_edges: 0,
                external_edges: 0,
                total_weight: 0.0,
                density: 0.0,
                modularity_contribution: 0.0,
            };

            let cluster = self.calculate_cluster_metrics(cluster, &all_associations, &collections)?;
            final_clusters.push(cluster);
            processed.insert(cluster_id);
        }

        info!("Weighted clustering produced {} clusters", final_clusters.len());
        Ok(final_clusters)
    }

    /// BFS to find a connected component
    fn bfs_component(&self, start: i64, graph: &HashMap<i64, HashSet<i64>>, visited: &mut HashSet<i64>) -> Cluster {
        let mut queue = VecDeque::new();
        let mut component = Vec::new();

        queue.push_back(start);
        visited.insert(start);

        while let Some(node) = queue.pop_front() {
            component.push(node);

            if let Some(neighbors) = graph.get(&node) {
                for &neighbor in neighbors {
                    if !visited.contains(&neighbor) {
                        visited.insert(neighbor);
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        Cluster {
            id: 0, // Will be assigned later
            node_ids: component,
            internal_edges: 0,
            external_edges: 0,
            total_weight: 0.0,
            density: 0.0,
            modularity_contribution: 0.0,
        }
    }

    /// Calculate metrics for a cluster
    fn calculate_cluster_metrics(
        &self,
        mut cluster: Cluster,
        all_associations: &[Association],
        all_collections: &[crate::db::CollectionListItem],
    ) -> Result<Cluster, ClusteringError> {
        let node_set: HashSet<i64> = cluster.node_ids.iter().copied().collect();
        let mut internal_weight = 0.0;
        let mut internal_edge_count = 0;
        let mut external_edge_count = 0;

        // Count internal and external edges
        for assoc in all_associations {
            if assoc.weight < self.min_weight_threshold {
                continue;
            }

            let source_in = node_set.contains(&assoc.source_id);
            let target_in = node_set.contains(&assoc.target_id);

            if source_in && target_in {
                internal_weight += assoc.weight;
                internal_edge_count += 1;
            } else if source_in || target_in {
                external_edge_count += 1;
            }
        }

        // Calculate density
        let node_count = cluster.node_ids.len();
        let max_edges = if node_count > 1 {
            (node_count * (node_count - 1)) / 2
        } else {
            0
        };
        let density = if max_edges > 0 {
            internal_edge_count as f64 / max_edges as f64
        } else {
            0.0
        };

        cluster.internal_edges = internal_edge_count;
        cluster.external_edges = external_edge_count;
        cluster.total_weight = internal_weight;
        cluster.density = density;

        Ok(cluster)
    }

    /// Calculate modularity score for clustering
    /// Higher modularity indicates better clustering
    pub fn calculate_modularity(&self, clusters: &[Cluster]) -> Result<f64, ClusteringError> {
        let association_repo = AssociationRepository::new(self.db.clone());
        let collection_repo = CollectionRepository::new(&self.db);

        let collections = collection_repo.list(1000, 0, None, false, None, None)?;
        let mut all_associations = Vec::new();

        for collection in &collections {
            let assocs = association_repo.get_by_collection(collection.id, None, None)?;
            all_associations.extend(assocs);
        }

        let mut total_weight = 0.0;
        for assoc in &all_associations {
            total_weight += assoc.weight;
        }

        if total_weight == 0.0 {
            return Ok(0.0);
        }

        let mut modularity = 0.0;
        let node_clusters: HashMap<i64, usize> = clusters
            .iter()
            .flat_map(|c| c.node_ids.iter().map(move |&n| (n, c.id)))
            .collect();

        for assoc in &all_associations {
            let source_cluster = node_clusters.get(&assoc.source_id);
            let target_cluster = node_clusters.get(&assoc.target_id);

            if let (Some(&sc), Some(&tc)) = (source_cluster, target_cluster) {
                if sc == tc {
                    modularity += assoc.weight / total_weight;
                }
            }
        }

        Ok(modularity)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cluster_creation() {
        let cluster = Cluster {
            id: 0,
            node_ids: vec![1, 2, 3],
            internal_edges: 2,
            external_edges: 1,
            total_weight: 1.8,
            density: 0.67,
            modularity_contribution: 0.5,
        };

        assert_eq!(cluster.node_ids.len(), 3);
        assert_eq!(cluster.internal_edges, 2);
    }
}
