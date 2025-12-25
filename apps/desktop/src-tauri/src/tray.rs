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

    // Load tray icon from app's default icon (set in tauri.conf.json)
    let icon = app
        .default_window_icon()
        .cloned()
        .expect("Failed to get default window icon for tray");

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
