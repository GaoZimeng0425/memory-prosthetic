//! HTTP route definitions
//!
//! Defines all API routes and their handlers.

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;
use std::path::PathBuf;
use tower_http::services::ServeDir;

use super::handlers;
use super::mcp;
use crate::AppState;

/// Create the API router with all routes
pub fn create_router(state: Arc<AppState>, uploads_dir: PathBuf) -> Router {
    // Create main router with state
    let main_router = Router::new()
        // Static files (uploads)
        .nest_service("/uploads", ServeDir::new(uploads_dir))
        // Health check
        .route("/api/health", get(handlers::health))
        // Content collection (legacy endpoint, kept for backward compatibility)
        .route("/api/collect", post(handlers::collect))
        // Semantic search
        .route("/api/search", post(handlers::search))
        // Collections
        .route("/api/collections", get(handlers::get_collections))
        .route("/api/collections", post(handlers::create_collection))
        .route("/api/collections/{id}", get(handlers::get_collection))
        .route("/api/collections/{id}", put(handlers::update_collection))
        .route("/api/collections/{id}", delete(handlers::delete_collection))
        .route("/api/collections/{id}/archive", post(handlers::archive_collection))
        .route("/api/collections/{id}/restore", post(handlers::restore_collection))
        // Favorites
        .route("/api/favorites", get(handlers::get_favorites))
        .route("/api/favorites", post(handlers::create_favorite))
        .route("/api/favorites/{id}", get(handlers::get_favorite))
        .route("/api/favorites/{id}", put(handlers::update_favorite))
        .route("/api/favorites/{id}", delete(handlers::delete_favorite))
        // Tags
        .route("/api/tags", get(handlers::get_tags))
        .route("/api/tags", post(handlers::create_tag))
        .route("/api/tags/{id}", get(handlers::get_tag))
        .route("/api/tags/{id}", put(handlers::update_tag))
        .route("/api/tags/{id}", delete(handlers::delete_tag))
        .with_state(state.clone());

    // Create MCP router with same state
    let mcp_router = mcp::create_mcp_router(state.clone());

    // Merge routers (both have Arc<AppState> state)
    main_router.merge(mcp_router)
}
