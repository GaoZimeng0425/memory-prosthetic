//! Knowledge Graph Module
//!
//! Handles association discovery, calculation, and graph building

mod association;
mod discovery;
mod builder;

pub use association::{
    AssociationCalculator,
    AssociationType,
    CalculationError,
};
pub use discovery::{
    IncrementalDiscovery,
    DiscoveryError,
};
pub use builder::{
    GraphBuilder,
    GraphData,
    GraphNode,
    GraphEdge,
    CreateAssociation,
};
