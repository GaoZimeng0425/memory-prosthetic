//! HTTP transport adapter for MCP

use axum::{
    body::Body,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::Response,
    routing::{delete, get, post, MethodRouter},
    Router,
};
use futures_util::stream;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;
use tracing::{error, info};

use super::service::McpService;
use super::error::McpModuleError;
use crate::AppState;

/// JSON-RPC 2.0 request
#[derive(Deserialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

/// JSON-RPC 2.0 response
#[derive(Serialize)]
struct JsonRpcResponse {
    jsonrpc: String,
    id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<JsonRpcError>,
}

#[derive(Serialize)]
struct JsonRpcError {
    code: i32,
    message: String,
}

/// Create MCP router
pub fn create_mcp_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/mcp", post(handle_mcp_post))
        .route("/mcp", get(handle_mcp_get))
        .route("/mcp", delete(handle_mcp_delete))
        .route("/mcp", MethodRouter::new().options(handle_options))
        .with_state(state)
}

/// Handle MCP POST request (JSON-RPC messages)
async fn handle_mcp_post(
    State(app_state): State<Arc<AppState>>,
    body: Body,
) -> Result<Response<Body>, StatusCode> {
    let service = Arc::new(McpService::new(app_state));
    // Extract body as string
    let body_bytes = axum::body::to_bytes(body, usize::MAX)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let body_str = String::from_utf8(body_bytes.to_vec())
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    info!("MCP request received: {}", body_str);

    // Parse JSON-RPC request
    let request: JsonRpcRequest = match serde_json::from_str(&body_str) {
        Ok(req) => req,
        Err(e) => {
            error!("Failed to parse JSON-RPC request: {}", e);
            let error_response = create_jsonrpc_error_response(
                None,
                -32700,
                "Parse error".to_string(),
            );
            return create_http_response(error_response);
        }
    };

    // Validate JSON-RPC version
    if request.jsonrpc != "2.0" {
        let error_response = create_jsonrpc_error_response(
            request.id,
            -32600,
            "Invalid Request".to_string(),
        );
        return create_http_response(error_response);
    }

    // Handle request
    let response = handle_jsonrpc_request(service, request).await;

    // Create HTTP response
    create_http_response(response)
}

/// Handle JSON-RPC request
async fn handle_jsonrpc_request(
    service: Arc<McpService>,
    request: JsonRpcRequest,
) -> JsonRpcResponse {
    let id = request.id.clone();

    let result = match request.method.as_str() {
        "initialize" => {
            let params = request.params.unwrap_or(Value::Null);
            service.handle_initialize(params).await
        }
        "tools/list" => {
            service.handle_list_tools(request.params).await
        }
        "tools/call" => {
            let params = match request.params {
                Some(p) => p,
                None => {
                    return create_jsonrpc_error_response(
                        id,
                        -32602,
                        "Missing params".to_string(),
                    );
                }
            };
            service.handle_call_tool(params).await
        }
        "ping" => {
            Ok(Value::Null)
        }
        // MCP protocol methods
        "notifications/initialized" => {
            // Handle initialized notification
            // According to JSON-RPC 2.0, notifications (requests without id) should not receive a response
            // However, if the request has an id, we should respond
            info!("MCP initialized notification received");
            if id.is_some() {
                // If it has an id, it's not a notification, respond with success
                Ok(Value::Null)
            } else {
                // True notification, return early with no response
                return JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id: None,
                    result: None,
                    error: None,
                };
            }
        }
        _ => Err(McpModuleError::MethodNotFound(format!(
            "Method '{}' not found",
            request.method
        ))),
    };

    match result {
        Ok(value) => JsonRpcResponse {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(value),
            error: None,
        },
        Err(e) => {
            let (code, message) = match e {
                McpModuleError::InvalidRequest(msg) => (-32600, msg),
                McpModuleError::MethodNotFound(msg) => (-32601, msg),
                McpModuleError::InvalidParams(msg) => (-32602, msg),
                McpModuleError::InternalError(msg) => (-32603, msg),
                McpModuleError::SearchError(msg) => (-32603, format!("Search error: {}", msg)),
            };
            create_jsonrpc_error_response(id, code, message)
        }
    }
}

/// Create JSON-RPC error response
fn create_jsonrpc_error_response(id: Option<Value>, code: i32, message: String) -> JsonRpcResponse {
    JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        id,
        result: None,
        error: Some(JsonRpcError { code, message }),
    }
}

/// Handle OPTIONS request for CORS
async fn handle_options() -> Response<Body> {
    Response::builder()
        .status(StatusCode::OK)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id")
        .header("Access-Control-Max-Age", "86400")
        .body(Body::empty())
        .unwrap()
}

/// Create HTTP response from JSON-RPC response
fn create_http_response(response: JsonRpcResponse) -> Result<Response<Body>, StatusCode> {
    let response_body = match serde_json::to_string(&response) {
        Ok(body) => body,
        Err(e) => {
            error!("Failed to serialize response: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id")
        .body(Body::from(response_body))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Handle MCP GET request (SSE connection for notifications)
/// For Streamable HTTP, GET requests establish SSE stream for server-to-client notifications
/// Note: We're using JSON Response Mode, so GET requests are optional
async fn handle_mcp_get(
    State(_app_state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Response<Body>, StatusCode> {
    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default");

    info!("MCP GET request received (SSE stream) for session: {}", session_id);

    // For JSON Response Mode, we don't need SSE
    // Return a simple response indicating the server is ready
    let response = serde_json::json!({
        "jsonrpc": "2.0",
        "result": {
            "status": "ready",
            "mode": "json-response"
        }
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::from(serde_json::to_string(&response).unwrap()))
        .unwrap())
}

/// Handle MCP DELETE request (close session)
async fn handle_mcp_delete(
    State(_app_state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Response<Body>, StatusCode> {
    let session_id = headers
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default");

    info!("MCP DELETE request received (close session) for session: {}", session_id);

    // Close session (for now, just return success)
    // In the future, we can implement proper session cleanup here
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::empty())
        .unwrap())
}
