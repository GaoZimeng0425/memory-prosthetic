//! Embedding module for semantic vector generation
//!
//! Uses ONNX Runtime with all-MiniLM-L6-v2 model for generating
//! 384-dimensional sentence embeddings.

mod markdown_to_plaintext;
mod model;
mod service;
mod slate_to_plaintext;

pub use markdown_to_plaintext::markdown_to_plaintext;
pub use model::{EmbeddingError, EmbeddingModel, get_embedding_model, init_embedding_model};
pub use service::{EmbeddingMessage, EmbeddingService};
pub use slate_to_plaintext::slate_to_plaintext;

/// Embedding vector dimension (all-MiniLM-L6-v2)
pub const EMBEDDING_DIM: usize = 384;
