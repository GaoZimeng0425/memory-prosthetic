//! Event System
//!
//! Provides event broadcasting for real-time UI updates.
//! Used to eliminate polling and enable optimistic updates.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::error::CommandError;

/// Collection-related events for real-time updates
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CollectionEvent {
    /// Collection was created
    Created { id: i64 },
    /// Collection was updated
    Updated { id: i64 },
    /// Collection was deleted
    Deleted { id: i64 },
    /// Collection's favorite was changed
    FavoriteChanged { id: i64, favorite_id: Option<i64> },
    /// Collection's starred status was toggled
    StarToggled { id: i64, starred: bool },
    /// Collection was archived
    Archived { id: i64 },
    /// Collection was restored
    Restored { id: i64 },
    /// Collection's tags were changed
    TagsChanged { id: i64 },
}

impl CollectionEvent {
    /// Broadcast this event to all frontend windows
    pub fn broadcast(&self, app: &AppHandle) -> Result<(), CommandError> {
        app.emit("collection-event", self)
            .map_err(|e| CommandError {
                code: "EVENT_BROADCAST_FAILED".to_string(),
                message: format!("Failed to broadcast event: {}", e),
            })?;
        Ok(())
    }

    /// Get the collection ID associated with this event
    pub fn collection_id(&self) -> i64 {
        match self {
            CollectionEvent::Created { id } => *id,
            CollectionEvent::Updated { id } => *id,
            CollectionEvent::Deleted { id } => *id,
            CollectionEvent::FavoriteChanged { id, .. } => *id,
            CollectionEvent::StarToggled { id, .. } => *id,
            CollectionEvent::Archived { id } => *id,
            CollectionEvent::Restored { id } => *id,
            CollectionEvent::TagsChanged { id } => *id,
        }
    }
}
