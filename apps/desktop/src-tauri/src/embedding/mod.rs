//! Embedding module for semantic vector generation
//!
//! Uses ONNX Runtime with all-MiniLM-L6-v2 model for generating
//! 384-dimensional sentence embeddings.

mod model;
mod service;

pub use model::{EmbeddingError, EmbeddingModel, get_embedding_model, init_embedding_model};
pub use service::{EmbeddingMessage, EmbeddingService};

/// Embedding vector dimension (all-MiniLM-L6-v2)
pub const EMBEDDING_DIM: usize = 384;
