//! Database module for SQLite storage
//!
//! Provides connection management and CRUD operations for collections.

mod connection;
mod collections;
mod embeddings;

pub use connection::{Database, DbError, init_database};
pub use collections::{
    Collection,
    CollectionListItem,
    CollectionRepository,
    CollectionStats,
    CreateCollection,
    EmbeddingStatus,
};
pub use embeddings::{
    CreateEmbedding,
    Embedding,
    EmbeddingsRepository,
    SearchResult,
    EMBEDDING_DIM,
};
