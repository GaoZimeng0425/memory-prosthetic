//! Memory Prosthetic Desktop Application
//!
//! Tauri backend for the Memory Prosthetic app.

mod cleanup;
mod db;
mod embedding;
mod graph;
mod server;
mod settings;
mod tray;

use db::{
    Collection, CollectionListItem, CollectionRepository, CollectionStats, CollectionStatus,
    CreateCollection, Database, DbError, EmbeddingsRepository,
    Favorite, FavoriteRepository, CreateFavorite, UpdateFavorite,
    Tag, TagRepository, CreateTag, UpdateTag, TagSortOrder,
    CollectionTagRepository,
    AiMetadataRepository, UpdateAiMetadata, CreateKeyword, CreateTopic, CreateAiLog,
    AiProcessingLog, Keyword, Topic,
    AssociationRepository,
    CreateAssociation as DbCreateAssociation,
};
use graph::{GraphBuilder, GraphData, IncrementalDiscovery};
use embedding::get_embedding_model;
use embedding::EmbeddingService;
use serde::{Deserialize, Serialize};
use settings::{AppSettings, SettingsManager, ShortcutConfig, Theme};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent};
#[cfg(target_os = "macos")]
use tauri::window::Color;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tracing::info;

/// Application state shared across commands
pub struct AppState {
    pub db: Arc<Database>,
    pub settings: Arc<Mutex<SettingsManager>>,
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

/// Collection operation request (for archive, restore, toggle-star, permanently-delete)
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollectionOperationRequest {
    pub id: i64,
}

/// Get collections request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCollectionsRequest {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub favorite_id: Option<i64>,
    pub uncategorized: Option<bool>,
    pub tag_ids: Option<Vec<i64>>,
    pub status: Option<String>,
}

/// Get collection tags request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCollectionTagsRequest {
    pub collection_id: i64,
}

/// Add collection tags request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddCollectionTagsRequest {
    pub collection_id: i64,
    pub tag_ids: Vec<i64>,
}

/// Remove collection tag request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveCollectionTagRequest {
    pub collection_id: i64,
    pub tag_id: i64,
}

/// Set collection favorite request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetCollectionFavoriteRequest {
    pub id: i64,
    pub favorite_id: Option<i64>,
}

/// Get collection request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetCollectionRequest {
    pub id: i64,
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
        // Before hiding search window, check if main window should receive focus
        let main_window_was_focused = if let Some(main_window) = app.get_webview_window("main") {
            main_window.is_focused().unwrap_or(false)
        } else {
            false
        };

        // If main window was not focused (user was using other apps),
        // temporarily make it non-focusable to prevent macOS from auto-focusing it
        if !main_window_was_focused {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_focusable(false);
            }
        }

        // Hide search window
        window.hide().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: e.to_string(),
        })?;

        // Restore main window focusability after a short delay
        // This prevents macOS from auto-focusing it when search window closes
        if !main_window_was_focused {
            if let Some(main_window) = app.get_webview_window("main") {
                // Use a small delay to ensure search window is fully hidden first
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    let _ = main_window.set_focusable(true);
                });
            }
        }
    }
    Ok(())
}

/// Show the search window
#[tauri::command]
fn show_search_window(app: AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window("search") {
        // Disable shadow to remove macOS focus ring
        let _ = window.set_shadow(false);
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

/// Show and focus the main window (handles both hidden and minimized states)
#[tauri::command]
fn show_main_window(app: AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: e.to_string(),
        })?;
        window.unminimize().map_err(|e| CommandError {
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

/// Create a webview as a child of the main window (embedded, not a separate window)
/// This uses macOS native layout to embed webview inside the main window
#[tauri::command]
fn create_webview(
    app: AppHandle,
    url: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), CommandError> {
    // Get the main window as Window (not WebviewWindow) to use add_child
    let main_window = app
        .get_window("main")
        .ok_or_else(|| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: "Main window not found".to_string(),
        })?;

    // Close existing webview if it exists (by label)
    if let Some(existing_webview) = app.get_webview("webview") {
        let _ = existing_webview.close();
        // Wait a bit for the webview to close
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    // Create webview builder
    let webview_builder = tauri::webview::WebviewBuilder::new(
        "webview",
        tauri::WebviewUrl::External(url.parse().map_err(|e| CommandError {
            code: "INVALID_URL".to_string(),
            message: format!("Invalid URL: {}", e),
        })?),
    );

    // Add webview as a child of the main window (embedded, not a separate window)
    // This uses macOS native layout to embed the webview
    // Note: add_child is available on Window trait, which WebviewWindow implements
    let position = tauri::LogicalPosition::new(x as f64, y as f64);
    let size = tauri::LogicalSize::new(width as f64, height as f64);

    // Use the Window trait method add_child
    // WebviewWindow implements Window trait, so we can call add_child directly
    use tauri::Window;
    main_window
        .add_child(webview_builder, position, size)
        .map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: format!("Failed to create embedded webview: {}", e),
        })?;

    // Note: Embedded webviews created with add_child are child views, not separate windows.
    // They should naturally appear below UI elements rendered in the main window.
    // If z-index issues persist, we may need to adjust the webview's position or use
    // a different approach for UI overlays.

    Ok(())
}

/// Update the embedded webview position and size
#[tauri::command]
fn update_webview(
    app: AppHandle,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), CommandError> {
    // Get the webview
    if let Some(webview) = app.get_webview("webview") {
        // Update webview position and size
        let position = tauri::LogicalPosition::new(x as f64, y as f64);
        let size = tauri::LogicalSize::new(width as f64, height as f64);

        webview
            .set_position(position)
            .map_err(|e| CommandError {
                code: "WINDOW_ERROR".to_string(),
                message: format!("Failed to set webview position: {}", e),
            })?;

        webview
            .set_size(size)
            .map_err(|e| CommandError {
                code: "WINDOW_ERROR".to_string(),
                message: format!("Failed to set webview size: {}", e),
            })?;
    }
    Ok(())
}

/// Hide the embedded webview (temporarily, without closing)
#[tauri::command]
fn hide_webview(app: AppHandle) -> Result<(), CommandError> {
    if let Some(webview) = app.get_webview("webview") {
        webview.hide().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: format!("Failed to hide webview: {}", e),
        })?;
    }
    Ok(())
}

/// Show the embedded webview (make it visible again)
#[tauri::command]
fn show_webview(app: AppHandle) -> Result<(), CommandError> {
    if let Some(webview) = app.get_webview("webview") {
        webview.show().map_err(|e| CommandError {
            code: "WINDOW_ERROR".to_string(),
            message: format!("Failed to show webview: {}", e),
        })?;
    }
    Ok(())
}

/// Close the embedded webview
#[tauri::command]
fn close_webview(app: AppHandle) -> Result<(), CommandError> {
    // Use app.get_webview() to get webview by label
    if let Some(webview) = app.get_webview("webview") {
        webview.close().map_err(|e| CommandError {
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
            // Before hiding search window, check if main window should receive focus
            let main_window_was_focused = if let Some(main_window) = app.get_webview_window("main") {
                main_window.is_focused().unwrap_or(false)
            } else {
                false
            };

            // If main window was not focused (user was using other apps),
            // temporarily make it non-focusable to prevent macOS from auto-focusing it
            if !main_window_was_focused {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.set_focusable(false);
                }
            }

            // Hide search window
            window.hide().map_err(|e| e.to_string())?;

            // Restore main window focusability after a short delay
            // This prevents macOS from auto-focusing it when search window closes
            if !main_window_was_focused {
                let app_handle = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        let _ = main_window.set_focusable(true);
                    }
                });
            }
        } else {
            // Disable shadow to remove macOS focus ring
            let _ = window.set_shadow(false);
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

/// Get a setting by key (for custom settings like AI config)
#[tauri::command]
fn get_setting(
    app: AppHandle,
    key: String,
) -> Result<CommandResult<serde_json::Value>, CommandError> {
    use std::collections::HashMap;
    use std::fs;

    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError {
            code: "PATH_ERROR".to_string(),
            message: e.to_string(),
        })?;

    let custom_settings_path = app_data_dir.join("custom_settings.json");

    let value = if custom_settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&custom_settings_path) {
            if let Ok(settings_map) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&content) {
                settings_map.get(&key).cloned()
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(CommandResult {
        data: value.unwrap_or(serde_json::Value::Null),
    })
}

/// Set a setting by key (for custom settings like AI config)
#[tauri::command]
fn set_setting(
    app: AppHandle,
    key: String,
    value: serde_json::Value,
) -> Result<CommandResult<()>, CommandError> {
    use std::collections::HashMap;
    use std::fs;

    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError {
            code: "PATH_ERROR".to_string(),
            message: e.to_string(),
        })?;

    let custom_settings_path = app_data_dir.join("custom_settings.json");

    // Ensure directory exists
    if let Some(parent) = custom_settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| CommandError {
            code: "SETTINGS_ERROR".to_string(),
            message: format!("Failed to create settings directory: {}", e),
        })?;
    }

    // Read existing settings
    let mut settings_map: HashMap<String, serde_json::Value> = if custom_settings_path.exists() {
        if let Ok(content) = fs::read_to_string(&custom_settings_path) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        }
    } else {
        HashMap::new()
    };

    // Update setting
    settings_map.insert(key, value);

    // Save settings
    let content = serde_json::to_string_pretty(&settings_map).map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: format!("Failed to serialize settings: {}", e),
    })?;

    fs::write(&custom_settings_path, content).map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: format!("Failed to write settings: {}", e),
    })?;

    Ok(CommandResult { data: () })
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

/// Update auto cleanup deleted setting
#[tauri::command]
fn update_auto_cleanup_deleted(
    state: State<'_, Arc<AppState>>,
    cleanup: settings::AutoCleanupDeleted,
) -> Result<CommandResult<settings::AutoCleanupDeleted>, CommandError> {
    let mut settings = state.settings.lock().map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: e.to_string(),
    })?;

    settings.update_auto_cleanup_deleted(cleanup.clone()).map_err(|e| CommandError {
        code: "SETTINGS_ERROR".to_string(),
        message: e.to_string(),
    })?;

    info!("Auto cleanup deleted updated to: {:?}", cleanup);

    Ok(CommandResult { data: cleanup })
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
    request: GetCollectionRequest,
) -> Result<CommandResult<Option<Collection>>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let collection = repo.get_by_id(request.id)?;

    Ok(CommandResult { data: collection })
}

/// List collections with pagination and filters
#[tauri::command]
fn get_collections(
    state: State<'_, Arc<AppState>>,
    request: GetCollectionsRequest,
) -> Result<CommandResult<Vec<CollectionListItem>>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let status_enum = request.status
        .map(|s| CollectionStatus::from(s))
        .or_else(|| Some(CollectionStatus::Active));
    let tag_ids_slice = request.tag_ids.as_deref();

    // Only filter by uncategorized if explicitly set to true
    // If uncategorized is None or false, don't filter by favorite_id at all (show all)
    let is_uncategorized = request.uncategorized == Some(true);
    let favorite_id_filter = if is_uncategorized {
        None // This will be handled specially in the repository
    } else {
        request.favorite_id
    };

    let collections = repo.list(
        request.limit.unwrap_or(1000), // Use larger default to match frontend
        request.offset.unwrap_or(0),
        favorite_id_filter,
        is_uncategorized, // Only true if explicitly Some(true)
        tag_ids_slice,
        status_enum,
    )?;

    Ok(CommandResult { data: collections })
}

/// Delete a collection by ID (soft delete)
#[tauri::command]
fn delete_collection(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let deleted = repo.delete(id)?;

    Ok(CommandResult { data: deleted })
}

/// Permanently delete a collection
#[tauri::command]
fn permanently_delete_collection(
    state: State<'_, Arc<AppState>>,
    request: CollectionOperationRequest,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let deleted = repo.permanently_delete(request.id)?;

    Ok(CommandResult { data: deleted })
}

/// Archive a collection
#[tauri::command]
fn archive_collection(
    state: State<'_, Arc<AppState>>,
    request: CollectionOperationRequest,
) -> Result<CommandResult<()>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    repo.archive(request.id)?;

    Ok(CommandResult { data: () })
}

/// Restore a collection
#[tauri::command]
fn restore_collection(
    state: State<'_, Arc<AppState>>,
    request: CollectionOperationRequest,
) -> Result<CommandResult<()>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    repo.restore(request.id)?;

    Ok(CommandResult { data: () })
}

/// Set collection favorite
#[tauri::command]
fn set_collection_favorite(
    state: State<'_, Arc<AppState>>,
    request: SetCollectionFavoriteRequest,
) -> Result<CommandResult<()>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    repo.set_favorite(request.id, request.favorite_id)?;

    Ok(CommandResult { data: () })
}

/// Toggle starred status for a collection
#[tauri::command]
fn toggle_collection_star(
    state: State<'_, Arc<AppState>>,
    request: CollectionOperationRequest,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = CollectionRepository::new(&state.db);
    let starred = repo.toggle_star(request.id)?;

    Ok(CommandResult { data: starred })
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
    let collections = repo.list(100, 0, None, false, None, Some(CollectionStatus::Active))?;

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
// Favorites Commands
// ============================================

/// Create a new favorite
#[tauri::command]
fn create_favorite(
    state: State<'_, Arc<AppState>>,
    request: CreateFavorite,
) -> Result<CommandResult<i64>, CommandError> {
    let repo = FavoriteRepository::new(&state.db);
    let id = repo.create(&request)?;

    Ok(CommandResult { data: id })
}

/// Update a favorite
#[tauri::command]
fn update_favorite(
    state: State<'_, Arc<AppState>>,
    id: i64,
    request: UpdateFavorite,
) -> Result<CommandResult<()>, CommandError> {
    let repo = FavoriteRepository::new(&state.db);
    repo.update(id, &request)?;

    Ok(CommandResult { data: () })
}

/// Delete a favorite
#[tauri::command]
fn delete_favorite(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = FavoriteRepository::new(&state.db);
    let deleted = repo.delete(id)?;

    Ok(CommandResult { data: deleted })
}

/// Get all favorites
#[tauri::command]
fn get_favorites(
    state: State<'_, Arc<AppState>>,
) -> Result<CommandResult<Vec<Favorite>>, CommandError> {
    let repo = FavoriteRepository::new(&state.db);
    let favorites = repo.list()?;

    Ok(CommandResult { data: favorites })
}

/// Get a favorite by ID
#[tauri::command]
fn get_favorite(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<Option<Favorite>>, CommandError> {
    let repo = FavoriteRepository::new(&state.db);
    let favorite = repo.get_by_id(id)?;

    Ok(CommandResult { data: favorite })
}

// ============================================
// Tags Commands
// ============================================

/// Create a new tag
#[tauri::command]
fn create_tag(
    state: State<'_, Arc<AppState>>,
    request: CreateTag,
) -> Result<CommandResult<i64>, CommandError> {
    let repo = TagRepository::new(&state.db);
    let id = repo.create(&request)?;

    Ok(CommandResult { data: id })
}

/// Update a tag
#[tauri::command]
fn update_tag(
    state: State<'_, Arc<AppState>>,
    id: i64,
    request: UpdateTag,
) -> Result<CommandResult<()>, CommandError> {
    let repo = TagRepository::new(&state.db);
    repo.update(id, &request)?;

    Ok(CommandResult { data: () })
}

/// Delete a tag
#[tauri::command]
fn delete_tag(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<bool>, CommandError> {
    let repo = TagRepository::new(&state.db);
    let deleted = repo.delete(id)?;

    Ok(CommandResult { data: deleted })
}

/// Get all tags
#[tauri::command]
fn get_tags(
    state: State<'_, Arc<AppState>>,
    sort: Option<String>,
) -> Result<CommandResult<Vec<Tag>>, CommandError> {
    let repo = TagRepository::new(&state.db);
    let sort_order = match sort.as_deref() {
        Some("usage") => Some(TagSortOrder::UsageDesc),
        Some("created") => Some(TagSortOrder::CreatedDesc),
        _ => Some(TagSortOrder::NameAsc),
    };
    let tags = repo.list(sort_order)?;

    Ok(CommandResult { data: tags })
}

/// Get a tag by ID
#[tauri::command]
fn get_tag(
    state: State<'_, Arc<AppState>>,
    id: i64,
) -> Result<CommandResult<Option<Tag>>, CommandError> {
    let repo = TagRepository::new(&state.db);
    let tag = repo.get_by_id(id)?;

    Ok(CommandResult { data: tag })
}

// ============================================
// Collection-Tags Commands
// ============================================

/// Add tags to a collection
#[tauri::command]
fn add_collection_tags(
    state: State<'_, Arc<AppState>>,
    request: AddCollectionTagsRequest,
) -> Result<CommandResult<()>, CommandError> {
    let repo = CollectionTagRepository::new(&state.db);
    repo.add_tags(request.collection_id, &request.tag_ids)?;

    Ok(CommandResult { data: () })
}

/// Remove a tag from a collection
#[tauri::command]
fn remove_collection_tag(
    state: State<'_, Arc<AppState>>,
    request: RemoveCollectionTagRequest,
) -> Result<CommandResult<()>, CommandError> {
    let repo = CollectionTagRepository::new(&state.db);
    repo.remove_tag(request.collection_id, request.tag_id)?;

    Ok(CommandResult { data: () })
}

/// Get all tags for a collection
#[tauri::command]
fn get_collection_tags(
    state: State<'_, Arc<AppState>>,
    request: GetCollectionTagsRequest,
) -> Result<CommandResult<Vec<Tag>>, CommandError> {
    let repo = CollectionTagRepository::new(&state.db);
    let tags = repo.get_tags_by_collection(request.collection_id)?;

    Ok(CommandResult { data: tags })
}

// ============================================
// AI Metadata Commands
// ============================================

/// Update AI metadata for a collection
#[tauri::command]
async fn update_collection_ai_metadata(
    state: State<'_, Arc<AppState>>,
    id: i64,
    ai_metadata: serde_json::Value,
) -> Result<CommandResult<()>, CommandError> {
    // Parse AI metadata from frontend
    let summary: Option<String> = ai_metadata.get("summary").and_then(|v| v.as_str()).map(|s| s.to_string());
    let summary_type: Option<String> = ai_metadata.get("summaryType").and_then(|v| v.as_str()).map(|s| s.to_string());
    let content_type: Option<String> = ai_metadata.get("contentType").and_then(|v| v.as_str()).map(|s| s.to_string());
    let domain: Option<String> = ai_metadata.get("domain").and_then(|v| v.as_str()).map(|s| s.to_string());
    let difficulty: Option<String> = ai_metadata.get("difficulty").and_then(|v| v.as_str()).map(|s| s.to_string());
    let language: Option<String> = ai_metadata.get("language").and_then(|v| v.as_str()).map(|s| s.to_string());
    let quality_score: Option<f64> = ai_metadata.get("qualityScore").and_then(|v| v.as_f64());
    let processed_at: Option<i64> = ai_metadata.get("processedAt").and_then(|v| v.as_i64());

    // Parse keywords
    let keywords: Vec<CreateKeyword> = ai_metadata
        .get("keywords")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    Some(CreateKeyword {
                        id: item.get("id")?.as_str()?.to_string(),
                        keyword: item.get("keyword")?.as_str()?.to_string(),
                        weight: item.get("weight")?.as_f64()?,
                        extraction_method: item.get("extractionMethod")?.as_str()?.to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    // Parse topics
    let topics: Vec<CreateTopic> = ai_metadata
        .get("topics")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    Some(CreateTopic {
                        id: item.get("id")?.as_str()?.to_string(),
                        topic: item.get("topic")?.as_str()?.to_string(),
                        confidence: item.get("confidence")?.as_f64()?,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let metadata = UpdateAiMetadata {
        summary,
        summary_type,
        content_type,
        domain,
        difficulty,
        language,
        quality_score,
        processed_at,
        keywords,
        topics,
    };

    let repo = AiMetadataRepository::new(state.db.clone());
    repo.update_collection_metadata(id, &metadata)?;

    // 触发关联发现
    let collection_repo = CollectionRepository::new(&state.db);
    if let Ok(Some(collection)) = collection_repo.get_by_id(id) {
        let discovery = IncrementalDiscovery::new(state.db.clone());
        match discovery.discover_for_new_content(&collection).await {
            Ok(associations) => {
                tracing::info!("Discovered {} associations for collection {}", associations.len(), id);
                let assoc_repo = AssociationRepository::new(state.db.clone());
                let mut created_count = 0;
                for assoc in associations {
                    // 将 graph::builder::CreateAssociation 转换为 db::associations::CreateAssociation
                    let db_assoc = DbCreateAssociation {
                        source_id: assoc.source_id,
                        target_id: assoc.target_id,
                        r#type: assoc.r#type,
                        types: assoc.types,
                        weight: assoc.weight,
                        confidence: assoc.confidence,
                        quality_score: assoc.quality_score,
                        reason: assoc.reason,
                        user_feedback: assoc.user_feedback,
                        is_expired: assoc.is_expired,
                        is_directional: assoc.is_directional,
                        direction: assoc.direction,
                        semantic_similarity: assoc.semantic_similarity,
                        shared_tags: assoc.shared_tags,
                        shared_folders: assoc.shared_folders,
                        time_interval: assoc.time_interval,
                        domain: assoc.domain,
                        keyword_overlap: assoc.keyword_overlap,
                        topic_match: assoc.topic_match,
                    };
                    // 尝试创建关联，如果已存在则忽略错误
                    if assoc_repo.create(&db_assoc).is_ok() {
                        created_count += 1;
                    }
                }
                tracing::info!("Created {} new associations for collection {}", created_count, id);
            }
            Err(e) => {
                tracing::warn!("Failed to discover associations for collection {}: {}", id, e);
            }
        }
    }

    Ok(CommandResult { data: () })
}

/// Get AI processing logs for a collection
#[tauri::command]
fn get_ai_processing_logs(
    state: State<'_, Arc<AppState>>,
    collection_id: i64,
) -> Result<CommandResult<Vec<AiProcessingLog>>, CommandError> {
    let repo = AiMetadataRepository::new(state.db.clone());
    let logs = repo.get_logs(collection_id)?;

    Ok(CommandResult { data: logs })
}

/// Get keywords for a collection
#[tauri::command]
fn get_collection_keywords(
    state: State<'_, Arc<AppState>>,
    collection_id: i64,
) -> Result<CommandResult<Vec<Keyword>>, CommandError> {
    let repo = AiMetadataRepository::new(state.db.clone());
    let keywords = repo.get_keywords(collection_id)?;

    Ok(CommandResult { data: keywords })
}

/// Get topics for a collection
#[tauri::command]
fn get_collection_topics(
    state: State<'_, Arc<AppState>>,
    collection_id: i64,
) -> Result<CommandResult<Vec<Topic>>, CommandError> {
    let repo = AiMetadataRepository::new(state.db.clone());
    let topics = repo.get_topics(collection_id)?;

    Ok(CommandResult { data: topics })
}

/// Get AI metadata for a collection (including classification fields from collections table)
#[tauri::command]
fn get_collection_ai_metadata(
    state: State<'_, Arc<AppState>>,
    collection_id: i64,
) -> Result<CommandResult<serde_json::Value>, CommandError> {
    use crate::db::CollectionRepository;

    let collection_repo = CollectionRepository::new(&state.db);
    let collection = collection_repo
        .get_by_id(collection_id)?
        .ok_or_else(|| CommandError {
            code: "NOT_FOUND".to_string(),
            message: format!("Collection {} not found", collection_id),
        })?;

    let ai_repo = AiMetadataRepository::new(state.db.clone());
    let keywords = ai_repo.get_keywords(collection_id).unwrap_or_default();
    let topics = ai_repo.get_topics(collection_id).unwrap_or_default();

    // Get classification fields from collections table
    use rusqlite::params;
    let metadata = state.db.with_connection(|conn| {
        conn.query_row(
            r#"
            SELECT content_type, domain, difficulty, language, quality_score, processed_at, summary_type
            FROM collections
            WHERE id = ?1
            "#,
            params![collection_id],
            |row| {
                Ok(serde_json::json!({
                    "contentType": row.get::<_, Option<String>>(0)?,
                    "domain": row.get::<_, Option<String>>(1)?,
                    "difficulty": row.get::<_, Option<String>>(2)?,
                    "language": row.get::<_, Option<String>>(3)?,
                    "qualityScore": row.get::<_, Option<f64>>(4)?,
                    "processedAt": row.get::<_, Option<i64>>(5)?,
                    "summary": collection.summary,
                    "summaryType": row.get::<_, Option<String>>(6)?,
                    "keywords": keywords,
                    "topics": topics,
                }))
            },
        )
    })?;

    Ok(CommandResult { data: metadata })
}

// ============================================
// Graph Commands
// ============================================

/// Discover associations for all collections (batch discovery)
#[tauri::command]
async fn discover_all_associations(
    state: State<'_, Arc<AppState>>,
) -> Result<CommandResult<usize>, CommandError> {
    let collection_repo = CollectionRepository::new(&state.db);
    let discovery = IncrementalDiscovery::new(state.db.clone());
    let assoc_repo = AssociationRepository::new(state.db.clone());

    // Get all collections
    let all_collections = collection_repo
        .list(1000, 0, None, false, None, None)
        .map_err(|e| CommandError {
            code: "DB_ERROR".to_string(),
            message: e.to_string(),
        })?;

    let mut total_associations = 0;
    let mut processed_count = 0;

    // Discover associations for each collection
    for item in all_collections {
        processed_count += 1;
        if let Ok(Some(collection)) = collection_repo.get_by_id(item.id) {
            if let Ok(associations) = discovery.discover_for_new_content(&collection).await {
            for assoc in associations {
                // 将 graph::builder::CreateAssociation 转换为 db::associations::CreateAssociation
                let db_assoc = DbCreateAssociation {
                    source_id: assoc.source_id,
                    target_id: assoc.target_id,
                    r#type: assoc.r#type,
                    types: assoc.types,
                    weight: assoc.weight,
                    confidence: assoc.confidence,
                    quality_score: assoc.quality_score,
                    reason: assoc.reason,
                    user_feedback: assoc.user_feedback,
                    is_expired: assoc.is_expired,
                    is_directional: assoc.is_directional,
                    direction: assoc.direction,
                    semantic_similarity: assoc.semantic_similarity,
                    shared_tags: assoc.shared_tags,
                    shared_folders: assoc.shared_folders,
                    time_interval: assoc.time_interval,
                    domain: assoc.domain,
                    keyword_overlap: assoc.keyword_overlap,
                    topic_match: assoc.topic_match,
                };
                // Try to create association, ignore if already exists
                if assoc_repo.create(&db_assoc).is_ok() {
                    total_associations += 1;
                }
            }
            }
        }
    }

    tracing::info!("Batch discovery completed: created {} associations from {} collections", total_associations, processed_count);
    Ok(CommandResult {
        data: total_associations,
    })
}

/// Debug: Get association statistics
#[tauri::command]
fn get_association_stats(
    state: State<'_, Arc<AppState>>,
) -> Result<CommandResult<serde_json::Value>, CommandError> {
    use std::collections::HashMap;
    let assoc_repo = AssociationRepository::new(state.db.clone());
    let collection_repo = CollectionRepository::new(&state.db);
    let ai_repo = AiMetadataRepository::new(state.db.clone());

    // Get all collections
    let all_collections = collection_repo
        .list(1000, 0, None, false, None, None)
        .map_err(|e| CommandError {
            code: "DB_ERROR".to_string(),
            message: e.to_string(),
        })?;

    // Count associations by type
    let mut type_counts: HashMap<String, usize> = HashMap::new();
    let mut total_associations = 0;
    let mut collection_associations: HashMap<i64, usize> = HashMap::new();
    let mut failed_collections: Vec<(i64, String)> = Vec::new();

    for collection in &all_collections {
        match assoc_repo.get_by_collection(collection.id, None, None) {
            Ok(assocs) => {
                let count = assocs.len();
                total_associations += count;
                collection_associations.insert(collection.id, count);
                for assoc in assocs {
                    *type_counts.entry(assoc.r#type.clone()).or_insert(0) += 1;
                }
            }
            Err(e) => {
                // 记录失败的 collection
                failed_collections.push((collection.id, e.to_string()));
                // 仍然添加到 map，标记为 0
                collection_associations.insert(collection.id, 0);
            }
        }
    }

    if !failed_collections.is_empty() {
        tracing::warn!("Failed to get associations for {} collections: {:?}", failed_collections.len(), failed_collections);
    }

    // Analyze potential associations
    let mut potential_associations: HashMap<String, Vec<String>> = HashMap::new();

    // Check keyword overlaps
    let mut keyword_overlaps = Vec::new();
    for i in 0..all_collections.len() {
        for j in (i + 1)..all_collections.len() {
            let id1 = all_collections[i].id;
            let id2 = all_collections[j].id;

            let keywords1: std::collections::HashSet<String> = ai_repo
                .get_keywords(id1)
                .unwrap_or_default()
                .into_iter()
                .map(|k| k.keyword.to_lowercase())
                .collect();

            let keywords2: std::collections::HashSet<String> = ai_repo
                .get_keywords(id2)
                .unwrap_or_default()
                .into_iter()
                .map(|k| k.keyword.to_lowercase())
                .collect();

            let shared: Vec<String> = keywords1.intersection(&keywords2).cloned().collect();
            if !shared.is_empty() {
                keyword_overlaps.push(format!("Collection {} <-> {}: {} shared keywords ({})",
                    id1, id2, shared.len(), shared.join(", ")));
            }
        }
    }
    potential_associations.insert("keyword".to_string(), keyword_overlaps);

    // Check topic overlaps
    let mut topic_overlaps = Vec::new();
    for i in 0..all_collections.len() {
        for j in (i + 1)..all_collections.len() {
            let id1 = all_collections[i].id;
            let id2 = all_collections[j].id;

            let topics1: std::collections::HashSet<String> = ai_repo
                .get_topics(id1)
                .unwrap_or_default()
                .into_iter()
                .map(|t| t.topic.to_lowercase())
                .collect();

            let topics2: std::collections::HashSet<String> = ai_repo
                .get_topics(id2)
                .unwrap_or_default()
                .into_iter()
                .map(|t| t.topic.to_lowercase())
                .collect();

            let shared: Vec<String> = topics1.intersection(&topics2).cloned().collect();
            if !shared.is_empty() {
                topic_overlaps.push(format!("Collection {} <-> {}: {} shared topics ({})",
                    id1, id2, shared.len(), shared.join(", ")));
            }
        }
    }
    potential_associations.insert("topic".to_string(), topic_overlaps);

    // Check tag overlaps
    use crate::db::CollectionTagRepository;
    let tag_repo = CollectionTagRepository::new(&state.db);
    let mut tag_overlaps = Vec::new();
    for i in 0..all_collections.len() {
        for j in (i + 1)..all_collections.len() {
            let id1 = all_collections[i].id;
            let id2 = all_collections[j].id;

            let tags1: std::collections::HashSet<String> = tag_repo
                .get_tags_by_collection(id1)
                .unwrap_or_default()
                .into_iter()
                .map(|t| t.name)
                .collect();

            let tags2: std::collections::HashSet<String> = tag_repo
                .get_tags_by_collection(id2)
                .unwrap_or_default()
                .into_iter()
                .map(|t| t.name)
                .collect();

            let shared: Vec<String> = tags1.intersection(&tags2).cloned().collect();
            if !shared.is_empty() {
                tag_overlaps.push(format!("Collection {} <-> {}: {} shared tags ({})",
                    id1, id2, shared.len(), shared.join(", ")));
            }
        }
    }
    potential_associations.insert("tag".to_string(), tag_overlaps);

    // Check domain overlaps
    fn extract_domain(url: &str) -> Option<String> {
        url::Url::parse(url)
            .ok()
            .and_then(|u| u.host_str().map(|h| h.to_string()))
    }

    let mut domain_overlaps = Vec::new();
    for i in 0..all_collections.len() {
        for j in (i + 1)..all_collections.len() {
            if let (Ok(Some(c1)), Ok(Some(c2))) = (
                collection_repo.get_by_id(all_collections[i].id),
                collection_repo.get_by_id(all_collections[j].id)
            ) {
                if let (Some(d1), Some(d2)) = (
                    extract_domain(&c1.url),
                    extract_domain(&c2.url)
                ) {
                    if d1 == d2 {
                        domain_overlaps.push(format!("Collection {} <-> {}: same domain ({})",
                            c1.id, c2.id, d1));
                    }
                }
            }
        }
    }
    potential_associations.insert("domain".to_string(), domain_overlaps);

    let stats = serde_json::json!({
        "total_collections": all_collections.len(),
        "total_associations": total_associations,
        "associations_by_type": type_counts,
        "collections_with_associations": collection_associations,
        "potential_associations": potential_associations,
    });

    Ok(CommandResult { data: stats })
}

/// Graph filters request
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphFiltersRequest {
    pub min_weight: Option<f64>,
    pub types: Option<Vec<String>>,
    pub max_nodes: Option<usize>,
    pub focused_node_id: Option<i64>, // 焦点模式：中心节点 ID
    pub max_depth: Option<usize>, // 焦点模式：最大关联深度（默认 1）
}

/// Get graph data for visualization
#[tauri::command]
fn get_graph_data(
    state: State<'_, Arc<AppState>>,
    filters: GraphFiltersRequest,
) -> Result<CommandResult<GraphData>, CommandError> {
    let builder = GraphBuilder::new(state.db.clone());

    let r#type = filters.types.as_ref().and_then(|t| t.first()).map(|s| s.as_str());

    // 焦点模式：仅返回与指定节点相关的图谱
    if let Some(focused_id) = filters.focused_node_id {
        let max_depth = filters.max_depth.unwrap_or(1);
        let graph_data = builder.build_focused_graph(
            focused_id,
            max_depth,
            r#type,
            filters.min_weight,
            filters.max_nodes,
        )?;
        return Ok(CommandResult { data: graph_data });
    }

    // 全量模式：返回所有节点和边
    let graph_data = builder.build_graph(
        r#type,
        filters.min_weight,
        filters.max_nodes,
    )?;

    Ok(CommandResult { data: graph_data })
}

// ============================================
// App Initialization
// ============================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_denylist(&["search"]) // search window always centered, skip state persistence
                .build(),
        )
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
            // Set search window background to transparent on macOS
            #[cfg(target_os = "macos")]
            {
                if let Some(search_window) = app.get_webview_window("search") {
                    // Set transparent background color (RGBA: 0, 0, 0, 0)
                    let _ = search_window.set_background_color(Some(Color::from([0, 0, 0, 0])));
                }
            }

            // Helper function to emit error event to frontend
            let emit_startup_error = |title: &str, message: &str, details: Option<&str>| {
                let error_payload = serde_json::json!({
                    "title": title,
                    "message": message,
                    "details": details.unwrap_or("")
                });

                // Try to emit to main window first
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.emit("startup:error", &error_payload);
                } else {
                    // If main window doesn't exist yet, emit to all windows
                    let _ = app.emit("startup:error", &error_payload);
                }
            };

            // Get app data directory
            let app_data_dir = match app.path().app_data_dir() {
                Ok(dir) => {
                    info!("App data directory: {:?}", dir);
                    dir
                }
                Err(e) => {
                    tracing::error!("Failed to get app data directory: {}", e);
                    let error_msg = format!(
                        "无法获取应用数据目录: {}. 请检查系统权限和磁盘空间。",
                        e
                    );
                    emit_startup_error("应用数据目录获取失败", &error_msg, Some(&e.to_string()));
                    return Err(error_msg.into());
                }
            };

            // Initialize database
            let db = match db::init_database(app_data_dir.clone()) {
                Ok(db) => db,
                Err(e) => {
                    tracing::error!("Failed to initialize database: {}", e);
                    let error_msg = format!(
                        "数据库初始化失败: {}. 请检查应用数据目录权限和磁盘空间。",
                        e
                    );
                    emit_startup_error("数据库初始化失败", &error_msg, Some(&e.to_string()));
                    return Err(error_msg.into());
                }
            };

            // Initialize settings
            let settings_manager = match SettingsManager::new(app_data_dir.clone()) {
                Ok(manager) => manager,
                Err(e) => {
                    tracing::error!("Failed to initialize settings: {}", e);
                    let error_msg = format!("设置初始化失败: {}.", e);
                    emit_startup_error("设置初始化失败", &error_msg, Some(&e.to_string()));
                    return Err(error_msg.into());
                }
            };
            let shortcut_config = settings_manager.get().search_shortcut.clone();

            // Initialize embedding model (optional - may not exist)
            let model_dir = app_data_dir.join("models").join("all-MiniLM-L6-v2");
            let has_embedding_model = embedding::init_embedding_model(model_dir).is_ok();

            if !has_embedding_model {
                tracing::warn!("Embedding model not available. Semantic search disabled.");
            }

            // Create app state
            let db_arc = Arc::new(db.clone());
            let settings_arc = Arc::new(Mutex::new(settings_manager));
            let state = Arc::new(AppState {
                db: db_arc.clone(),
                settings: settings_arc.clone(),
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
            let db_for_cleanup = Arc::clone(&db_arc);
            let settings_for_cleanup = Arc::clone(&settings_arc);

            // Start cleanup service in a separate thread with its own runtime
            std::thread::spawn(move || {
                let rt = match tokio::runtime::Runtime::new() {
                    Ok(rt) => rt,
                    Err(e) => {
                        tracing::error!("Failed to create Tokio runtime for cleanup service: {}", e);
                        return;
                    }
                };

                rt.block_on(async move {
                    let cleanup_service = cleanup::service::CleanupService::new(
                        db_for_cleanup,
                        settings_for_cleanup,
                    );
                    cleanup_service.start();
                    info!("Cleanup service started");

                    // Keep the runtime alive
                    loop {
                        tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                    }
                });
            });

            // Start HTTP server and embedding service in a separate thread with its own runtime
            std::thread::spawn(move || {
                let rt = match tokio::runtime::Runtime::new() {
                    Ok(rt) => rt,
                    Err(e) => {
                        tracing::error!("Failed to create Tokio runtime for HTTP server: {}", e);
                        return;
                    }
                };

                rt.block_on(async move {
                    // Start embedding service if model is available
                    if has_embedding_model {
                        let service = EmbeddingService::start(db_for_embedding);
                        info!("Embedding service started");
                        std::mem::forget(service);
                    }

                    // Read port from settings
                    let port = {
                        let settings = server_state.settings.lock().unwrap();
                        settings.get().server_port
                    };

                    let config = server::ServerConfig {
                        port,
                        host: "127.0.0.1".to_string(), // Always use 127.0.0.1 to avoid proxy issues
                    };

                    info!("Starting HTTP server on port {} (from settings)", port);
                    match server::start_server(server_state, config).await {
                        Ok(server) => {
                            let server_addr = server.addr();
                            info!("✅ HTTP server successfully started on http://{}", server_addr);
                            info!("   - Browser extension can connect to: http://{}/api/*", server_addr);
                            info!("   - MCP server available at: http://{}/mcp", server_addr);

                            // Keep server alive by looping forever
                            std::mem::forget(server);

                            // Keep the runtime alive
                            loop {
                                tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                            }
                        }
                        Err(e) => {
                            tracing::error!("❌ Failed to start HTTP server: {}", e);
                            tracing::error!("   This may be due to:");
                            tracing::error!("   - Port {} is already in use", port);
                            tracing::error!("   - Insufficient permissions");
                            tracing::error!("   - Network interface issue");
                            tracing::error!("   Browser extension and MCP will not work until this is resolved.");

                            // Keep the thread alive so we can see the error
                            loop {
                                tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                            }
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

            // Show main window after state restoration (window starts with visible: false)
            // The window-state plugin restores position/size before we show it
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                info!("Main window shown with restored state");
            }

            info!("Application initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            collect,
            get_collection,
            get_collections,
            delete_collection,
            toggle_collection_star,
            get_collection_stats,
            search,
            get_search_suggestions,
            toggle_search_window,
            hide_search_window,
            show_search_window,
            show_main_window,
            create_webview,
            update_webview,
            hide_webview,
            show_webview,
            close_webview,
            get_settings,
            get_setting,
            set_setting,
            update_shortcut,
            set_auto_start,
            update_theme,
            update_auto_cleanup_deleted,
            // Favorites
            create_favorite,
            update_favorite,
            delete_favorite,
            get_favorites,
            get_favorite,
            // Tags
            create_tag,
            update_tag,
            delete_tag,
            get_tags,
            get_tag,
            // Collection operations
            archive_collection,
            restore_collection,
            permanently_delete_collection,
            set_collection_favorite,
            add_collection_tags,
            remove_collection_tag,
            get_collection_tags,
            // AI Metadata
            update_collection_ai_metadata,
            get_ai_processing_logs,
            get_collection_keywords,
            get_collection_topics,
            get_collection_ai_metadata,
            // Graph
            get_graph_data,
            discover_all_associations,
            get_association_stats,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            match event {
                // Handle macOS dock icon click to show main window
                RunEvent::Reopen { has_visible_windows, .. } => {
                    if !has_visible_windows {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                }
                // Handle window close request - hide instead of destroy on macOS
                #[cfg(target_os = "macos")]
                RunEvent::WindowEvent { label, event: WindowEvent::CloseRequested { api, .. }, .. } => {
                    if label == "main" {
                        // Prevent window from being destroyed
                        api.prevent_close();
                        // Hide the window instead
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                }
                // Handle search window focus loss - auto hide when losing focus
                RunEvent::WindowEvent { label, event: WindowEvent::Focused(focused), .. } => {
                    if label == "search" && !focused {
                        // Search window lost focus, hide it
                        if let Some(window) = app.get_webview_window("search") {
                            // Only hide if window is visible (avoid hiding already hidden window)
                            if window.is_visible().unwrap_or(false) {
                                // Before hiding search window, check if main window should receive focus
                                let main_window_was_focused = if let Some(main_window) = app.get_webview_window("main") {
                                    main_window.is_focused().unwrap_or(false)
                                } else {
                                    false
                                };

                                // If main window was not focused (user was using other apps),
                                // temporarily make it non-focusable to prevent macOS from auto-focusing it
                                if !main_window_was_focused {
                                    if let Some(main_window) = app.get_webview_window("main") {
                                        let _ = main_window.set_focusable(false);
                                    }
                                }

                                let _ = window.hide();
                                info!("Search window auto-hidden due to focus loss");

                                // Restore main window focusability after a short delay
                                if !main_window_was_focused {
                                    let app_handle = app.clone();
                                    std::thread::spawn(move || {
                                        std::thread::sleep(std::time::Duration::from_millis(50));
                                        if let Some(main_window) = app_handle.get_webview_window("main") {
                                            let _ = main_window.set_focusable(true);
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        });
}
