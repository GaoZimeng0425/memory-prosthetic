//! HTTP route definitions
//!
//! Defines all API routes and their handlers.

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

use super::handlers;
use crate::AppState;

/// Create the API router with all routes
pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // Health check
        .route("/api/health", get(handlers::health))
        // Content collection
        .route("/api/collect", post(handlers::collect))
        // Semantic search
        .route("/api/search", post(handlers::search))
        // Add state to all routes
        .with_state(state)
}
