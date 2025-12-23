//! System tray management
//!
//! Handles system tray icon, menu, and events.

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tracing::info;

/// Menu item IDs
const MENU_SEARCH: &str = "search";
const MENU_MAIN: &str = "main";
const MENU_SETTINGS: &str = "settings";
const MENU_QUIT: &str = "quit";

/// Setup system tray
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Create menu items
    let search_item = MenuItem::with_id(app, MENU_SEARCH, "打开搜索", true, None::<&str>)?;
    let main_item = MenuItem::with_id(app, MENU_MAIN, "打开主窗口", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, MENU_SETTINGS, "设置", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, MENU_QUIT, "退出", true, None::<&str>)?;

    // Create menu
    let menu = Menu::with_items(
        app,
        &[
            &search_item,
            &main_item,
            &settings_item,
            &separator,
            &quit_item,
        ],
    )?;

    // Create a simple purple square icon (32x32 pixels, RGBA format)
    // Each pixel is 4 bytes: R, G, B, A
    let purple_pixel: [u8; 4] = [128, 90, 213, 255]; // Purple color
    let icon_size = 32u32;
    let icon_data: Vec<u8> = purple_pixel.repeat((icon_size * icon_size) as usize);
    let icon = Image::new_owned(icon_data, icon_size, icon_size);

    // Build tray with icon
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Memory Prosthetic")
        .on_menu_event(move |app, event| {
            handle_menu_event(app, event.id.as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Left click opens search window
                let app = tray.app_handle();
                toggle_search_window(app);
            }
        })
        .build(app)?;

    info!("System tray initialized");
    Ok(())
}

/// Handle menu item click events
fn handle_menu_event(app: &AppHandle, menu_id: &str) {
    match menu_id {
        MENU_SEARCH => {
            toggle_search_window(app);
        }
        MENU_MAIN => {
            show_main_window(app);
        }
        MENU_SETTINGS => {
            show_main_window(app);
            // Emit event to navigate to settings tab
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("navigate", "settings");
            }
        }
        MENU_QUIT => {
            info!("Quit requested from tray menu");
            app.exit(0);
        }
        _ => {}
    }
}

/// Toggle search window visibility
fn toggle_search_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("search") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Show and focus main window
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
