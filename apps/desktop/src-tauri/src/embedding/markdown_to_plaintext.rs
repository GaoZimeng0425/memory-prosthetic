//! Markdown to Plain Text converter
//!
//! Converts Markdown format to plain text for embedding generation.
//! This is a simpler conversion since Markdown is already text-based.

use regex::Regex;
use tracing::warn;

/// Convert Markdown string to plain text
///
/// This function extracts all meaningful text content from Markdown,
/// removing formatting markers while preserving semantic information.
///
/// # Arguments
///
/// * `markdown` - Markdown string
///
/// # Returns
///
/// Plain text representation suitable for Embedding generation
pub fn markdown_to_plaintext(markdown: &str) -> String {
    if markdown.is_empty() {
        return String::new();
    }

    let mut text = markdown.to_string();

    // Remove code blocks (preserve content but remove markers)
    // Match ```language\ncode\n``` or ```\ncode\n```
    let code_block_re = Regex::new(r"```[\w]*\n([\s\S]*?)```").unwrap();
    text = code_block_re.replace_all(&text, |caps: &regex::Captures| {
        format!("\n[代码块]\n{}\n[/代码块]\n", &caps[1])
    }).to_string();

    // Remove inline code (preserve content)
    let inline_code_re = Regex::new(r"`([^`]+)`").unwrap();
    text = inline_code_re.replace_all(&text, "$1").to_string();

    // Remove images but keep alt text
    let image_re = Regex::new(r"!\[([^\]]*)\]\([^\)]+\)").unwrap();
    text = image_re.replace_all(&text, "$1").to_string();

    // Remove links but keep link text
    let link_re = Regex::new(r"\[([^\]]+)\]\([^\)]+\)").unwrap();
    text = link_re.replace_all(&text, "$1").to_string();

    // Remove headers (keep text, remove #)
    let header_re = Regex::new(r"^#{1,6}\s+(.+)$").unwrap();
    text = header_re.replace_all(&text, "$1\n").to_string();

    // Remove bold/italic markers
    let bold_re = Regex::new(r"\*\*([^\*]+)\*\*").unwrap();
    text = bold_re.replace_all(&text, "$1").to_string();
    let italic_re = Regex::new(r"\*([^\*]+)\*").unwrap();
    text = italic_re.replace_all(&text, "$1").to_string();
    let underline_re = Regex::new(r"_([^_]+)_").unwrap();
    text = underline_re.replace_all(&text, "$1").to_string();

    // Remove blockquotes (keep text, remove >)
    let blockquote_re = Regex::new(r"^>\s+(.+)$").unwrap();
    text = blockquote_re.replace_all(&text, "$1\n").to_string();

    // Remove horizontal rules
    text = text.replace("---", "").replace("***", "").replace("___", "");

    // Remove list markers (keep text)
    let list_re = Regex::new(r"^[\s]*[-*+]\s+(.+)$").unwrap();
    text = list_re.replace_all(&text, "$1\n").to_string();
    let numbered_list_re = Regex::new(r"^[\s]*\d+\.\s+(.+)$").unwrap();
    text = numbered_list_re.replace_all(&text, "$1\n").to_string();

    // Remove table markers (keep content)
    text = text.replace("|", " ");

    // Post-process to optimize for Embedding
    post_process_plaintext(&text)
}

/// Post-process plain text to optimize for Embedding generation
///
/// - Normalize whitespace
/// - Ensure proper spacing between elements
/// - Remove excessive newlines
fn post_process_plaintext(text: &str) -> String {
    text.lines()
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
        let markdown = "Hello world";
        let result = markdown_to_plaintext(markdown);
        assert!(result.contains("Hello world"));
    }

    #[test]
    fn test_heading() {
        let markdown = "# Title";
        let result = markdown_to_plaintext(markdown);
        assert!(result.contains("Title"));
    }

    #[test]
    fn test_code_block() {
        let markdown = "```\nconst x = 1;\n```";
        let result = markdown_to_plaintext(markdown);
        assert!(result.contains("[代码块]"));
        assert!(result.contains("const x = 1;"));
        assert!(result.contains("[/代码块]"));
    }

    #[test]
    fn test_links() {
        let markdown = "[Link text](https://example.com)";
        let result = markdown_to_plaintext(markdown);
        assert!(result.contains("Link text"));
        assert!(!result.contains("https://example.com"));
    }

    #[test]
    fn test_bold_italic() {
        let markdown = "**bold** and *italic*";
        let result = markdown_to_plaintext(markdown);
        assert!(result.contains("bold"));
        assert!(result.contains("italic"));
        assert!(!result.contains("**"));
        assert!(!result.contains("*"));
    }
}
