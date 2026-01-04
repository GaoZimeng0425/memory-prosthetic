//! Database migration scripts
//!
//! Contains data migration scripts for converting data formats.

mod migrate_notes_to_markdown;

pub use migrate_notes_to_markdown::migrate_notes_to_markdown;
