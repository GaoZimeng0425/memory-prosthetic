//! Error types for the application.

use serde::{Deserialize, Serialize};

/// Command error for error responses
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommandError {
    pub code: String,
    pub message: String,
}

impl CommandError {
    pub fn invalid_algorithm(algorithm: &str) -> Self {
        CommandError {
            code: "INVALID_ALGORITHM".to_string(),
            message: format!("Unknown clustering algorithm: {}", algorithm),
        }
    }
}
