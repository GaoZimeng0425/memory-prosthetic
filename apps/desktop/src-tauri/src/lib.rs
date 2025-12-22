//! Memory Prosthetic Desktop Application
//!
//! Tauri backend for the Memory Prosthetic app.

mod db;
mod embedding;
mod server;

use db::{Collection, CollectionListItem, CollectionRepository, CollectionStats, CreateCollection, Database, DbError, EmbeddingsRepository};
use embedding::get_embedding_model;
use embedding::EmbeddingService;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Manager, State};
use tracing::info;

/// Application state shared across commands
pub struct AppState {
    pub db: Database,
}

/// Command result wrapper for success responses
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult<T> {
    pub data: T,
}

/// Command error for error responses
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl From<DbError> for CommandError {
    fn from(e: DbError) -> Self {
        CommandError {
            code: "DB_ERROR".to_string(),
            message: e.to_string(),
        }
    }
}

/// Collect request from browser extension
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectRequest {
    pub url: String,
    pub title: String,
    pub content: String,
}

/// Collect response
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectResponse {
    pub id: i64,
}

/// Search request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchRequest {
    pub query: String,
    pub limit: Option<usize>,
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

/// Search response
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub results: Vec<SearchResultItem>,
    pub query: String,
}

// ============================================
// Tauri Commands
// ============================================

/// Greet command (example, can be removed later)
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Insert or update a collection
#[tauri::command]
fn collect(
    state: State<'_, Arc<AppState>>,
    request: CollectRequest,
) -> Result<CommandResult<CollectResponse>, CommandError> {
    let input = CreateCollection {
        url: request.url,
        title: request.title,
        content: request.content,
    };

    let repo = CollectionRepository::new(&state.db);
    let id = repo.upsert(&input)?;

    // Embedding service runs in background and will pick up new collections automatically

    Ok(CommandResult {
        data: CollectResponse { id },
    })
}

/// Get a collection by ID
#[tauri::command]
fn get_collection(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<Option<Collection>>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let collection = repo.get_by_id(id)?;

    Ok(CommandResult { data: collection })
}

/// List collections with pagination
#[tauri::command]
fn get_collections(
    state: State<'_, Arc<AppState>>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<CommandResult<Vec<CollectionListItem>>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let collections = repo.list(limit.unwrap_or(50), offset.unwrap_or(0))?;

    Ok(CommandResult { data: collections })
}

/// Delete a collection by ID
#[tauri::command]
fn delete_collection(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let deleted = repo.delete(id)?;

    Ok(CommandResult { data: deleted })
}

/// Get collection statistics
#[tauri::command]
fn get_collection_stats(
    state: State<'_, Arc<AppState>>,
) -> Result<CommandResult<CollectionStats>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let stats = repo.get_stats()?;

    Ok(CommandResult { data: stats })
}

/// Semantic search across collections
#[tauri::command]
fn search(
    state: State<'_, Arc<AppState>>,
    request: SearchRequest,
) -> Result<CommandResult<SearchResponse>, CommandError> {
    let limit = request.limit.unwrap_or(10);

    // Get embedding model
    let model = get_embedding_model().ok_or_else(|| CommandError {
        code: "MODEL_NOT_AVAILABLE".to_string(),
        message: "Embedding model not available. Please download the model.".to_string(),
    })?;

    // Generate query embedding
    let query_embedding = {
        let mut model_guard = model.lock().map_err(|e| CommandError {
            code: "MODEL_ERROR".to_string(),
            message: format!("Failed to lock model: {}", e),
        })?;

        model_guard.encode(&request.query).map_err(|e| CommandError {
            code: "EMBEDDING_ERROR".to_string(),
            message: format!("Failed to generate query embedding: {}", e),
        })?
    };

    // Search for similar embeddings
    let emb_repo = EmbeddingsRepository::new(&state.db);
    let search_results = emb_repo.search(&query_embedding, limit).map_err(|e| CommandError {
        code: "SEARCH_ERROR".to_string(),
        message: format!("Search failed: {}", e),
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

    Ok(CommandResult {
        data: SearchResponse {
            results,
            query: request.query,
        },
    })
}

// ============================================
// App Initialization
// ============================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            // Get app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            info!("App data directory: {:?}", app_data_dir);

            // Initialize database
            let db = db::init_database(app_data_dir.clone())
                .expect("Failed to initialize database");

            // Initialize embedding model (optional - may not exist)
            let model_dir = app_data_dir.join("models").join("all-MiniLM-L6-v2");
            let has_embedding_model = embedding::init_embedding_model(model_dir).is_ok();

            if !has_embedding_model {
                tracing::warn!("Embedding model not available. Semantic search disabled.");
            }

            // Create app state
            let db_arc = Arc::new(db.clone());
            let state = Arc::new(AppState { db });

            // Clone state for HTTP server
            let server_state = Arc::clone(&state);
            let db_for_embedding = Arc::clone(&db_arc);

            // Start HTTP server and embedding service in a separate thread with its own runtime
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new()
                    .expect("Failed to create Tokio runtime");

                rt.block_on(async move {
                    // Start embedding service if model is available
                    if has_embedding_model {
                        let service = EmbeddingService::start(db_for_embedding);
                        info!("Embedding service started");
                        std::mem::forget(service);
                    }

                    let config = server::ServerConfig::default();
                    match server::start_server(server_state, config).await {
                        Ok(server) => {
                            info!("HTTP server started on http://{}", server.addr());
                            // Keep server alive by looping forever
                            std::mem::forget(server);
                            // Keep the runtime alive
                            loop {
                                tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                            }
                        }
                        Err(e) => {
                            tracing::error!("Failed to start HTTP server: {}", e);
                        }
                    }
                });
            });

            // Manage state for Tauri commands
            app.manage(state);

            info!("Application initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            collect,
            get_collection,
            get_collections,
            delete_collection,
            get_collection_stats,
            search,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
