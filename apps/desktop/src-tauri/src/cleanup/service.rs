//! Cleanup service for automatically removing old deleted items
//!
//! Periodically checks and permanently deletes collections that have been
//! in the deleted state for longer than the configured retention period.

use crate::db::{CollectionRepository, Database};
use crate::settings::SettingsManager;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{error, info};

/// Cleanup service handle
pub struct CleanupService {
    db: Arc<Database>,
    settings: Arc<Mutex<SettingsManager>>,
}

impl CleanupService {
    /// Create a new cleanup service
    pub fn new(db: Arc<Database>, settings: Arc<Mutex<SettingsManager>>) -> Self {
        Self { db, settings }
    }

    /// Start the cleanup service
    pub fn start(self) {
        tokio::spawn(async move {
            info!("Cleanup service started");

            // Run cleanup immediately on startup
            self.run_cleanup().await;

            // Then run every hour
            let mut interval = tokio::time::interval(Duration::from_secs(3600));
            loop {
                interval.tick().await;
                self.run_cleanup().await;
            }
        });
    }

    /// Run cleanup based on current settings
    async fn run_cleanup(&self) {
        let settings = {
            let settings_manager = self.settings.lock().unwrap();
            settings_manager.get().clone()
        };

        let days = match settings.auto_cleanup_deleted.days() {
            Some(d) => d,
            None => {
                // Cleanup is disabled, skip
                return;
            }
        };

        let repo = CollectionRepository::new(&self.db);
        match repo.cleanup_deleted_older_than(days) {
            Ok(count) => {
                if count > 0 {
                    info!("Cleanup completed: permanently deleted {} old items", count);
                }
            }
            Err(e) => {
                error!("Cleanup failed: {}", e);
            }
        }
    }
}
