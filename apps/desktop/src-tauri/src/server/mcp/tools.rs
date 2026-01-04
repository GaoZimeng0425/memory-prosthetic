//! MCP tool implementations

use crate::AppState;
use crate::embedding::get_embedding_model;
use crate::db::{
    CollectionRepository, CollectionStatus, EmbeddingsRepository, FavoriteRepository,
    TagRepository, TagSortOrder,
};
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
    /// Optional: Filter by favorite name (fuzzy match)
    #[serde(default)]
    pub favorite_name: Option<String>,
    /// Optional: Filter by tag name (fuzzy match)
    #[serde(default)]
    pub tag_name: Option<String>,
    /// Optional: Filter by status
    #[serde(default)]
    pub status: Option<String>,
}

fn default_limit() -> usize {
    10
}

/// Parsed search query from natural language
struct ParsedSearchQuery {
    query: String,
    favorite_filter: Option<String>,
    tag_filter: Option<String>,
}

/// Search tool implementation
pub struct SearchTool {
    app_state: Arc<AppState>,
}

impl SearchTool {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    /// Parse natural language instruction to extract query and filters
    fn parse_natural_language(&self, input: &str) -> ParsedSearchQuery {
        let mut query = input.to_string();
        let mut favorite_filter: Option<String> = None;
        let mut tag_filter: Option<String> = None;

        // Remove common Chinese prefixes
        query = query
            .replace("使用MP搜索", "")
            .replace("使用 MP 搜索", "")
            .replace("使用Memory Prosthetic搜索", "")
            .replace("使用 Memory Prosthetic 搜索", "")
            .replace("搜索", "")
            .replace("查找", "")
            .replace("找", "");

        // Detect favorite filter keywords
        // Pattern: "xxx 收藏夹" or "在 xxx 收藏夹中"
        if query.contains("收藏夹") {
            // Try to extract favorite name before "收藏夹"
            let parts: Vec<&str> = query.split("收藏夹").collect();
            if parts.len() > 0 {
                let before = parts[0].trim();
                if !before.is_empty() {
                    // Extract the last word/phrase before "收藏夹"
                    let words: Vec<&str> = before.split_whitespace().collect();
                    if let Some(last_word) = words.last() {
                        if !last_word.is_empty() && last_word.len() > 1 {
                            let fav_name = last_word.to_string();
                            favorite_filter = Some(fav_name.clone());
                            // Remove the favorite name from query
                            query = query.replace(&format!("{} 收藏夹", fav_name), "");
                            query = query.replace(&format!("在 {} 收藏夹中", fav_name), "");
                        }
                    }
                }
            }
        }

        // Detect tag filter keywords
        // Pattern: "带 xxx 标签" or "标签 xxx"
        if query.contains("标签") {
            let parts: Vec<&str> = query.split("标签").collect();
            if parts.len() > 0 {
                let before = parts[0].trim();
                if before.contains("带") {
                    let after_dai: Vec<&str> = before.split("带").collect();
                    if after_dai.len() > 1 {
                        let tag_name = after_dai[1].trim();
                        if !tag_name.is_empty() {
                            tag_filter = Some(tag_name.to_string());
                            query = query.replace(&format!("带 {} 标签", tag_name), "");
                        }
                    }
                }
            }
        }

        ParsedSearchQuery {
            query: query.trim().to_string(),
            favorite_filter,
            tag_filter,
        }
    }

    /// Execute search tool
    pub async fn execute(&self, params: SearchParams) -> Result<SearchToolResult, McpModuleError> {
        // Parse natural language if favorite_name/tag_name not explicitly provided
        let parsed = if params.favorite_name.is_none() && params.tag_name.is_none() {
            self.parse_natural_language(&params.query)
        } else {
            ParsedSearchQuery {
                query: params.query.clone(),
                favorite_filter: params.favorite_name.clone(),
                tag_filter: params.tag_name.clone(),
            }
        };

        let query = parsed.query;
        let favorite_filter = params.favorite_name.or(parsed.favorite_filter);
        let tag_filter = params.tag_name.or(parsed.tag_filter);

        if query.is_empty() {
            return Err(McpModuleError::InvalidParams(
                "Search query cannot be empty".to_string(),
            ));
        }

        info!(
            "MCP search tool called: query={}, limit={}, favorite_filter={:?}, tag_filter={:?}",
            query, params.limit, favorite_filter, tag_filter
        );

        // Find favorite by name if filter provided
        let favorite_id = if let Some(fav_name) = &favorite_filter {
            let fav_repo = FavoriteRepository::new(&self.app_state.db);
            // Try to find favorite by name (fuzzy match)
            let favorites = fav_repo.list().map_err(|e| {
                McpModuleError::InternalError(format!("Failed to list favorites: {}", e))
            })?;
            favorites
                .iter()
                .find(|f| f.name.to_lowercase().contains(&fav_name.to_lowercase()))
                .map(|f| f.id)
        } else {
            None
        };

        // Find tag by name if filter provided
        let tag_ids = if let Some(tag_name) = &tag_filter {
            let tag_repo = TagRepository::new(&self.app_state.db);
            let tags = tag_repo.list(None).map_err(|e| {
                McpModuleError::InternalError(format!("Failed to list tags: {}", e))
            })?;
            let matching_tags: Vec<i64> = tags
                .iter()
                .filter(|t| t.name.to_lowercase().contains(&tag_name.to_lowercase()))
                .map(|t| t.id)
                .collect();
            if matching_tags.is_empty() {
                None
            } else {
                Some(matching_tags)
            }
        } else {
            None
        };

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
        let search_results = emb_repo.search(&query_embedding, params.limit * 2) // Get more results for filtering
            .map_err(|e| {
                McpModuleError::SearchError(format!("Search failed: {}", e))
            })?;

        // Get collection details for results and apply filters
        let coll_repo = CollectionRepository::new(&self.app_state.db);
        let mut results = Vec::with_capacity(search_results.len());

        for sr in search_results {
            if let Ok(Some(collection)) = coll_repo.get_by_id(sr.collection_id) {
                // Apply favorite filter
                if let Some(fav_id) = favorite_id {
                    if collection.favorite_id != Some(fav_id) {
                        continue;
                    }
                }

                // Apply status filter
                if let Some(status_str) = &params.status {
                    let target_status = match status_str.as_str() {
                        "active" => CollectionStatus::Active,
                        "archived" => CollectionStatus::Archived,
                        "deleted" => CollectionStatus::Deleted,
                        _ => continue,
                    };
                    if collection.status != target_status {
                        continue;
                    }
                } else {
                    // Default to active only
                    if collection.status != CollectionStatus::Active {
                        continue;
                    }
                }

                // Apply tag filter
                if let Some(ref tag_ids_filter) = tag_ids {
                    let coll_tag_repo = crate::db::CollectionTagRepository::new(&self.app_state.db);
                    let collection_tags = coll_tag_repo
                        .get_tags_by_collection(collection.id)
                        .map_err(|e| {
                            McpModuleError::InternalError(format!(
                                "Failed to get collection tags: {}",
                                e
                            ))
                        })?;
                    let collection_tag_ids: Vec<i64> = collection_tags.iter().map(|t| t.id).collect();
                    let has_matching_tag = tag_ids_filter
                        .iter()
                        .any(|&tag_id| collection_tag_ids.contains(&tag_id));
                    if !has_matching_tag {
                        continue;
                    }
                }

                results.push(SearchResultItem {
                    id: collection.id,
                    url: collection.url,
                    title: collection.title,
                    similarity: sr.similarity,
                    created_at: collection.created_at,
                    r#type: Some(collection.r#type),
                });

                // Stop if we have enough results
                if results.len() >= params.limit {
                    break;
                }
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
                    let url_display = item.url.as_deref().unwrap_or("笔记");
                    format!(
                        "{}. [{}]({}) (相似度: {}%)",
                        idx + 1,
                        item.title,
                        url_display,
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
    pub url: Option<String>, // Optional: NULL for user-created notes
    pub title: String,
    pub similarity: f32,
    pub created_at: String,
    pub r#type: Option<String>, // Optional: collection type
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

// ============================================
// List Collections Tool
// ============================================

/// List collections tool parameters
#[derive(Debug, Deserialize, Serialize, JsonSchema)]
pub struct ListCollectionsParams {
    /// Optional: Filter by favorite name (fuzzy match)
    #[serde(default)]
    pub favorite_name: Option<String>,
    /// Optional: Filter by tag name (fuzzy match)
    #[serde(default)]
    pub tag_name: Option<String>,
    /// Optional: Filter by status
    #[serde(default)]
    pub status: Option<String>,
    /// Maximum number of results (default: 50)
    #[serde(default = "default_list_limit")]
    pub limit: i64,
    /// Offset for pagination (default: 0)
    #[serde(default)]
    pub offset: i64,
}

fn default_list_limit() -> i64 {
    50
}

/// List collections tool implementation
pub struct ListCollectionsTool {
    app_state: Arc<AppState>,
}

impl ListCollectionsTool {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    /// Execute list collections tool
    pub async fn execute(
        &self,
        params: ListCollectionsParams,
    ) -> Result<SearchToolResult, McpModuleError> {
        info!("MCP list_collections tool called: {:?}", params);

        let coll_repo = CollectionRepository::new(&self.app_state.db);

        // Find favorite by name if filter provided
        let favorite_id = if let Some(fav_name) = &params.favorite_name {
            let fav_repo = FavoriteRepository::new(&self.app_state.db);
            let favorites = fav_repo.list().map_err(|e| {
                McpModuleError::InternalError(format!("Failed to list favorites: {}", e))
            })?;
            favorites
                .iter()
                .find(|f| f.name.to_lowercase().contains(&fav_name.to_lowercase()))
                .map(|f| f.id)
        } else {
            None
        };

        // Find tag by name if filter provided
        let tag_ids = if let Some(tag_name) = &params.tag_name {
            let tag_repo = TagRepository::new(&self.app_state.db);
            let tags = tag_repo.list(None).map_err(|e| {
                McpModuleError::InternalError(format!("Failed to list tags: {}", e))
            })?;
            let matching_tags: Vec<i64> = tags
                .iter()
                .filter(|t| t.name.to_lowercase().contains(&tag_name.to_lowercase()))
                .map(|t| t.id)
                .collect();
            if matching_tags.is_empty() {
                None
            } else {
                Some(matching_tags)
            }
        } else {
            None
        };

        // Determine status filter
        let status = params.status.as_deref().and_then(|s| match s {
            "active" => Some(CollectionStatus::Active),
            "archived" => Some(CollectionStatus::Archived),
            "deleted" => Some(CollectionStatus::Deleted),
            _ => None,
        });

        // Only filter by uncategorized if explicitly requested
        // If favorite_id is None and not explicitly filtering uncategorized, show all collections
        let is_uncategorized = false; // MCP doesn't have an explicit uncategorized parameter, so always false
        let favorite_id_filter = favorite_id;

        // Get collections
        let collections = coll_repo
            .list(
                params.limit,
                params.offset,
                favorite_id_filter,
                is_uncategorized,
                tag_ids.as_deref(),
                status,
            )
            .map_err(|e| {
                McpModuleError::InternalError(format!("Failed to list collections: {}", e))
            })?;

        // Format results
        if collections.is_empty() {
            Ok(SearchToolResult {
                content: vec![SearchContent {
                    r#type: "text".to_string(),
                    text: "未找到符合条件的文章。".to_string(),
                }],
            })
        } else {
            let coll_tag_repo = crate::db::CollectionTagRepository::new(&self.app_state.db);
            let fav_repo = FavoriteRepository::new(&self.app_state.db);

            let formatted_results: Vec<String> = collections
                .iter()
                .enumerate()
                .map(|(idx, item)| {
                    // Get favorite name
                    let favorite_name = item
                        .favorite_id
                        .and_then(|id| {
                            fav_repo
                                .get_by_id(id)
                                .ok()
                                .flatten()
                                .map(|f| f.name)
                        })
                        .unwrap_or_else(|| "未分类".to_string());

                    // Get tags
                    let tags = coll_tag_repo
                        .get_tags_by_collection(item.id)
                        .ok()
                        .unwrap_or_default();
                    let tag_names: Vec<String> = tags.iter().map(|t| t.name.clone()).collect();
                    let tags_str = if tag_names.is_empty() {
                        "无标签".to_string()
                    } else {
                        tag_names.join(", ")
                    };

                    format!(
                        "{}. [{}]({})\n   收藏夹: {}\n   标签: {}\n   创建时间: {}",
                        idx + 1,
                        item.title,
                        item.url.as_deref().unwrap_or(""),
                        favorite_name,
                        tags_str,
                        item.created_at
                    )
                })
                .collect();

            let result_text = format!(
                "找到 {} 篇文章：\n\n{}",
                collections.len(),
                formatted_results.join("\n\n")
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

// ============================================
// List Tags Tool
// ============================================

/// List tags tool parameters
#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ListTagsParams {
    /// Sort order: "name", "created_at", or "usage" (default: "name")
    #[serde(default)]
    pub sort: Option<String>,
}

/// List tags tool implementation
pub struct ListTagsTool {
    app_state: Arc<AppState>,
}

impl ListTagsTool {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    /// Execute list tags tool
    pub async fn execute(&self, params: ListTagsParams) -> Result<SearchToolResult, McpModuleError> {
        info!("MCP list_tags tool called: sort={:?}", params.sort);

        let tag_repo = TagRepository::new(&self.app_state.db);

        // Determine sort order
        let sort_order = match params.sort.as_deref() {
            Some("name") => Some(TagSortOrder::NameAsc),
            Some("created_at") => Some(TagSortOrder::CreatedDesc),
            Some("usage") => Some(TagSortOrder::UsageDesc),
            _ => Some(TagSortOrder::NameAsc),
        };

        let tags = tag_repo.list(sort_order).map_err(|e| {
            McpModuleError::InternalError(format!("Failed to list tags: {}", e))
        })?;

        // Get usage count for each tag
        let coll_tag_repo = crate::db::CollectionTagRepository::new(&self.app_state.db);
        let coll_repo = CollectionRepository::new(&self.app_state.db);

        if tags.is_empty() {
            Ok(SearchToolResult {
                content: vec![SearchContent {
                    r#type: "text".to_string(),
                    text: "暂无标签。".to_string(),
                }],
            })
        } else {
            let formatted_results: Vec<String> = tags
                .iter()
                .enumerate()
                .map(|(idx, tag)| {
                    // Count usage (collections with this tag)
                    let usage_count = coll_repo
                        .list(
                            10000, // Large limit to count all
                            0,
                            None,
                            true,
                            Some(&[tag.id]),
                            Some(CollectionStatus::Active),
                        )
                        .ok()
                        .map(|colls| colls.len() as i64)
                        .unwrap_or(0);

                    let color_str = tag
                        .color
                        .as_ref()
                        .map(|c| format!("颜色: {}", c))
                        .unwrap_or_else(|| "无颜色".to_string());

                    format!(
                        "{}. {} (使用次数: {}, {})",
                        idx + 1,
                        tag.name,
                        usage_count,
                        color_str
                    )
                })
                .collect();

            let result_text = format!(
                "共有 {} 个标签：\n\n{}",
                tags.len(),
                formatted_results.join("\n")
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

// ============================================
// List Favorites Tool
// ============================================

/// List favorites tool parameters (no parameters needed)
#[derive(Deserialize, Serialize, JsonSchema)]
pub struct ListFavoritesParams {}

/// List favorites tool implementation
pub struct ListFavoritesTool {
    app_state: Arc<AppState>,
}

impl ListFavoritesTool {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    /// Execute list favorites tool
    pub async fn execute(
        &self,
        _params: ListFavoritesParams,
    ) -> Result<SearchToolResult, McpModuleError> {
        info!("MCP list_favorites tool called");

        let fav_repo = FavoriteRepository::new(&self.app_state.db);
        let favorites = fav_repo.list().map_err(|e| {
            McpModuleError::InternalError(format!("Failed to list favorites: {}", e))
        })?;

        if favorites.is_empty() {
            Ok(SearchToolResult {
                content: vec![SearchContent {
                    r#type: "text".to_string(),
                    text: "暂无收藏夹。".to_string(),
                }],
            })
        } else {
            let formatted_results: Vec<String> = favorites
                .iter()
                .enumerate()
                .map(|(idx, fav)| {
                    // Get collection count
                    let count = fav_repo
                        .get_collection_count(fav.id)
                        .unwrap_or(0);

                    let icon_str = fav
                        .icon
                        .as_ref()
                        .map(|i| format!("图标: {}", i))
                        .unwrap_or_else(|| "无图标".to_string());

                    format!(
                        "{}. {} (文章数: {}, {})",
                        idx + 1,
                        fav.name,
                        count,
                        icon_str
                    )
                })
                .collect();

            let result_text = format!(
                "共有 {} 个收藏夹：\n\n{}",
                favorites.len(),
                formatted_results.join("\n")
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
