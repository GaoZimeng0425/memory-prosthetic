//! Embedding service for background embedding generation
//!
//! Processes collections with pending embedding status and generates
//! embeddings in the background.

use crate::db::{
    CollectionRepository, CreateEmbedding, EmbeddingsRepository, EmbeddingStatus, Database,
};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use super::model::get_embedding_model;

/// Message for embedding service
pub enum EmbeddingMessage {
    /// Process a specific collection
    ProcessCollection(i64),
    /// Process all pending collections
    ProcessPending,
    /// Shutdown the service
    Shutdown,
}

/// Embedding service handle
pub struct EmbeddingService {
    tx: mpsc::Sender<EmbeddingMessage>,
}

impl EmbeddingService {
    /// Start the embedding service
    pub fn start(db: Arc<Database>) -> Self {
        let (tx, mut rx) = mpsc::channel::<EmbeddingMessage>(100);

        // Spawn background task
        tokio::spawn(async move {
            info!("Embedding service started");

            loop {
                tokio::select! {
                    msg = rx.recv() => {
                        match msg {
                            Some(EmbeddingMessage::ProcessCollection(id)) => {
                                process_collection(&db, id).await;
                            }
                            Some(EmbeddingMessage::ProcessPending) => {
                                process_pending(&db).await;
                            }
                            Some(EmbeddingMessage::Shutdown) | None => {
                                info!("Embedding service shutting down");
                                break;
                            }
                        }
                    }
                    // Process pending every 30 seconds
                    _ = tokio::time::sleep(Duration::from_secs(30)) => {
                        process_pending(&db).await;
                    }
                }
            }
        });

        Self { tx }
    }

    /// Queue a collection for embedding generation
    pub async fn queue_collection(&self, collection_id: i64) {
        if let Err(e) = self.tx.send(EmbeddingMessage::ProcessCollection(collection_id)).await {
            error!("Failed to queue collection for embedding: {}", e);
        }
    }

    /// Trigger processing of all pending collections
    pub async fn process_pending(&self) {
        if let Err(e) = self.tx.send(EmbeddingMessage::ProcessPending).await {
            error!("Failed to trigger pending processing: {}", e);
        }
    }

    /// Shutdown the service
    pub async fn shutdown(&self) {
        let _ = self.tx.send(EmbeddingMessage::Shutdown).await;
    }
}

/// Process a single collection
async fn process_collection(db: &Database, collection_id: i64) {
    let model = match get_embedding_model() {
        Some(m) => m,
        None => {
            warn!("Embedding model not available, skipping collection {}", collection_id);
            return;
        }
    };

    // Get collection
    let collection = {
        let repo = CollectionRepository::new(db);
        match repo.get_by_id(collection_id) {
            Ok(Some(c)) => c,
            Ok(None) => {
                warn!("Collection {} not found", collection_id);
                return;
            }
            Err(e) => {
                error!("Failed to get collection {}: {}", collection_id, e);
                return;
            }
        }
    };

    // Update status to processing
    {
        let repo = CollectionRepository::new(db);
        if let Err(e) = repo.update_embedding_status(collection_id, &EmbeddingStatus::Processing) {
            error!("Failed to update status for collection {}: {}", collection_id, e);
            return;
        }
    }

    // Generate embedding text (title + content)
    let text = format!("{}\n\n{}", collection.title, collection.content);

    // Generate embedding
    let embedding = {
        let mut model_guard = match model.lock() {
            Ok(g) => g,
            Err(e) => {
                error!("Failed to lock embedding model: {}", e);
                let repo = CollectionRepository::new(db);
                let _ = repo.update_embedding_status(collection_id, &EmbeddingStatus::Failed);
                return;
            }
        };

        match model_guard.encode(&text) {
            Ok(e) => e,
            Err(e) => {
                error!("Failed to generate embedding for collection {}: {}", collection_id, e);
                let repo = CollectionRepository::new(db);
                let _ = repo.update_embedding_status(collection_id, &EmbeddingStatus::Failed);
                return;
            }
        }
    };

    // Store embedding
    {
        let repo = EmbeddingsRepository::new(db);
        if let Err(e) = repo.upsert(&CreateEmbedding {
            collection_id,
            vector: embedding,
        }) {
            error!("Failed to store embedding for collection {}: {}", collection_id, e);
            let coll_repo = CollectionRepository::new(db);
            let _ = coll_repo.update_embedding_status(collection_id, &EmbeddingStatus::Failed);
            return;
        }
    }

    // Update status to done
    {
        let repo = CollectionRepository::new(db);
        if let Err(e) = repo.update_embedding_status(collection_id, &EmbeddingStatus::Done) {
            error!("Failed to update status for collection {}: {}", collection_id, e);
            return;
        }
    }

    info!("Generated embedding for collection {}", collection_id);
}

/// Process all pending collections
async fn process_pending(db: &Database) {
    let model = match get_embedding_model() {
        Some(_) => true,
        None => {
            // No model available, skip
            return;
        }
    };

    if !model {
        return;
    }

    // Get pending collections
    let pending = {
        let repo = CollectionRepository::new(db);
        match repo.get_pending_embeddings(10) {
            Ok(p) => p,
            Err(e) => {
                error!("Failed to get pending collections: {}", e);
                return;
            }
        }
    };

    if pending.is_empty() {
        return;
    }

    info!("Processing {} pending collections", pending.len());

    for collection in pending {
        process_collection(db, collection.id).await;
    }
}
