#!/bin/bash
# Download all-MiniLM-L6-v2 ONNX model for embedding generation
# This script downloads the model files from Hugging Face

set -e

MODEL_NAME="all-MiniLM-L6-v2"
APP_ID="com.aa00930.memory-prosthetic"
MODEL_DIR="$HOME/Library/Application Support/$APP_ID/models/$MODEL_NAME"

echo "Downloading $MODEL_NAME model..."
echo "Target directory: $MODEL_DIR"

mkdir -p "$MODEL_DIR"

# Download model.onnx from Hugging Face
echo "Downloading model.onnx..."
curl -L "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx" \
  -o "$MODEL_DIR/model.onnx"

# Download tokenizer.json
echo "Downloading tokenizer.json..."
curl -L "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json" \
  -o "$MODEL_DIR/tokenizer.json"

echo ""
echo "Model downloaded successfully!"
echo "Model directory: $MODEL_DIR"
ls -la "$MODEL_DIR"
