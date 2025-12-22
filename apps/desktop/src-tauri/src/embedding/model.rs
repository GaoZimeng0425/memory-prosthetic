//! Embedding model implementation using ONNX Runtime
//!
//! Model: all-MiniLM-L6-v2
//! - Input: Text string
//! - Output: 384-dimensional f32 vector

use ndarray::{Array1, Array2, ArrayD};
use ort::session::{builder::GraphOptimizationLevel, Session};
use ort::session::SessionInputValue;
use ort::value::Value;
use std::path::PathBuf;
use std::sync::Arc;
use thiserror::Error;
use tokenizers::Tokenizer;
use tracing::{info, warn};

use super::EMBEDDING_DIM;

/// Embedding errors
#[derive(Error, Debug)]
pub enum EmbeddingError {
    #[error("Model not found at: {0}")]
    ModelNotFound(PathBuf),

    #[error("Tokenizer not found at: {0}")]
    TokenizerNotFound(PathBuf),

    #[error("ONNX runtime error: {0}")]
    OrtError(String),

    #[error("Tokenizer error: {0}")]
    TokenizerError(String),

    #[error("Model not initialized")]
    NotInitialized,

    #[error("Inference error: {0}")]
    InferenceError(String),
}

impl From<ort::Error> for EmbeddingError {
    fn from(e: ort::Error) -> Self {
        EmbeddingError::OrtError(e.to_string())
    }
}

/// Embedding model wrapper
pub struct EmbeddingModel {
    session: Session,
    tokenizer: Tokenizer,
}

impl EmbeddingModel {
    /// Create a new embedding model from model directory
    pub fn new(model_dir: PathBuf) -> Result<Self, EmbeddingError> {
        let model_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        if !model_path.exists() {
            return Err(EmbeddingError::ModelNotFound(model_path));
        }

        if !tokenizer_path.exists() {
            return Err(EmbeddingError::TokenizerNotFound(tokenizer_path));
        }

        info!("Loading embedding model from: {:?}", model_dir);

        // Load ONNX model from file
        let model_bytes = std::fs::read(&model_path)
            .map_err(|e| EmbeddingError::OrtError(format!("Failed to read model: {}", e)))?;

        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_memory(&model_bytes)?;

        info!("ONNX model loaded successfully");

        // Load tokenizer
        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| EmbeddingError::TokenizerError(e.to_string()))?;

        info!("Tokenizer loaded successfully");

        Ok(Self { session, tokenizer })
    }

    /// Generate embedding for a single text
    pub fn encode(&mut self, text: &str) -> Result<Vec<f32>, EmbeddingError> {
        let embeddings = self.encode_batch(&[text])?;
        Ok(embeddings.into_iter().next().unwrap())
    }

    /// Generate embeddings for a batch of texts
    pub fn encode_batch(&mut self, texts: &[&str]) -> Result<Vec<Vec<f32>>, EmbeddingError> {
        if texts.is_empty() {
            return Ok(vec![]);
        }

        // Tokenize
        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| EmbeddingError::TokenizerError(e.to_string()))?;

        let batch_size = encodings.len();
        let max_len = encodings.iter().map(|e| e.len()).max().unwrap_or(0);

        // Prepare input tensors
        let mut input_ids: Vec<i64> = Vec::with_capacity(batch_size * max_len);
        let mut attention_mask: Vec<i64> = Vec::with_capacity(batch_size * max_len);
        let mut token_type_ids: Vec<i64> = Vec::with_capacity(batch_size * max_len);

        for encoding in &encodings {
            let ids = encoding.get_ids();
            let mask = encoding.get_attention_mask();
            let type_ids = encoding.get_type_ids();

            // Pad to max_len
            for i in 0..max_len {
                if i < ids.len() {
                    input_ids.push(ids[i] as i64);
                    attention_mask.push(mask[i] as i64);
                    token_type_ids.push(type_ids[i] as i64);
                } else {
                    input_ids.push(0);
                    attention_mask.push(0);
                    token_type_ids.push(0);
                }
            }
        }

        // Create ndarray tensors and convert to dynamic
        let input_ids_array =
            Array2::from_shape_vec((batch_size, max_len), input_ids).expect("Invalid shape");
        let attention_mask_array =
            Array2::from_shape_vec((batch_size, max_len), attention_mask).expect("Invalid shape");
        let token_type_ids_array =
            Array2::from_shape_vec((batch_size, max_len), token_type_ids).expect("Invalid shape");

        // Convert to owned dynamic arrays
        let input_ids_dyn: ArrayD<i64> = input_ids_array.into_dyn();
        let attention_mask_dyn: ArrayD<i64> = attention_mask_array.into_dyn();
        let token_type_ids_dyn: ArrayD<i64> = token_type_ids_array.into_dyn();

        // Create ORT values
        let input_ids_value = Value::from_array(input_ids_dyn)?;
        let attention_mask_value = Value::from_array(attention_mask_dyn)?;
        let token_type_ids_value = Value::from_array(token_type_ids_dyn)?;

        // Run inference
        let inputs: Vec<(&str, SessionInputValue<'_>)> = vec![
            ("input_ids", SessionInputValue::from(input_ids_value)),
            ("attention_mask", SessionInputValue::from(attention_mask_value)),
            ("token_type_ids", SessionInputValue::from(token_type_ids_value)),
        ];
        let outputs = self.session.run(inputs)?;

        // Extract embeddings from output
        let output = outputs
            .get("last_hidden_state")
            .ok_or_else(|| EmbeddingError::InferenceError("Missing output".to_string()))?;

        let output_tensor = output
            .try_extract_tensor::<f32>()
            .map_err(|e| EmbeddingError::InferenceError(e.to_string()))?;

        // Get shape and data
        let (shape, data) = output_tensor;
        // Shape is [batch_size, seq_len, hidden_dim]
        let hidden_dim = EMBEDDING_DIM; // We know it's 384 for all-MiniLM-L6-v2
        let _ = shape; // Shape info not needed since we know the model dimensions

        // Mean pooling with attention mask
        let mut embeddings = Vec::with_capacity(batch_size);

        for batch_idx in 0..batch_size {
            let encoding = &encodings[batch_idx];
            let seq_len = encoding.len();

            // Get the token embeddings for this sequence
            let mut sum = Array1::<f32>::zeros(EMBEDDING_DIM);
            let mut count = 0.0f32;

            for token_idx in 0..seq_len {
                if encoding.get_attention_mask()[token_idx] == 1 {
                    for dim in 0..EMBEDDING_DIM {
                        let idx = batch_idx * max_len * hidden_dim + token_idx * hidden_dim + dim;
                        if idx < data.len() {
                            sum[dim] += data[idx];
                        }
                    }
                    count += 1.0;
                }
            }

            // Mean pool
            if count > 0.0 {
                sum /= count;
            }

            // L2 normalize
            let norm: f32 = sum.iter().map(|x| x * x).sum::<f32>().sqrt();
            if norm > 0.0 {
                sum /= norm;
            }

            embeddings.push(sum.to_vec());
        }

        Ok(embeddings)
    }
}

use std::sync::Mutex;

/// Global embedding model instance (wrapped in Mutex for thread-safe mutable access)
static EMBEDDING_MODEL: once_cell::sync::OnceCell<Arc<Mutex<EmbeddingModel>>> =
    once_cell::sync::OnceCell::new();

/// Initialize the global embedding model
pub fn init_embedding_model(model_dir: PathBuf) -> Result<(), EmbeddingError> {
    if !model_dir.exists() {
        warn!(
            "Embedding model directory not found: {:?}. Semantic search will be disabled.",
            model_dir
        );
        return Ok(());
    }

    let model = EmbeddingModel::new(model_dir)?;
    EMBEDDING_MODEL
        .set(Arc::new(Mutex::new(model)))
        .map_err(|_| EmbeddingError::TokenizerError("Model already initialized".to_string()))?;

    info!("Embedding model initialized globally");
    Ok(())
}

/// Get the global embedding model
#[allow(dead_code)]
pub fn get_embedding_model() -> Option<Arc<Mutex<EmbeddingModel>>> {
    EMBEDDING_MODEL.get().cloned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_dim() {
        assert_eq!(EMBEDDING_DIM, 384);
    }
}
