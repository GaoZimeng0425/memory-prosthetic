//! HTTP request handlers
//!
//! Implements the API endpoint logic.

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

use crate::db::{CollectionRepository, EmbeddingsRepository};
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
    pub url: String,
    pub title: String,
    pub similarity: f32,
    pub created_at: String,
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
        url: payload.url,
        title: payload.title,
        content: payload.content,
    };

    match repo.upsert(&input) {
        Ok(id) => {
            info!("Content collected successfully: id={}", id);

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
