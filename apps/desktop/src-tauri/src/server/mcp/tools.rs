//! MCP tool implementations

use crate::AppState;
use crate::embedding::get_embedding_model;
use crate::db::{CollectionRepository, EmbeddingsRepository};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

use super::error::McpModuleError;

/// Search tool parameters
#[derive(Deserialize, Serialize, JsonSchema)]
pub struct SearchParams {
    /// Search query or natural language instruction
    pub query: String,
    /// Maximum number of results (default: 10)
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    10
}

/// Search tool implementation
pub struct SearchTool {
    app_state: Arc<AppState>,
}

impl SearchTool {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    /// Extract search query from natural language instruction
    fn extract_query(&self, input: &str) -> String {
        let mut query = input.to_string();

        // Remove common Chinese prefixes
        query = query
            .replace("使用MP搜索", "")
            .replace("使用 MP 搜索", "")
            .replace("使用Memory Prosthetic搜索", "")
            .replace("使用 Memory Prosthetic 搜索", "")
            .replace("搜索", "")
            .replace("查找", "")
            .replace("找", "");

        query.trim().to_string()
    }

    /// Execute search tool
    pub async fn execute(&self, params: SearchParams) -> Result<SearchToolResult, McpModuleError> {
        let query = self.extract_query(&params.query);

        if query.is_empty() {
            return Err(McpModuleError::InvalidParams(
                "Search query cannot be empty".to_string(),
            ));
        }

        info!("MCP search tool called: query={}, limit={}", query, params.limit);

        // Get embedding model
        let model = match get_embedding_model() {
            Some(m) => m,
            None => {
                return Err(McpModuleError::InternalError(
                    "Embedding model not available".to_string(),
                ));
            }
        };

        // Generate query embedding
        let query_embedding = {
            let mut model_guard = model.lock().map_err(|e| {
                McpModuleError::InternalError(format!("Failed to lock model: {}", e))
            })?;

            model_guard.encode(&query).map_err(|e| {
                McpModuleError::InternalError(format!("Failed to generate embedding: {}", e))
            })?
        };

        // Search for similar embeddings
        let emb_repo = EmbeddingsRepository::new(&self.app_state.db);
        let search_results = emb_repo.search(&query_embedding, params.limit)
            .map_err(|e| {
                McpModuleError::SearchError(format!("Search failed: {}", e))
            })?;

        // Get collection details for results
        let coll_repo = CollectionRepository::new(&self.app_state.db);
        let mut results = Vec::with_capacity(search_results.len());

        for sr in search_results {
            if let Ok(Some(collection)) = coll_repo.get_by_id(sr.collection_id) {
                results.push(SearchResultItem {
                    id: collection.id,
                    url: collection.url,
                    title: collection.title,
                    similarity: sr.similarity,
                    created_at: collection.created_at,
                });
            }
        }

        info!("MCP search completed: {} results", results.len());

        // Format results as text
        if results.is_empty() {
            Ok(SearchToolResult {
                content: vec![SearchContent {
                    r#type: "text".to_string(),
                    text: format!("未找到与\"{}\"相关的内容。", query),
                }],
            })
        } else {
            let formatted_results = results
                .iter()
                .enumerate()
                .map(|(idx, item)| {
                    let similarity_percent = (item.similarity * 100.0).round() as u32;
                    format!(
                        "{}. [{}]({}) (相似度: {}%)",
                        idx + 1,
                        item.title,
                        item.url,
                        similarity_percent
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");

            let result_text = format!(
                "找到 {} 条与\"{}\"相关的内容：\n\n{}",
                results.len(),
                query,
                formatted_results
            );

            Ok(SearchToolResult {
                content: vec![SearchContent {
                    r#type: "text".to_string(),
                    text: result_text,
                }],
            })
        }
    }
}

/// Search result item
#[derive(Serialize, JsonSchema)]
pub struct SearchResultItem {
    pub id: i64,
    pub url: String,
    pub title: String,
    pub similarity: f32,
    pub created_at: String,
}

/// Search tool result
#[derive(Serialize)]
pub struct SearchToolResult {
    pub content: Vec<SearchContent>,
}

#[derive(Serialize)]
pub struct SearchContent {
    #[serde(rename = "type")]
    pub r#type: String,
    pub text: String,
}
