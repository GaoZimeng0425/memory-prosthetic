//! Database module for SQLite storage
//!
//! Provides connection management and CRUD operations for collections.

mod connection;
mod collections;
mod embeddings;
mod favorites;
mod tags;
mod collection_tags;

pub use connection::{Database, DbError, init_database};
pub use collections::{
    Collection,
    CollectionListItem,
    CollectionRepository,
    CollectionStats,
    CollectionStatus,
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
pub use favorites::{
    Favorite,
    FavoriteRepository,
    CreateFavorite,
    UpdateFavorite,
};
pub use tags::{
    Tag,
    TagRepository,
    CreateTag,
    UpdateTag,
    TagSortOrder,
};
pub use collection_tags::CollectionTagRepository;
