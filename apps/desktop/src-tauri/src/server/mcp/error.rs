//! MCP error handling

use thiserror::Error;

/// MCP module errors
#[derive(Error, Debug)]
pub enum McpModuleError {
    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Method not found: {0}")]
    MethodNotFound(String),

    #[error("Invalid parameters: {0}")]
    InvalidParams(String),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Search error: {0}")]
    SearchError(String),
}
