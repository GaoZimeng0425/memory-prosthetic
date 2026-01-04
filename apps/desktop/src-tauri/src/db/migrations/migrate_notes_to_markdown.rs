//! Migration script to convert notes from Slate JSON to Markdown format
//!
//! This migration converts existing notes (type='笔记' or url IS NULL) from
//! Slate JSON format to Markdown format for unified storage.

use crate::db::{Database, DbError};
use rusqlite::params;
use serde_json::Value as JsonValue;
use tracing::{error, info, warn};

/// Migrate notes from Slate JSON to Markdown format
///
/// This function:
/// 1. Finds all notes (url IS NULL or type='笔记')
/// 2. Checks if content is Slate JSON format
/// 3. Converts Slate JSON to Markdown using a simple conversion
/// 4. Updates the content field
///
/// # Returns
///
/// Number of notes migrated, or error if migration fails
pub fn migrate_notes_to_markdown(db: &Database) -> Result<usize, DbError> {
    db.with_connection(|conn| {
        // Get all notes (url IS NULL or type='笔记')
        let mut stmt = conn.prepare(
            r#"
            SELECT id, content, type
            FROM collections
            WHERE url IS NULL OR type = '笔记'
            "#,
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        })?;

        let mut migrated_count = 0;
        let mut skipped_count = 0;
        let mut error_count = 0;

        for row_result in rows {
            match row_result {
                Ok((id, content, note_type)) => {
                    // Check if content is Slate JSON format
                    if is_slate_json(&content) {
                        match convert_slate_to_markdown(&content) {
                            Ok(markdown) => {
                                // Update the content
                                match conn.execute(
                                    "UPDATE collections SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
                                    params![markdown, id],
                                ) {
                                    Ok(_) => {
                                        migrated_count += 1;
                                        info!("Migrated note {} from Slate JSON to Markdown", id);
                                    }
                                    Err(e) => {
                                        error_count += 1;
                                        error!("Failed to update note {}: {}", id, e);
                                    }
                                }
                            }
                            Err(e) => {
                                error_count += 1;
                                error!("Failed to convert note {} from Slate JSON to Markdown: {}", id, e);
                            }
                        }
                    } else {
                        // Already Markdown or other format, skip
                        skipped_count += 1;
                        info!("Note {} already in Markdown format, skipping", id);
                    }
                }
                Err(e) => {
                    error_count += 1;
                    error!("Failed to read note row: {}", e);
                }
            }
        }

        info!(
            "Migration completed: {} migrated, {} skipped, {} errors",
            migrated_count, skipped_count, error_count
        );

        Ok(migrated_count)
    })
}

/// Check if content is Slate JSON format
fn is_slate_json(content: &str) -> bool {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return false;
    }

    // Check if it's JSON (starts with [ or {)
    if trimmed.starts_with('[') || trimmed.starts_with('{') {
        // Try to parse as JSON
        if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(content) {
            // Check if it looks like Slate format (array of objects with 'children' property)
            if let Some(array) = json_value.as_array() {
                if !array.is_empty() {
                    if let Some(first) = array.first() {
                        if first.is_object() && first.get("children").is_some() {
                            return true; // Looks like Slate format
                        }
                    }
                }
            }
        }
    }

    false
}

/// Convert Slate JSON to Markdown
///
/// This is a simplified conversion that handles common Slate node types.
/// For a complete conversion, we would need to use the same logic as the TypeScript converter.
fn convert_slate_to_markdown(slate_json: &str) -> Result<String, String> {
    let value: serde_json::Value = serde_json::from_str(slate_json)
        .map_err(|e| format!("Failed to parse Slate JSON: {}", e))?;

    let mut markdown_parts = Vec::new();

    if let Some(nodes) = value.as_array() {
        for node in nodes {
            markdown_parts.push(convert_node_to_markdown(node)?);
        }
    }

    Ok(markdown_parts.join("\n\n"))
}

/// Convert a Slate node to Markdown
fn convert_node_to_markdown(node: &serde_json::Value) -> Result<String, String> {
    if let Some(children) = node.get("children").and_then(|c| c.as_array()) {
        let node_type = node.get("type").and_then(|t| t.as_str()).unwrap_or("p");
        let text = extract_text_from_children(children);

        match node_type {
            "h1" => Ok(format!("# {}", text)),
            "h2" => Ok(format!("## {}", text)),
            "h3" => Ok(format!("### {}", text)),
            "h4" => Ok(format!("#### {}", text)),
            "h5" => Ok(format!("##### {}", text)),
            "h6" => Ok(format!("###### {}", text)),
            "blockquote" => Ok(format!("> {}", text)),
            "code_block" => {
                let lang = node.get("lang").and_then(|l| l.as_str()).unwrap_or("");
                if lang.is_empty() {
                    Ok(format!("```\n{}\n```", text))
                } else {
                    Ok(format!("```{}\n{}\n```", lang, text))
                }
            }
            "ul" | "ol" => {
                let mut items = Vec::new();
                for item in children {
                    if let Some(item_children) = item.get("children").and_then(|c| c.as_array()) {
                        let item_text = extract_text_from_children(item_children);
                        if !item_text.trim().is_empty() {
                            items.push(format!("- {}", item_text.trim()));
                        }
                    }
                }
                Ok(items.join("\n"))
            }
            "p" => Ok(text),
            _ => Ok(text), // Default: just extract text
        }
    } else {
        Ok(String::new())
    }
}

/// Extract text from children nodes recursively
fn extract_text_from_children(children: &[serde_json::Value]) -> String {
    let mut parts = Vec::new();

    for child in children {
        if let Some(text) = child.get("text").and_then(|t| t.as_str()) {
            // Apply marks (bold, italic, etc.)
            let mut formatted_text = text.to_string();
            if child.get("bold").and_then(|b| b.as_bool()).unwrap_or(false) {
                formatted_text = format!("**{}**", formatted_text);
            }
            if child.get("italic").and_then(|i| i.as_bool()).unwrap_or(false) {
                formatted_text = format!("*{}*", formatted_text);
            }
            if child.get("code").and_then(|c| c.as_bool()).unwrap_or(false) {
                formatted_text = format!("`{}`", formatted_text);
            }
            parts.push(formatted_text);
        } else if let Some(grandchildren) = child.get("children").and_then(|c| c.as_array()) {
            parts.push(extract_text_from_children(grandchildren));
        } else if let Some(link_type) = child.get("type").and_then(|t| t.as_str()) {
            if link_type == "a" {
                if let Some(link_children) = child.get("children").and_then(|c| c.as_array()) {
                    let link_text = extract_text_from_children(link_children);
                    if let Some(url) = child.get("url").and_then(|u| u.as_str()) {
                        parts.push(format!("[{}]({})", link_text, url));
                    } else {
                        parts.push(link_text);
                    }
                }
            }
        }
    }

    parts.join("")
}
