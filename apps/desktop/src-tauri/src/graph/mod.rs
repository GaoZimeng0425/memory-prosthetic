//! Knowledge Graph Module
//!
//! Handles association discovery, calculation, and graph building

pub mod association;
pub mod discovery;
pub mod builder;
pub mod clustering;
pub mod migration;

pub use association::{
    AssociationCalculator,
    AssociationType,
};
pub use discovery::{
    IncrementalDiscovery,
};
pub use builder::{
    GraphBuilder,
    GraphData,
    CreateAssociation,
};
pub use clustering::{
    ClusterAnalyzer,
    ClusteringError,
};
pub use migration::{
    AssociationMigrator,
    MigrationOptions,
    MigrationProgress,
    MigrationStats,
    MigrationStatus,
    MigrationError,
};
