//! Memory Prosthetic Desktop Application
//!
//! Tauri backend for the Memory Prosthetic app.

mod db;
mod embedding;
mod server;
mod settings;
mod tray;

use db::{Collection, CollectionListItem, CollectionRepository, CollectionStats, CreateCollection, Database, DbError, EmbeddingsRepository};
use embedding::get_embedding_model;
use embedding::EmbeddingService;
use serde::{Deserialize, Serialize};
use settings::{AppSettings, SettingsManager, ShortcutConfig, Theme};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tracing::info;

/// Application state shared across commands
pub struct AppState {
    pub db: Database,
    pub settings: Mutex<SettingsManager>,
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

/// Toggle the search window visibility
#[tauri::command]
fn toggle_search_window(app: AppHandle) -> Result<(), CommandError> {
    toggle_search(&app).map_err(|e| CommandError {
        code: "WINDOW_ERROR".to_string(),
        message: e.to_string(),
    })
}

/// Hide the search window
#[tauri::command]
fn hide_search_window(app: AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window("search") {
        window.hide().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: e.to_string(),
        })?;
    }
    Ok(())
}

/// Show the search window
#[tauri::command]
fn show_search_window(app: AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window("search") {
        window.show().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: e.to_string(),
        })?;
        window.set_focus().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: e.to_string(),
        })?;
    }
    Ok(())
}

/// Helper to toggle search window
fn toggle_search(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("search") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("Search window not found".to_string())
    }
}

/// Get current settings
#[tauri::command]
fn get_settings(
    state: State<'_, Arc<AppState>>,
) -> Result<CommandResult<AppSettings>, CommandError> {
    let settings = state.settings.lock().map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: e.to_string(),
    })?;

    Ok(CommandResult {
        data: settings.get().clone(),
    })
}

/// Update shortcut configuration
#[tauri::command]
fn update_shortcut(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    shortcut: ShortcutConfig,
) -> Result<CommandResult<ShortcutConfig>, CommandError> {
    // Update settings
    {
        let mut settings = state.settings.lock().map_err(|e| CommandError {
            code: "SETTINGS_ERROR".to_string(),
            message: e.to_string(),
        })?;

        settings.update_shortcut(shortcut.clone()).map_err(|e| CommandError {
            code: "SETTINGS_ERROR".to_string(),
            message: e.to_string(),
        })?;
    }

    // Re-register global shortcut
    let new_shortcut = shortcut_from_config(&shortcut);

    // Unregister all shortcuts first
    if let Err(e) = app.global_shortcut().unregister_all() {
        tracing::warn!("Failed to unregister shortcuts: {}", e);
    }

    // Register new shortcut
    if let Err(e) = app.global_shortcut().register(new_shortcut) {
        return Err(CommandError {
            code: "SHORTCUT_ERROR".to_string(),
            message: format!("Failed to register shortcut: {}", e),
        });
    }

    info!("Shortcut updated to: {}", shortcut.to_display_string());

    Ok(CommandResult { data: shortcut })
}

/// Set auto start on boot
#[tauri::command]
fn set_auto_start(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    enabled: bool,
) -> Result<CommandResult<bool>, CommandError> {
    use tauri_plugin_autostart::ManagerExt;

    // Update settings
    {
        let mut settings = state.settings.lock().map_err(|e| CommandError {
            code: "SETTINGS_ERROR".to_string(),
            message: e.to_string(),
        })?;

        let mut current = settings.get().clone();
        current.auto_start = enabled;
        settings.update(current).map_err(|e| CommandError {
            code: "SETTINGS_ERROR".to_string(),
            message: e.to_string(),
        })?;
    }

    // Update autostart registration
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| CommandError {
            code: "AUTOSTART_ERROR".to_string(),
            message: format!("Failed to enable autostart: {}", e),
        })?;
        info!("Autostart enabled");
    } else {
        autostart.disable().map_err(|e| CommandError {
            code: "AUTOSTART_ERROR".to_string(),
            message: format!("Failed to disable autostart: {}", e),
        })?;
        info!("Autostart disabled");
    }

    Ok(CommandResult { data: enabled })
}

/// Update theme preference
#[tauri::command]
fn update_theme(
    state: State<'_, Arc<AppState>>,
    theme: Theme,
) -> Result<CommandResult<Theme>, CommandError> {
    let mut settings = state.settings.lock().map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: e.to_string(),
    })?;

    settings.update_theme(theme.clone()).map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: e.to_string(),
    })?;

    info!("Theme updated to: {:?}", theme);

    Ok(CommandResult { data: theme })
}

/// Convert ShortcutConfig to Shortcut
fn shortcut_from_config(config: &ShortcutConfig) -> Shortcut {
    let mut modifiers = Modifiers::empty();

    if config.use_super {
        modifiers |= Modifiers::SUPER;
    }
    if config.use_ctrl {
        modifiers |= Modifiers::CONTROL;
    }
    if config.use_shift {
        modifiers |= Modifiers::SHIFT;
    }
    if config.use_alt {
        modifiers |= Modifiers::ALT;
    }

    let code = match config.key.to_lowercase().as_str() {
        "space" => Code::Space,
        "a" => Code::KeyA,
        "b" => Code::KeyB,
        "c" => Code::KeyC,
        "d" => Code::KeyD,
        "e" => Code::KeyE,
        "f" => Code::KeyF,
        "g" => Code::KeyG,
        "h" => Code::KeyH,
        "i" => Code::KeyI,
        "j" => Code::KeyJ,
        "k" => Code::KeyK,
        "l" => Code::KeyL,
        "m" => Code::KeyM,
        "n" => Code::KeyN,
        "o" => Code::KeyO,
        "p" => Code::KeyP,
        "q" => Code::KeyQ,
        "r" => Code::KeyR,
        "s" => Code::KeyS,
        "t" => Code::KeyT,
        "u" => Code::KeyU,
        "v" => Code::KeyV,
        "w" => Code::KeyW,
        "x" => Code::KeyX,
        "y" => Code::KeyY,
        "z" => Code::KeyZ,
        _ => Code::Space,
    };

    Shortcut::new(Some(modifiers), code)
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

/// Search suggestion item
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSuggestion {
    pub text: String,
    pub suggestion_type: String, // "title" or "recent"
}

/// Get search suggestions based on query prefix
#[tauri::command]
fn get_search_suggestions(
    state: State<'_, Arc<AppState>>,
    query: String,
    limit: Option<usize>,
) -> Result<CommandResult<Vec<SearchSuggestion>>, CommandError> {
    let limit = limit.unwrap_or(5);

    if query.len() < 2 {
        return Ok(CommandResult { data: vec![] });
    }

    let repo = CollectionRepository::new(&state.db);
    let collections = repo.list(100, 0)?;

    // Find matching titles (case-insensitive)
    let query_lower = query.to_lowercase();
    let suggestions: Vec<SearchSuggestion> = collections
        .into_iter()
        .filter(|c| c.title.to_lowercase().contains(&query_lower))
        .take(limit)
        .map(|c| SearchSuggestion {
            text: c.title,
            suggestion_type: "title".to_string(),
        })
        .collect();

    Ok(CommandResult { data: suggestions })
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
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Err(e) = toggle_search(app) {
                            tracing::error!("Failed to toggle search window: {}", e);
                        }
                    }
                })
                .build(),
        )
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

            // Initialize settings
            let settings_manager = SettingsManager::new(app_data_dir.clone())
                .expect("Failed to initialize settings");
            let shortcut_config = settings_manager.get().search_shortcut.clone();

            // Initialize embedding model (optional - may not exist)
            let model_dir = app_data_dir.join("models").join("all-MiniLM-L6-v2");
            let has_embedding_model = embedding::init_embedding_model(model_dir).is_ok();

            if !has_embedding_model {
                tracing::warn!("Embedding model not available. Semantic search disabled.");
            }

            // Create app state
            let db_arc = Arc::new(db.clone());
            let state = Arc::new(AppState {
                db,
                settings: Mutex::new(settings_manager),
            });

            // Register global shortcut from settings
            let shortcut = shortcut_from_config(&shortcut_config);
            if let Err(e) = app.global_shortcut().register(shortcut) {
                tracing::warn!("Failed to register global shortcut: {}. You can change it in settings.", e);
            } else {
                info!("Global shortcut registered: {}", shortcut_config.to_display_string());
            }

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

            // Setup system tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                tracing::error!("Failed to setup system tray: {}", e);
            }

            info!("Application initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            collect,
            get_collection,
            get_collections,
            delete_collection,
            get_collection_stats,
            search,
            get_search_suggestions,
            toggle_search_window,
            hide_search_window,
            show_search_window,
            get_settings,
            update_shortcut,
            set_auto_start,
            update_theme,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
