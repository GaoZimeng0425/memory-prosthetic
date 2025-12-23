//! Application settings management
//!
//! Stores and retrieves user preferences including keyboard shortcuts.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

/// Settings-related errors
#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Keyboard shortcut configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    /// Whether to use Command (macOS) / Super (Linux) / Win (Windows)
    pub use_super: bool,
    /// Whether to use Control
    #[serde(default)]
    pub use_ctrl: bool,
    /// Whether to use Shift
    pub use_shift: bool,
    /// Whether to use Alt/Option
    pub use_alt: bool,
    /// The key code (e.g., "Space", "K", etc.)
    pub key: String,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            use_super: true,
            use_ctrl: false,
            use_shift: true,
            use_alt: false,
            key: "Space".to_string(),
        }
    }
}

impl ShortcutConfig {
    /// Format as human-readable string (e.g., "⌘⇧Space")
    pub fn to_display_string(&self) -> String {
        let mut parts = Vec::new();

        #[cfg(target_os = "macos")]
        {
            if self.use_ctrl { parts.push("⌃"); }
            if self.use_super { parts.push("⌘"); }
            if self.use_alt { parts.push("⌥"); }
            if self.use_shift { parts.push("⇧"); }
        }

        #[cfg(not(target_os = "macos"))]
        {
            if self.use_ctrl { parts.push("Ctrl"); }
            if self.use_super { parts.push("Win"); }
            if self.use_alt { parts.push("Alt"); }
            if self.use_shift { parts.push("Shift"); }
        }

        parts.push(&self.key);
        parts.join("")
    }
}

/// Theme preference
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    #[default]
    Dark,
    System,
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    /// Global search shortcut
    pub search_shortcut: ShortcutConfig,
    /// HTTP server port
    pub server_port: u16,
    /// Auto start on boot
    #[serde(default)]
    pub auto_start: bool,
    /// Theme preference
    #[serde(default)]
    pub theme: Theme,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            search_shortcut: ShortcutConfig::default(),
            server_port: 21890,
            auto_start: false,
            theme: Theme::default(),
        }
    }
}

/// Settings manager
pub struct SettingsManager {
    settings_path: PathBuf,
    settings: AppSettings,
}

impl SettingsManager {
    /// Create a new settings manager
    pub fn new(app_data_dir: PathBuf) -> Result<Self, SettingsError> {
        let settings_path = app_data_dir.join("settings.json");

        let settings = if settings_path.exists() {
            let content = fs::read_to_string(&settings_path)?;
            serde_json::from_str(&content)?
        } else {
            AppSettings::default()
        };

        Ok(Self {
            settings_path,
            settings,
        })
    }

    /// Get current settings
    pub fn get(&self) -> &AppSettings {
        &self.settings
    }

    /// Update settings
    pub fn update(&mut self, settings: AppSettings) -> Result<(), SettingsError> {
        self.settings = settings;
        self.save()
    }

    /// Update just the shortcut
    pub fn update_shortcut(&mut self, shortcut: ShortcutConfig) -> Result<(), SettingsError> {
        self.settings.search_shortcut = shortcut;
        self.save()
    }

    /// Update theme
    pub fn update_theme(&mut self, theme: Theme) -> Result<(), SettingsError> {
        self.settings.theme = theme;
        self.save()
    }

    /// Save settings to file
    fn save(&self) -> Result<(), SettingsError> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.settings_path, content)?;
        Ok(())
    }
}
