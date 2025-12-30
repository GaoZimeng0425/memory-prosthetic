//! HTTP route definitions
//!
//! Defines all API routes and their handlers.

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

use super::handlers;
use super::mcp;
use crate::AppState;

/// Create the API router with all routes
pub fn create_router(state: Arc<AppState>) -> Router {
    // Create main router with state
    let main_router = Router::new()
        // Health check
        .route("/api/health", get(handlers::health))
        // Content collection
        .route("/api/collect", post(handlers::collect))
        // Semantic search
        .route("/api/search", post(handlers::search))
        .with_state(state.clone());

    // Create MCP router with same state
    let mcp_router = mcp::create_mcp_router(state.clone());

    // Merge routers (both have Arc<AppState> state)
    main_router.merge(mcp_router)
}
