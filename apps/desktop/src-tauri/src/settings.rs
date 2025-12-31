//! Application settings management
//!
//! Stores and retrieves user preferences including keyboard shortcuts.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;
use tracing::{error, info, warn};

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

/// Auto cleanup deleted items setting
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum AutoCleanupDeleted {
    /// Disabled
    Disabled,
    /// 1 day
    OneDay,
    /// 7 days
    SevenDays,
    /// 30 days (1 month)
    ThirtyDays,
}

impl Default for AutoCleanupDeleted {
    fn default() -> Self {
        Self::Disabled
    }
}

impl AutoCleanupDeleted {
    /// Get the number of days, or None if disabled
    pub fn days(&self) -> Option<u32> {
        match self {
            Self::Disabled => None,
            Self::OneDay => Some(1),
            Self::SevenDays => Some(7),
            Self::ThirtyDays => Some(30),
        }
    }
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
    /// Auto cleanup deleted items after specified days
    #[serde(default)]
    pub auto_cleanup_deleted: AutoCleanupDeleted,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            search_shortcut: ShortcutConfig::default(),
            server_port: 21890,
            auto_start: false,
            theme: Theme::default(),
            auto_cleanup_deleted: AutoCleanupDeleted::default(),
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
            match fs::read_to_string(&settings_path) {
                Ok(content) => {
                    match serde_json::from_str(&content) {
                        Ok(settings) => settings,
                        Err(e) => {
                            // JSON 格式错误，备份原文件并使用默认设置
                            tracing::warn!(
                                "Settings file has invalid JSON format: {}. Using defaults and backing up original file.",
                                e
                            );

                            // 备份损坏的文件
                            let backup_path = settings_path.with_extension("json.bak");
                            if let Err(backup_err) = fs::copy(&settings_path, &backup_path) {
                                tracing::error!(
                                    "Failed to backup corrupted settings file: {}",
                                    backup_err
                                );
                            } else {
                                tracing::info!(
                                    "Backed up corrupted settings to: {:?}",
                                    backup_path
                                );
                            }

                            AppSettings::default()
                        }
                    }
                }
                Err(e) => {
                    // 文件读取失败，使用默认设置
                    tracing::warn!("Failed to read settings file: {}. Using defaults.", e);
                    AppSettings::default()
                }
            }
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

    /// Update auto cleanup deleted setting
    pub fn update_auto_cleanup_deleted(&mut self, cleanup: AutoCleanupDeleted) -> Result<(), SettingsError> {
        self.settings.auto_cleanup_deleted = cleanup;
        self.save()
    }

    /// Save settings to file
    fn save(&self) -> Result<(), SettingsError> {
        let content = serde_json::to_string_pretty(&self.settings)?;
        fs::write(&self.settings_path, content)?;
        Ok(())
    }
}
