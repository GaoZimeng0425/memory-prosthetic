//! Embeddings repository for vector storage and retrieval

use super::{Database, DbError};
use serde::{Deserialize, Serialize};

/// Embedding dimension (all-MiniLM-L6-v2)
pub const EMBEDDING_DIM: usize = 384;

/// Embedding record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Embedding {
    pub id: i64,
    pub collection_id: i64,
    pub vector: Vec<f32>,
    pub created_at: String,
}

/// Create embedding input
pub struct CreateEmbedding {
    pub collection_id: i64,
    pub vector: Vec<f32>,
}

/// Search result with similarity score
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub collection_id: i64,
    pub similarity: f32,
}

/// Embeddings repository
pub struct EmbeddingsRepository<'a> {
    db: &'a Database,
}

impl<'a> EmbeddingsRepository<'a> {
    pub fn new(db: &'a Database) -> Self {
        Self { db }
    }

    /// Insert or update an embedding
    pub fn upsert(&self, input: &CreateEmbedding) -> Result<i64, DbError> {
        if input.vector.len() != EMBEDDING_DIM {
            return Err(DbError::Lock(format!(
                "Invalid vector dimension: expected {}, got {}",
                EMBEDDING_DIM,
                input.vector.len()
            )));
        }

        // Convert f32 vector to bytes
        let vector_bytes = vector_to_bytes(&input.vector);

        self.db.with_connection(|conn| {
            conn.execute(
                r#"
                INSERT INTO embeddings (collection_id, vector)
                VALUES (?1, ?2)
                ON CONFLICT(collection_id) DO UPDATE SET
                    vector = excluded.vector,
                    created_at = datetime('now')
                "#,
                rusqlite::params![input.collection_id, vector_bytes],
            )?;

            Ok(conn.last_insert_rowid())
        })
    }

    /// Get embedding by collection ID
    pub fn get_by_collection_id(&self, collection_id: i64) -> Result<Option<Embedding>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, collection_id, vector, created_at
                FROM embeddings
                WHERE collection_id = ?1
                "#,
            )?;

            let mut rows = stmt.query([collection_id])?;

            if let Some(row) = rows.next()? {
                let vector_bytes: Vec<u8> = row.get(2)?;
                Ok(Some(Embedding {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    vector: bytes_to_vector(&vector_bytes),
                    created_at: row.get(3)?,
                }))
            } else {
                Ok(None)
            }
        })
    }

    /// Delete embedding by collection ID
    pub fn delete_by_collection_id(&self, collection_id: i64) -> Result<bool, DbError> {
        self.db.with_connection(|conn| {
            let rows_affected = conn.execute(
                "DELETE FROM embeddings WHERE collection_id = ?1",
                [collection_id],
            )?;
            Ok(rows_affected > 0)
        })
    }

    /// Get all embeddings for similarity search
    pub fn get_all(&self) -> Result<Vec<Embedding>, DbError> {
        self.db.with_connection(|conn| {
            let mut stmt = conn.prepare(
                r#"
                SELECT id, collection_id, vector, created_at
                FROM embeddings
                "#,
            )?;

            let rows = stmt.query_map([], |row| {
                let vector_bytes: Vec<u8> = row.get(2)?;
                Ok(Embedding {
                    id: row.get(0)?,
                    collection_id: row.get(1)?,
                    vector: bytes_to_vector(&vector_bytes),
                    created_at: row.get(3)?,
                })
            })?;

            let mut embeddings = Vec::new();
            for row in rows {
                embeddings.push(row?);
            }
            Ok(embeddings)
        })
    }

    /// Search for similar embeddings using cosine similarity
    /// Returns top-k results sorted by similarity (descending)
    pub fn search(&self, query_vector: &[f32], top_k: usize) -> Result<Vec<SearchResult>, DbError> {
        let all_embeddings = self.get_all()?;

        let mut results: Vec<SearchResult> = all_embeddings
            .iter()
            .map(|e| SearchResult {
                collection_id: e.collection_id,
                similarity: cosine_similarity(query_vector, &e.vector),
            })
            .collect();

        // Sort by similarity descending
        results.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal));

        // Take top-k
        results.truncate(top_k);

        Ok(results)
    }

    /// Count total embeddings
    pub fn count(&self) -> Result<i64, DbError> {
        self.db.with_connection(|conn| {
            let count: i64 = conn.query_row("SELECT COUNT(*) FROM embeddings", [], |row| row.get(0))?;
            Ok(count)
        })
    }
}

/// Convert f32 vector to bytes (little-endian)
fn vector_to_bytes(vector: &[f32]) -> Vec<u8> {
    vector.iter().flat_map(|f| f.to_le_bytes()).collect()
}

/// Convert bytes to f32 vector (little-endian)
fn bytes_to_vector(bytes: &[u8]) -> Vec<f32> {
    bytes
        .chunks_exact(4)
        .map(|chunk| {
            let arr: [u8; 4] = chunk.try_into().expect("Invalid chunk size");
            f32::from_le_bytes(arr)
        })
        .collect()
}

/// Calculate cosine similarity between two vectors
fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot / (norm_a * norm_b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector_conversion() {
        let vector = vec![1.0f32, 2.0, 3.0, 4.0];
        let bytes = vector_to_bytes(&vector);
        let recovered = bytes_to_vector(&bytes);

        assert_eq!(vector.len(), recovered.len());
        for (a, b) in vector.iter().zip(recovered.iter()) {
            assert!((a - b).abs() < 1e-6);
        }
    }

    #[test]
    fn test_cosine_similarity() {
        // Same vector should have similarity 1.0
        let v1 = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&v1, &v1) - 1.0).abs() < 1e-6);

        // Orthogonal vectors should have similarity 0.0
        let v2 = vec![0.0, 1.0, 0.0];
        assert!((cosine_similarity(&v1, &v2) - 0.0).abs() < 1e-6);

        // Opposite vectors should have similarity -1.0
        let v3 = vec![-1.0, 0.0, 0.0];
        assert!((cosine_similarity(&v1, &v3) - (-1.0)).abs() < 1e-6);
    }
}
