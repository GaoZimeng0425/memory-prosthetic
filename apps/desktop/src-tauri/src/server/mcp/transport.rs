//! HTTP transport adapter for MCP

use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    response::Response,
    routing::{post, MethodRouter},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
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
    let mcp_service = Arc::new(McpService::new(state));

    let mcp_route = MethodRouter::new()
        .post(handle_mcp_request)
        .options(handle_options);

    Router::new()
        .route("/mcp", mcp_route)
        .with_state(mcp_service)
}

/// Handle MCP HTTP request
async fn handle_mcp_request(
    State(service): State<Arc<McpService>>,
    body: Body,
) -> Result<Response<Body>, StatusCode> {
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
            // Handle initialized notification (no response needed for notifications)
            info!("MCP initialized notification received");
            return JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: None, // Notifications don't have IDs
                result: None,
                error: None,
            };
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
        .header("Access-Control-Allow-Methods", "POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type")
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
        .header("Access-Control-Allow-Methods", "POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type")
        .body(Body::from(response_body))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
