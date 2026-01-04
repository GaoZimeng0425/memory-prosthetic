//! Slate to Plain Text converter
//!
//! Converts Slate JSON format to plain text for embedding generation.
//! This is a Rust implementation of the TypeScript conversion tool from Story 2.6.

use serde_json::Value as JsonValue;
use tracing::warn;

/// Convert Slate JSON string to plain text
///
/// This function extracts all meaningful text content from Slate format,
/// removing formatting markers while preserving semantic information.
///
/// Special handling:
/// - Code blocks: Code text is preserved with context markers
/// - Tables: Converted to structured text with row/column relationships
/// - Lists: Converted to newline-separated text
/// - Links: Text and URL preserved if helpful
///
/// # Arguments
///
/// * `slate_json` - Slate value as JSON string
///
/// # Returns
///
/// Plain text representation suitable for Embedding generation
///
/// # Errors
///
/// Returns the original content if conversion fails (fallback)
pub fn slate_to_plaintext(slate_json: &str) -> String {
    // Parse JSON
    let value: JsonValue = match serde_json::from_str(slate_json) {
        Ok(v) => v,
        Err(e) => {
            warn!("Failed to parse Slate JSON: {}. Using original content.", e);
            return slate_json.to_string();
        }
    };

    // Extract text from Slate value
    let text = extract_text_from_value(&value);

    // Post-process to optimize for Embedding
    post_process_plaintext(&text)
}

/// Extract text from Slate JSON value
fn extract_text_from_value(value: &JsonValue) -> String {
    let mut parts = Vec::new();

    // Slate value is an array of nodes
    if let JsonValue::Array(nodes) = value {
        for node in nodes {
            extract_text_from_node(node, &mut parts);
        }
    }

    parts.join("")
}

/// Extract text from a Slate node
fn extract_text_from_node(node: &JsonValue, parts: &mut Vec<String>) {
    // Check if it's a text node
    if let Some(text) = node.get("text").and_then(|t| t.as_str()) {
        parts.push(text.to_string());
        return;
    }

    // Check if it's an element node with children
    if let Some(children) = node.get("children").and_then(|c| c.as_array()) {
        let node_type = node.get("type").and_then(|t| t.as_str()).unwrap_or("");

        // Handle special node types
        match node_type {
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
                // Headings: extract text, add newline after
                let text = extract_text_from_children(children);
                if !text.is_empty() {
                    parts.push(text);
                    parts.push("\n".to_string());
                }
            }
            "code_block" => {
                // Code blocks: preserve code text with context
                let code_text = extract_text_from_children(children);
                if !code_text.is_empty() {
                    parts.push("\n[代码块]\n".to_string());
                    parts.push(code_text);
                    parts.push("\n[/代码块]\n".to_string());
                }
            }
            "table" => {
                // Tables: convert to structured text
                let table_text = extract_table_text(node);
                if !table_text.is_empty() {
                    parts.push("\n".to_string());
                    parts.push(table_text);
                    parts.push("\n".to_string());
                }
            }
            "ul" | "ol" => {
                // Lists: convert to newline-separated text
                let list_text = extract_list_text(node);
                if !list_text.is_empty() {
                    parts.push(list_text);
                    parts.push("\n".to_string());
                }
            }
            "a" => {
                // Links: preserve text and URL
                let link_text = extract_text_from_children(children);
                if !link_text.is_empty() {
                    parts.push(link_text.clone());
                    if let Some(url) = node.get("url").and_then(|u| u.as_str()) {
                        if url != link_text {
                            parts.push(format!(" ({})", url));
                        }
                    }
                }
            }
            "p" | "blockquote" => {
                // Paragraphs and blockquotes: extract text, add newline
                let text = extract_text_from_children(children);
                if !text.is_empty() {
                    parts.push(text);
                    parts.push("\n".to_string());
                }
            }
            _ => {
                // Other elements: just extract text
                let text = extract_text_from_children(children);
                if !text.is_empty() {
                    parts.push(text);
                }
            }
        }
    }
}

/// Extract text from children nodes recursively
fn extract_text_from_children(children: &[JsonValue]) -> String {
    let mut parts = Vec::new();

    for child in children {
        if let Some(text) = child.get("text").and_then(|t| t.as_str()) {
            parts.push(text.to_string());
        } else if let Some(grandchildren) = child.get("children").and_then(|c| c.as_array()) {
            parts.push(extract_text_from_children(grandchildren));
        }
    }

    parts.join("")
}

/// Extract text from table node, preserving row/column structure
fn extract_table_text(table_node: &JsonValue) -> String {
    let mut rows = Vec::new();

    if let Some(children) = table_node.get("children").and_then(|c| c.as_array()) {
        for row in children {
            if let Some(cells) = row.get("children").and_then(|c| c.as_array()) {
                let mut cell_texts = Vec::new();
                for cell in cells {
                    let cell_text = extract_text_from_children(
                        cell.get("children")
                            .and_then(|c| c.as_array())
                            .map_or(&[] as &[JsonValue], |arr| arr.as_slice()),
                    );
                    cell_texts.push(cell_text.trim().to_string());
                }
                if !cell_texts.is_empty() {
                    rows.push(cell_texts.join(" | "));
                }
            }
        }
    }

    rows.join("\n")
}

/// Extract text from list node, preserving list structure
fn extract_list_text(list_node: &JsonValue) -> String {
    let mut items = Vec::new();

    if let Some(children) = list_node.get("children").and_then(|c| c.as_array()) {
        for item in children {
            if let Some(item_children) = item.get("children").and_then(|c| c.as_array()) {
                let item_text = extract_text_from_children(item_children);
                if !item_text.trim().is_empty() {
                    items.push(format!("- {}", item_text.trim()));
                }
            }
        }
    }

    items.join("\n")
}

/// Post-process plain text to optimize for Embedding generation
///
/// - Normalize whitespace
/// - Ensure proper spacing between elements
/// - Remove excessive newlines
fn post_process_plaintext(text: &str) -> String {
    text.replace('\n', "\n") // Normalize newlines
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
        .replace("\n\n\n", "\n\n") // Normalize multiple newlines (3+ → 2)
        .replace("  ", " ") // Normalize multiple spaces to single space
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_text() {
        let slate_json = r#"[{"type":"p","children":[{"text":"Hello world"}]}]"#;
        let result = slate_to_plaintext(slate_json);
        assert!(result.contains("Hello world"));
    }

    #[test]
    fn test_heading() {
        let slate_json = r#"[{"type":"h1","children":[{"text":"Title"}]}]"#;
        let result = slate_to_plaintext(slate_json);
        assert!(result.contains("Title"));
    }

    #[test]
    fn test_code_block() {
        let slate_json = r#"[{"type":"code_block","children":[{"text":"const x = 1;"}]}]"#;
        let result = slate_to_plaintext(slate_json);
        assert!(result.contains("[代码块]"));
        assert!(result.contains("const x = 1;"));
        assert!(result.contains("[/代码块]"));
    }

    #[test]
    fn test_invalid_json() {
        let invalid_json = "not json";
        let result = slate_to_plaintext(invalid_json);
        assert_eq!(result, invalid_json);
    }
}
