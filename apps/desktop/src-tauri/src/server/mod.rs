//! HTTP Server module for browser extension communication
//!
//! Provides REST API endpoints for the browser extension to communicate
//! with the desktop app.

mod routes;
mod handlers;
mod mcp;

pub use routes::create_router;

use axum::Router;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::oneshot;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, error};

use crate::AppState;

/// Default port for the HTTP server
pub const DEFAULT_PORT: u16 = 21890;

/// HTTP Server configuration
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            port: DEFAULT_PORT,
            host: "127.0.0.1".to_string(),
        }
    }
}

/// HTTP Server handle for lifecycle management
pub struct HttpServer {
    shutdown_tx: Option<oneshot::Sender<()>>,
    addr: SocketAddr,
}

impl HttpServer {
    /// Get the server address
    pub fn addr(&self) -> SocketAddr {
        self.addr
    }

    /// Shutdown the server
    pub fn shutdown(mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
            info!("HTTP server shutdown signal sent");
        }
    }
}

/// Start the HTTP server in a background task
pub async fn start_server(
    state: Arc<AppState>,
    config: ServerConfig,
) -> Result<HttpServer, std::io::Error> {
    let addr: SocketAddr = format!("{}:{}", config.host, config.port)
        .parse()
        .expect("Invalid server address");

    // Create CORS layer - allow browser extension origins
    let cors = CorsLayer::new()
        .allow_origin(Any) // In production, restrict to specific extension origins
        .allow_methods(Any)
        .allow_headers(Any);

    // Create router with state
    let app: Router = create_router(state)
        .layer(cors);

    // Create shutdown channel
    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    // Create TCP listener
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let local_addr = listener.local_addr()?;

    info!("HTTP server starting on http://{}", local_addr);

    // Spawn server task
    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
                info!("HTTP server shutting down gracefully");
            })
            .await
            .unwrap_or_else(|e| {
                error!("HTTP server error: {}", e);
            });
    });

    Ok(HttpServer {
        shutdown_tx: Some(shutdown_tx),
        addr: local_addr,
    })
}
