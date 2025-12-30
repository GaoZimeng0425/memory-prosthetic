//! MCP Service implementation

use crate::AppState;
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

use super::tools::{SearchParams, SearchTool};
use super::error::McpModuleError;

/// MCP Service implementation
pub struct McpService {
    #[allow(dead_code)]
    app_state: Arc<AppState>,
    search_tool: SearchTool,
}

impl McpService {
    pub fn new(app_state: Arc<AppState>) -> Self {
        let search_tool = SearchTool::new(app_state.clone());
        Self {
            app_state,
            search_tool,
        }
    }

    /// Handle initialize request
    pub async fn handle_initialize(&self, params: Value) -> Result<Value, McpModuleError> {
        // Parse client info from params
        let client_info = params.get("clientInfo")
            .and_then(|v| v.as_object())
            .map(|obj| {
                format!(
                    "{}/{}",
                    obj.get("name").and_then(|v| v.as_str()).unwrap_or("unknown"),
                    obj.get("version").and_then(|v| v.as_str()).unwrap_or("unknown")
                )
            })
            .unwrap_or_else(|| "unknown".to_string());

        info!("MCP client initialized: {}", client_info);

        Ok(serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "Memory Prosthetic",
                "version": env!("CARGO_PKG_VERSION")
            }
        }))
    }

    /// Handle list_tools request
    pub async fn handle_list_tools(&self, _params: Option<Value>) -> Result<Value, McpModuleError> {
        Ok(serde_json::json!({
            "tools": [{
                "name": "search",
                "description": "在 Memory Prosthetic（简称 MP）中搜索已收集的内容。支持关键词搜索和自然语言查询，自动提取搜索意图并返回相似度排序的结果。当用户说'使用 MP 搜索...'或'MP 搜索...'时，应调用此工具。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "搜索关键词或自然语言指令"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "返回结果的最大数量",
                            "default": 10,
                            "minimum": 1,
                            "maximum": 100
                        }
                    },
                    "required": ["query"]
                }
            }]
        }))
    }

    /// Handle call_tool request
    pub async fn handle_call_tool(&self, params: Value) -> Result<Value, McpModuleError> {
        let name = params.get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpModuleError::InvalidParams("Missing 'name' field".to_string()))?;

        let arguments = params.get("arguments")
            .cloned()
            .unwrap_or(Value::Object(serde_json::Map::new()));

        match name {
            "search" => {
                let search_params: SearchParams = serde_json::from_value(arguments)
                    .map_err(|e| McpModuleError::InvalidParams(format!("Invalid search parameters: {}", e)))?;

                let result = self.search_tool.execute(search_params).await?;
                Ok(serde_json::to_value(result).map_err(|e| {
                    McpModuleError::InternalError(format!("Failed to serialize result: {}", e))
                })?)
            }
            _ => Err(McpModuleError::MethodNotFound(format!("Tool '{}' not found", name))),
        }
    }
}
