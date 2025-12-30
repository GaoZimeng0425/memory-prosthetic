//! MCP (Model Context Protocol) server module
//!
//! Provides MCP protocol endpoint for AI assistants to interact with Memory Prosthetic.

pub mod error;
pub mod service;
pub mod tools;
pub mod transport;

pub use transport::create_mcp_router;
