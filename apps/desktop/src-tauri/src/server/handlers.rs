//! HTTP request handlers
//!
//! Implements the API endpoint logic.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

use crate::db::{
    CollectionRepository, CollectionStatus, EmbeddingsRepository, FavoriteRepository,
    TagRepository,
};
use crate::embedding::get_embedding_model;
use crate::AppState;

/// App version from Cargo.toml
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

// ============================================
// Response Types
// ============================================

/// Health check response
#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
}

/// Collect request body
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectRequest {
    pub url: String,
    pub title: String,
    pub content: String,
    pub favorite_id: Option<i64>,
    pub tags: Option<Vec<i64>>,
}

/// API success response wrapper
#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: T,
}

/// API error response
#[derive(Serialize)]
pub struct ApiError {
    pub success: bool,
    pub error: ApiErrorDetail,
}

#[derive(Serialize)]
pub struct ApiErrorDetail {
    pub code: String,
    pub message: String,
}

/// Collect success data
#[derive(Serialize)]
pub struct CollectData {
    pub id: i64,
}

/// Search request body
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    10
}

/// Search result item
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultItem {
    pub id: i64,
    pub url: Option<String>, // Optional: NULL for user-created notes
    pub title: String,
    pub similarity: f32,
    pub created_at: String,
    pub r#type: Option<String>, // Optional: collection type
}

/// Search response data
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchData {
    pub results: Vec<SearchResultItem>,
    pub query: String,
}

// ============================================
// Handlers
// ============================================

/// GET /api/health - Health check endpoint
pub async fn health() -> Json<HealthResponse> {
    info!("Health check requested");

    Json(HealthResponse {
        status: "ok".to_string(),
        version: APP_VERSION.to_string(),
    })
}

/// POST /api/collect - Collect content from browser extension
pub async fn collect(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CollectRequest>,
) -> Result<Json<ApiResponse<CollectData>>, (StatusCode, Json<ApiError>)> {
    info!("Collect request received: url={}", payload.url);

    // Validate input
    if payload.url.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "URL is required".to_string(),
                },
            }),
        ));
    }

    if payload.title.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "Title is required".to_string(),
                },
            }),
        ));
    }

    // Save to database
    let repo = CollectionRepository::new(&state.db);
    let input = crate::db::CreateCollection {
        url: Some(payload.url), // Collect requests always have a URL
        title: payload.title,
        content: payload.content,
        r#type: None, // Defaults to '网页' in the database
    };

    match repo.upsert(&input) {
        Ok(id) => {
            info!("Content collected successfully: id={}", id);

            // Set favorite_id if provided
            if let Some(favorite_id) = payload.favorite_id {
                if let Err(e) = repo.set_favorite(id, Some(favorite_id)) {
                    info!("Failed to set favorite_id: {}", e);
                }
            }

            // Add tags if provided
            if let Some(tag_ids) = payload.tags {
                if !tag_ids.is_empty() {
                    let tag_repo = crate::db::CollectionTagRepository::new(&state.db);
                    if let Err(e) = tag_repo.add_tags(id, &tag_ids) {
                        info!("Failed to add tags: {}", e);
                    }
                }
            }

            // Embedding service runs in background and will pick up new collections automatically

            Ok(Json(ApiResponse {
                success: true,
                data: CollectData { id },
            }))
        }
        Err(e) => {
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "SERVER_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            ))
        }
    }
}

/// POST /api/search - Semantic search
pub async fn search(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SearchRequest>,
) -> Result<Json<ApiResponse<SearchData>>, (StatusCode, Json<ApiError>)> {
    info!("Search request received: query={}", payload.query);

    // Validate input
    if payload.query.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "Query is required".to_string(),
                },
            }),
        ));
    }

    // Get embedding model
    let model = match get_embedding_model() {
        Some(m) => m,
        None => {
            return Err((
                StatusCode::SERVICE_UNAVAILABLE,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "MODEL_NOT_AVAILABLE".to_string(),
                        message: "Embedding model not available".to_string(),
                    },
                }),
            ));
        }
    };

    // Generate query embedding
    let query_embedding = {
        let mut model_guard = model.lock().map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "MODEL_ERROR".to_string(),
                        message: format!("Failed to lock model: {}", e),
                    },
                }),
            )
        })?;

        model_guard.encode(&payload.query).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "EMBEDDING_ERROR".to_string(),
                        message: format!("Failed to generate embedding: {}", e),
                    },
                }),
            )
        })?
    };

    // Search for similar embeddings
    let emb_repo = EmbeddingsRepository::new(&state.db);
    let search_results = emb_repo.search(&query_embedding, payload.limit).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "SEARCH_ERROR".to_string(),
                    message: format!("Search failed: {}", e),
                },
            }),
        )
    })?;

    // Get collection details for results
    let coll_repo = CollectionRepository::new(&state.db);
    let mut results = Vec::with_capacity(search_results.len());

    for sr in search_results {
        if let Ok(Some(collection)) = coll_repo.get_by_id(sr.collection_id) {
            results.push(SearchResultItem {
                id: collection.id,
                url: collection.url,
                title: collection.title,
                similarity: sr.similarity,
                created_at: collection.created_at,
                r#type: Some(collection.r#type),
            });
        }
    }

    info!("Search completed: {} results", results.len());

    Ok(Json(ApiResponse {
        success: true,
        data: SearchData {
            results,
            query: payload.query,
        },
    }))
}

// ============================================
// Collections Handlers
// ============================================

/// GET /api/collections - Get collections list
#[derive(Deserialize)]
pub struct GetCollectionsQuery {
    #[serde(default)]
    pub limit: Option<i64>,
    #[serde(default)]
    pub offset: Option<i64>,
    #[serde(default)]
    pub favorite_id: Option<i64>,
    #[serde(default)]
    pub tag_ids: Option<Vec<i64>>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub uncategorized: Option<bool>,
}

pub async fn get_collections(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GetCollectionsQuery>,
) -> Result<Json<ApiResponse<Vec<crate::db::CollectionListItem>>>, (StatusCode, Json<ApiError>)> {
    info!("Get collections request received");

    let repo = CollectionRepository::new(&state.db);
    let limit = params.limit.unwrap_or(50);
    let offset = params.offset.unwrap_or(0);

    // Only filter by uncategorized if explicitly set to true
    // If uncategorized is None or false, don't filter by favorite_id at all (show all)
    let is_uncategorized = params.uncategorized == Some(true);
    let favorite_id_filter = if is_uncategorized {
        None // This will be handled specially in the repository
    } else {
        params.favorite_id
    };

    // tag_ids is already Option<Vec<i64>>, pass directly as slice
    let tag_ids_ref = params.tag_ids.as_deref();
    let status = params
        .status
        .as_deref()
        .and_then(|s| match s {
            "active" => Some(CollectionStatus::Active),
            "archived" => Some(CollectionStatus::Archived),
            "deleted" => Some(CollectionStatus::Deleted),
            _ => None,
        })
        .or(Some(CollectionStatus::Active));

    match repo.list(limit, offset, favorite_id_filter, is_uncategorized, tag_ids_ref, status) {
        Ok(collections) => Ok(Json(ApiResponse {
            success: true,
            data: collections,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// GET /api/collections/:id - Get a single collection
pub async fn get_collection(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::db::Collection>>, (StatusCode, Json<ApiError>)> {
    info!("Get collection request received: id={}", id);

    let repo = CollectionRepository::new(&state.db);
    match repo.get_by_id(id) {
        Ok(Some(collection)) => Ok(Json(ApiResponse {
            success: true,
            data: collection,
        })),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Collection with id {} not found", id),
                },
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// GET /api/collections/stats - Get collection statistics
pub async fn get_collection_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<crate::db::CollectionStats>>, (StatusCode, Json<ApiError>)> {
    info!("Get collection stats request received");

    let repo = CollectionRepository::new(&state.db);
    match repo.get_stats() {
        Ok(stats) => Ok(Json(ApiResponse {
            success: true,
            data: stats,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// POST /api/collections - Create a new collection
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionRequest {
    pub url: String,
    pub title: String,
    pub content: String,
    pub favorite_id: Option<i64>,
    pub tags: Option<Vec<i64>>,
}

pub async fn create_collection(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateCollectionRequest>,
) -> Result<Json<ApiResponse<crate::db::Collection>>, (StatusCode, Json<ApiError>)> {
    info!("Create collection request received: url={}", payload.url);

    if payload.url.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "URL is required".to_string(),
                },
            }),
        ));
    }

    if payload.title.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "Title is required".to_string(),
                },
            }),
        ));
    }

    let repo = CollectionRepository::new(&state.db);
    let input = crate::db::CreateCollection {
        url: Some(payload.url),
        title: payload.title,
        content: payload.content,
        r#type: None, // Will use default from serde
    };

    match repo.upsert(&input) {
        Ok(id) => {
            // Set favorite_id if provided
            if let Some(favorite_id) = payload.favorite_id {
                if let Err(e) = repo.set_favorite(id, Some(favorite_id)) {
                    info!("Failed to set favorite_id: {}", e);
                }
            }

            // Add tags if provided
            if let Some(tag_ids) = payload.tags {
                if !tag_ids.is_empty() {
                    let tag_repo = crate::db::CollectionTagRepository::new(&state.db);
                    if let Err(e) = tag_repo.add_tags(id, &tag_ids) {
                        info!("Failed to add tags: {}", e);
                    }
                }
            }

            // Get the created collection
            match repo.get_by_id(id) {
                Ok(Some(collection)) => Ok(Json(ApiResponse {
                    success: true,
                    data: collection,
                })),
                Ok(None) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "NOT_FOUND".to_string(),
                            message: "Collection created but not found".to_string(),
                        },
                    }),
                )),
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "DB_ERROR".to_string(),
                            message: e.to_string(),
                        },
                    }),
                )),
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// PUT /api/collections/:id - Update a collection
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCollectionRequest {
    pub title: Option<String>,
    pub content: Option<String>, // For notes: Slate JSON format
    pub favorite_id: Option<i64>,
    pub tags: Option<Vec<i64>>,
    pub status: Option<String>,
    pub r#type: Option<String>, // Collection type
}

pub async fn update_collection(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateCollectionRequest>,
) -> Result<Json<ApiResponse<crate::db::Collection>>, (StatusCode, Json<ApiError>)> {
    info!("Update collection request received: id={}", id);

    let repo = CollectionRepository::new(&state.db);

    // Check if collection exists
    if repo.get_by_id(id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )
    })?.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Collection with id {} not found", id),
                },
            }),
        ));
    }

    // Update title if provided
    if let Some(title) = payload.title {
        if let Err(e) = state.db.with_connection(|conn| {
            use rusqlite::params;
            conn.execute(
                "UPDATE collections SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![&title, id],
            )?;
            Ok(())
        }) {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            ));
        }
    }

    // Update content if provided (for notes)
    if let Some(content) = payload.content {
        if let Err(e) = state.db.with_connection(|conn| {
            use rusqlite::params;
            conn.execute(
                "UPDATE collections SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![&content, id],
            )?;
            Ok(())
        }) {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            ));
        }
    }

    // Update favorite_id if provided
    if let Some(favorite_id) = payload.favorite_id {
        if let Err(e) = repo.set_favorite(id, Some(favorite_id)) {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            ));
        }
    }

    // Update tags if provided
    if let Some(tag_ids) = payload.tags {
        let tag_repo = crate::db::CollectionTagRepository::new(&state.db);
        // Get existing tags
        let existing_tags = tag_repo.get_tags_by_collection(id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            )
        })?;
        let existing_tag_ids: Vec<i64> = existing_tags.iter().map(|t| t.id).collect();

        // Remove tags not in new list
        for existing_id in &existing_tag_ids {
            if !tag_ids.contains(existing_id) {
                if let Err(e) = tag_repo.remove_tag(id, *existing_id) {
                    info!("Failed to remove tag: {}", e);
                }
            }
        }

        // Add new tags
        for tag_id in &tag_ids {
            if !existing_tag_ids.contains(tag_id) {
                if let Err(e) = tag_repo.add_tags(id, &[*tag_id]) {
                    info!("Failed to add tag: {}", e);
                }
            }
        }
    }

    // Update type if provided
    if let Some(type_str) = &payload.r#type {
        if let Err(e) = state.db.with_connection(|conn| {
            use rusqlite::params;
            conn.execute(
                "UPDATE collections SET type = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![type_str, id],
            )?;
            Ok(())
        }) {
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            ));
        }
    }

    // Update status if provided
    if let Some(status_str) = payload.status {
        let status = match status_str.as_str() {
            "active" => CollectionStatus::Active,
            "archived" => CollectionStatus::Archived,
            "deleted" => CollectionStatus::Deleted,
            _ => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "INVALID_REQUEST".to_string(),
                            message: format!("Invalid status: {}", status_str),
                        },
                    }),
                ));
            }
        };

        match status {
            CollectionStatus::Archived => {
                if let Err(e) = repo.archive(id) {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiError {
                            success: false,
                            error: ApiErrorDetail {
                                code: "DB_ERROR".to_string(),
                                message: e.to_string(),
                            },
                        }),
                    ));
                }
            }
            CollectionStatus::Active => {
                if let Err(e) = repo.restore(id) {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiError {
                            success: false,
                            error: ApiErrorDetail {
                                code: "DB_ERROR".to_string(),
                                message: e.to_string(),
                            },
                        }),
                    ));
                }
            }
            CollectionStatus::Deleted => {
                if let Err(e) = repo.delete(id) {
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiError {
                            success: false,
                            error: ApiErrorDetail {
                                code: "DB_ERROR".to_string(),
                                message: e.to_string(),
                            },
                        }),
                    ));
                }
            }
        }
    }

    // Get updated collection
    match repo.get_by_id(id) {
        Ok(Some(collection)) => Ok(Json(ApiResponse {
            success: true,
            data: collection,
        })),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Collection with id {} not found", id),
                },
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// DELETE /api/collections/:id - Delete a collection
#[derive(Deserialize)]
pub struct DeleteCollectionQuery {
    #[serde(default)]
    pub permanent: Option<bool>,
}

pub async fn delete_collection(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Query(params): Query<DeleteCollectionQuery>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiError>)> {
    info!("Delete collection request received: id={}, permanent={:?}", id, params.permanent);

    let repo = CollectionRepository::new(&state.db);
    let deleted = if params.permanent.unwrap_or(false) {
        repo.permanently_delete(id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            )
        })?
    } else {
        repo.delete(id).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    success: false,
                    error: ApiErrorDetail {
                        code: "DB_ERROR".to_string(),
                        message: e.to_string(),
                    },
                }),
            )
        })?
    };

    Ok(Json(ApiResponse {
        success: true,
        data: deleted,
    }))
}

/// POST /api/collections/:id/archive - Archive a collection
pub async fn archive_collection(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiError>)> {
    info!("Archive collection request received: id={}", id);

    let repo = CollectionRepository::new(&state.db);
    match repo.archive(id) {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            data: (),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// POST /api/collections/:id/restore - Restore a collection
pub async fn restore_collection(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiError>)> {
    info!("Restore collection request received: id={}", id);

    let repo = CollectionRepository::new(&state.db);
    match repo.restore(id) {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            data: (),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

// ============================================
// Favorites Handlers
// ============================================

/// GET /api/favorites - Get all favorites
pub async fn get_favorites(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<crate::db::Favorite>>>, (StatusCode, Json<ApiError>)> {
    info!("Get favorites request received");

    let repo = FavoriteRepository::new(&state.db);
    match repo.list() {
        Ok(favorites) => Ok(Json(ApiResponse {
            success: true,
            data: favorites,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// GET /api/favorites/:id - Get a single favorite
pub async fn get_favorite(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::db::Favorite>>, (StatusCode, Json<ApiError>)> {
    info!("Get favorite request received: id={}", id);

    let repo = FavoriteRepository::new(&state.db);
    match repo.get_by_id(id) {
        Ok(Some(favorite)) => Ok(Json(ApiResponse {
            success: true,
            data: favorite,
        })),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Favorite with id {} not found", id),
                },
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// POST /api/favorites - Create a new favorite
pub async fn create_favorite(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::db::CreateFavorite>,
) -> Result<Json<ApiResponse<crate::db::Favorite>>, (StatusCode, Json<ApiError>)> {
    info!("Create favorite request received: name={}", payload.name);

    if payload.name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "Name is required".to_string(),
                },
            }),
        ));
    }

    let repo = FavoriteRepository::new(&state.db);
    match repo.create(&payload) {
        Ok(id) => {
            match repo.get_by_id(id) {
                Ok(Some(favorite)) => Ok(Json(ApiResponse {
                    success: true,
                    data: favorite,
                })),
                Ok(None) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "NOT_FOUND".to_string(),
                            message: "Favorite created but not found".to_string(),
                        },
                    }),
                )),
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "DB_ERROR".to_string(),
                            message: e.to_string(),
                        },
                    }),
                )),
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// PUT /api/favorites/:id - Update a favorite
pub async fn update_favorite(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(payload): Json<crate::db::UpdateFavorite>,
) -> Result<Json<ApiResponse<crate::db::Favorite>>, (StatusCode, Json<ApiError>)> {
    info!("Update favorite request received: id={}", id);

    let repo = FavoriteRepository::new(&state.db);

    // Check if favorite exists
    if repo.get_by_id(id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )
    })?.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Favorite with id {} not found", id),
                },
            }),
        ));
    }

    match repo.update(id, &payload) {
        Ok(()) => {
            match repo.get_by_id(id) {
                Ok(Some(favorite)) => Ok(Json(ApiResponse {
                    success: true,
                    data: favorite,
                })),
                Ok(None) => Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "NOT_FOUND".to_string(),
                            message: format!("Favorite with id {} not found", id),
                        },
                    }),
                )),
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "DB_ERROR".to_string(),
                            message: e.to_string(),
                        },
                    }),
                )),
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// DELETE /api/favorites/:id - Delete a favorite
pub async fn delete_favorite(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiError>)> {
    info!("Delete favorite request received: id={}", id);

    let repo = FavoriteRepository::new(&state.db);
    match repo.delete(id) {
        Ok(deleted) => Ok(Json(ApiResponse {
            success: true,
            data: deleted,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

// ============================================
// Tags Handlers
// ============================================

/// GET /api/tags - Get all tags
#[derive(Deserialize)]
pub struct GetTagsQuery {
    #[serde(default)]
    pub sort: Option<String>,
}

pub async fn get_tags(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GetTagsQuery>,
) -> Result<Json<ApiResponse<Vec<crate::db::Tag>>>, (StatusCode, Json<ApiError>)> {
    info!("Get tags request received");

    let repo = TagRepository::new(&state.db);
    let sort_order = match params.sort.as_deref() {
        Some("name") => Some(crate::db::TagSortOrder::NameAsc),
        Some("created_at") => Some(crate::db::TagSortOrder::CreatedDesc),
        Some("usage") => Some(crate::db::TagSortOrder::UsageDesc),
        _ => Some(crate::db::TagSortOrder::NameAsc),
    };

    match repo.list(sort_order) {
        Ok(tags) => Ok(Json(ApiResponse {
            success: true,
            data: tags,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// GET /api/tags/:id - Get a single tag
pub async fn get_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<crate::db::Tag>>, (StatusCode, Json<ApiError>)> {
    info!("Get tag request received: id={}", id);

    let repo = TagRepository::new(&state.db);
    match repo.get_by_id(id) {
        Ok(Some(tag)) => Ok(Json(ApiResponse {
            success: true,
            data: tag,
        })),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Tag with id {} not found", id),
                },
            }),
        )),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// POST /api/tags - Create a new tag
pub async fn create_tag(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<crate::db::CreateTag>,
) -> Result<Json<ApiResponse<crate::db::Tag>>, (StatusCode, Json<ApiError>)> {
    info!("Create tag request received: name={}", payload.name);

    if payload.name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "INVALID_REQUEST".to_string(),
                    message: "Name is required".to_string(),
                },
            }),
        ));
    }

    let repo = TagRepository::new(&state.db);
    match repo.create(&payload) {
        Ok(id) => {
            match repo.get_by_id(id) {
                Ok(Some(tag)) => Ok(Json(ApiResponse {
                    success: true,
                    data: tag,
                })),
                Ok(None) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "NOT_FOUND".to_string(),
                            message: "Tag created but not found".to_string(),
                        },
                    }),
                )),
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "DB_ERROR".to_string(),
                            message: e.to_string(),
                        },
                    }),
                )),
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// PUT /api/tags/:id - Update a tag
pub async fn update_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(payload): Json<crate::db::UpdateTag>,
) -> Result<Json<ApiResponse<crate::db::Tag>>, (StatusCode, Json<ApiError>)> {
    info!("Update tag request received: id={}", id);

    let repo = TagRepository::new(&state.db);

    // Check if tag exists
    if repo.get_by_id(id).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )
    })?.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "NOT_FOUND".to_string(),
                    message: format!("Tag with id {} not found", id),
                },
            }),
        ));
    }

    match repo.update(id, &payload) {
        Ok(()) => {
            match repo.get_by_id(id) {
                Ok(Some(tag)) => Ok(Json(ApiResponse {
                    success: true,
                    data: tag,
                })),
                Ok(None) => Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "NOT_FOUND".to_string(),
                            message: format!("Tag with id {} not found", id),
                        },
                    }),
                )),
                Err(e) => Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiError {
                        success: false,
                        error: ApiErrorDetail {
                            code: "DB_ERROR".to_string(),
                            message: e.to_string(),
                        },
                    }),
                )),
            }
        }
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// DELETE /api/tags/:id - Delete a tag
pub async fn delete_tag(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ApiResponse<bool>>, (StatusCode, Json<ApiError>)> {
    info!("Delete tag request received: id={}", id);

    let repo = TagRepository::new(&state.db);
    match repo.delete(id) {
        Ok(deleted) => Ok(Json(ApiResponse {
            success: true,
            data: deleted,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

// ============================================
// Collection Tags Handlers
// ============================================

/// GET /api/collection/tags - Get tags for a collection
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCollectionTagsQuery {
    pub collection_id: i64,
}

pub async fn get_collection_tags(
    State(state): State<Arc<AppState>>,
    Query(params): Query<GetCollectionTagsQuery>,
) -> Result<Json<ApiResponse<Vec<crate::db::Tag>>>, (StatusCode, Json<ApiError>)> {
    info!("Get collection tags request received: collection_id={}", params.collection_id);

    let repo = crate::db::CollectionTagRepository::new(&state.db);
    match repo.get_tags_by_collection(params.collection_id) {
        Ok(tags) => Ok(Json(ApiResponse {
            success: true,
            data: tags,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// POST /api/collection/tags - Add tags to a collection
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddCollectionTagsRequest {
    pub collection_id: i64,
    pub tag_ids: Vec<i64>,
}

pub async fn add_collection_tags(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<AddCollectionTagsRequest>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiError>)> {
    info!("Add collection tags request received: collection_id={}, tag_ids={:?}", payload.collection_id, payload.tag_ids);

    let repo = crate::db::CollectionTagRepository::new(&state.db);
    match repo.add_tags(payload.collection_id, &payload.tag_ids) {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            data: (),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// DELETE /api/collection/tag - Remove a tag from a collection
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveCollectionTagQuery {
    pub collection_id: i64,
    pub tag_id: i64,
}

pub async fn remove_collection_tag(
    State(state): State<Arc<AppState>>,
    Query(params): Query<RemoveCollectionTagQuery>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiError>)> {
    info!("Remove collection tag request received: collection_id={}, tag_id={}", params.collection_id, params.tag_id);

    let repo = crate::db::CollectionTagRepository::new(&state.db);
    match repo.remove_tag(params.collection_id, params.tag_id) {
        Ok(()) => Ok(Json(ApiResponse {
            success: true,
            data: (),
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

// ============================================
// Sync Handlers
// ============================================

/// Favorite with article count
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteWithCount {
    pub id: i64,
    pub name: String,
    pub icon: Option<String>,
    pub count: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// Sync statistics
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStats {
    pub total: i64,
    pub this_week: i64,
    pub archived: i64,
    pub starred: i64,
    pub last_collected_at: Option<String>,
}

/// Server capabilities
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerCapabilities {
    pub streaming_supported: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub streaming_url: Option<String>,
}

/// Performance metadata (development only)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetadata {
    pub query_time_ms: u64,
    pub total_time_ms: u64,
}

/// Sync response data
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResponseData {
    pub favorites: Vec<FavoriteWithCount>,
    pub stats: SyncStats,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<ServerCapabilities>,
}

/// Sync API response with optional performance metadata
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncApiResponse {
    pub success: bool,
    pub data: SyncResponseData,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub _performance: Option<PerformanceMetadata>,
}

/// GET /api/sync - Unified sync endpoint for sidebar
/// Returns favorites with counts and global statistics
pub async fn sync(
    State(state): State<Arc<AppState>>,
) -> Result<Json<SyncApiResponse>, (StatusCode, Json<ApiError>)> {
    let start_time = std::time::Instant::now();

    info!("Sync request received");

    let repo = CollectionRepository::new(&state.db);

    // Execute queries within a transaction for consistency
    let (favorites, stats, query_duration) = state.db.with_connection(|conn| {
        let tx = conn.unchecked_transaction()?;

        let query_start = std::time::Instant::now();

        // Get favorites with counts
        {
            let mut fav_stmt = tx.prepare(
                r#"
                SELECT f.id, f.name, f.icon, f.created_at, f.updated_at,
                       COUNT(c.id) as count
                FROM favorites f
                LEFT JOIN collections c
                    ON c.favorite_id = f.id AND c.status = 'active'
                GROUP BY f.id
                ORDER BY CASE WHEN f.name = '未分类' THEN 0 ELSE 1 END,
                         f.created_at ASC
                "#,
            )?;

            let favorites_iter = fav_stmt.query_map([], |row| {
                Ok(FavoriteWithCount {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    count: row.get::<_, i64>(5)?,
                })
            })?;

            let mut favorites = Vec::new();
            for fav in favorites_iter {
                favorites.push(fav?);
            }

            // Get statistics using conditional aggregation (5x performance improvement)
            let mut stats_stmt = tx.prepare(
                r#"
                SELECT
                    COUNT(*) FILTER (WHERE status = 'active') as total,
                    COUNT(*) FILTER (WHERE status = 'active' AND created_at >= datetime('now', '-7 days')) as this_week,
                    COUNT(*) FILTER (WHERE status = 'archived') as archived,
                    COUNT(*) FILTER (WHERE starred = 1) as starred,
                    MAX(created_at) FILTER (WHERE status != 'deleted') as last_collected_at
                FROM collections
                "#,
            )?;

            let stats = stats_stmt.query_row([], |row| {
                Ok(SyncStats {
                    total: row.get(0)?,
                    this_week: row.get(1)?,
                    archived: row.get(2)?,
                    starred: row.get::<_, i64>(3)?,
                    last_collected_at: row.get(4)?,
                })
            })?;

            let query_duration = query_start.elapsed();

            drop(fav_stmt);  // Explicitly drop before commit
            drop(stats_stmt);

            tx.commit()?;

            Ok::<_, rusqlite::Error>((favorites, stats, query_duration))
        }
    }).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: format!("Sync query failed: {}", e),
                },
            }),
        )
    })?;

    let timestamp = chrono::Utc::now().to_rfc3339();
    let total_duration = start_time.elapsed();

    // Add capabilities in both dev and production
    let capabilities = Some(ServerCapabilities {
        streaming_supported: false,
        streaming_url: Some("/api/sync/stream".to_string()),
    });

    let response_data = SyncResponseData {
        favorites,
        stats,
        timestamp,
        capabilities,
    };

    // Add performance metadata in development only
    #[cfg(debug_assertions)]
    {
        Ok(Json(SyncApiResponse {
            success: true,
            data: response_data,
            _performance: Some(PerformanceMetadata {
                query_time_ms: query_duration.as_millis() as u64,
                total_time_ms: total_duration.as_millis() as u64,
            }),
        }))
    }

    #[cfg(not(debug_assertions))]
    {
        Ok(Json(SyncApiResponse {
            success: true,
            data: response_data,
            _performance: None,
        }))
    }
}

/// GET /api/favorites/:id/collections - Get collections for a specific favorite
pub async fn get_favorite_collections(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Query(params): Query<GetCollectionsQuery>,
) -> Result<Json<ApiResponse<Vec<crate::db::CollectionListItem>>>, (StatusCode, Json<ApiError>)> {
    info!("Get favorite collections request received: favorite_id={}", id);

    let repo = CollectionRepository::new(&state.db);
    let limit = params.limit.unwrap_or(50);
    let offset = params.offset.unwrap_or(0);

    match repo.list(limit, offset, Some(id), false, None, Some(CollectionStatus::Active)) {
        Ok(collections) => Ok(Json(ApiResponse {
            success: true,
            data: collections,
        })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                success: false,
                error: ApiErrorDetail {
                    code: "DB_ERROR".to_string(),
                    message: e.to_string(),
                },
            }),
        )),
    }
}

/// GET /api/sync/stream - SSE streaming endpoint (not implemented yet)
pub async fn sync_stream() -> Result<(), (StatusCode, Json<ApiError>)> {
    info!("Sync stream request received (not implemented)");

    Err((
        StatusCode::NOT_IMPLEMENTED,
        Json(ApiError {
            success: false,
            error: ApiErrorDetail {
                code: "NOT_IMPLEMENTED".to_string(),
                message: "SSE streaming not implemented yet. Use GET /api/sync for polling.".to_string(),
            },
        }),
    ))
}
