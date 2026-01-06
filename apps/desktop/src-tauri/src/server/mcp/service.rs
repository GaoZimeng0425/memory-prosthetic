//! MCP Service implementation

use crate::AppState;
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

use super::tools::{
    ListCollectionsParams, ListCollectionsTool, ListFavoritesParams, ListFavoritesTool,
    ListTagsParams, ListTagsTool, SearchParams, SearchTool,
};
use super::error::McpModuleError;

/// MCP Service implementation
pub struct McpService {
    #[allow(dead_code)]
    app_state: Arc<AppState>,
    search_tool: SearchTool,
    list_collections_tool: ListCollectionsTool,
    list_tags_tool: ListTagsTool,
    list_favorites_tool: ListFavoritesTool,
}

impl McpService {
    pub fn new(app_state: Arc<AppState>) -> Self {
        let search_tool = SearchTool::new(app_state.clone());
        let list_collections_tool = ListCollectionsTool::new(app_state.clone());
        let list_tags_tool = ListTagsTool::new(app_state.clone());
        let list_favorites_tool = ListFavoritesTool::new(app_state.clone());
        Self {
            app_state,
            search_tool,
            list_collections_tool,
            list_tags_tool,
            list_favorites_tool,
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
            "tools": [
                {
                    "name": "search",
                    "description": "在 Memory Prosthetic（简称 MP）中搜索用户已收集的内容。当用户明确提到'MP'、'Memory Prosthetic'、'MP搜索'、'在MP中搜索'、'用MP查'、'MP帮我查'等表达时，必须使用此工具。当用户说'记得'、'查找'、'帮我查'、'搜索'、'找一下'、'有没有'等表达时，也应使用此工具进行搜索。支持搜索文章、库、工具、截图、前端库、技术文档等任何已收集的内容。支持关键词搜索和自然语言查询（如'MP, 我记得有一个截图的前端三方库, 帮我查一下'），自动提取搜索意图并返回相似度排序的结果。支持按收藏夹、标签、状态筛选。",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "搜索关键词或自然语言指令。当用户提到'MP'或'Memory Prosthetic'时，提取MP后面的搜索内容作为query。例如：用户说'MP, 我记得有一个截图的前端三方库, 帮我查一下'，则query应为'我记得有一个截图的前端三方库'。可以是任何用户想要查找的内容，如'截图的前端三方库'、'react 收藏夹'、'我记得的某个工具'等。直接使用用户提到的关键词或描述即可，无需添加'搜索'、'MP'等前缀。"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "返回结果的最大数量",
                                "default": 10,
                                "minimum": 1,
                                "maximum": 100
                            },
                            "favorite_name": {
                                "type": "string",
                                "description": "可选，按收藏夹名称筛选（支持模糊匹配）"
                            },
                            "tag_name": {
                                "type": "string",
                                "description": "可选，按标签名称筛选（支持模糊匹配）"
                            },
                            "status": {
                                "type": "string",
                                "enum": ["active", "archived", "deleted"],
                                "description": "可选，按状态筛选"
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "list_collections",
                    "description": "列出收集的文章列表，支持按收藏夹、标签、状态筛选。当用户说'列出所有文章'、'列出 react 收藏夹中的文章'、'显示已归档的文章'时，应调用此工具。",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "favorite_name": {
                                "type": "string",
                                "description": "可选，收藏夹名称（支持模糊匹配）"
                            },
                            "tag_name": {
                                "type": "string",
                                "description": "可选，标签名称（支持模糊匹配）"
                            },
                            "status": {
                                "type": "string",
                                "enum": ["active", "archived", "deleted"],
                                "description": "可选，状态筛选"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "返回结果的最大数量",
                                "default": 50,
                                "minimum": 1,
                                "maximum": 500
                            },
                            "offset": {
                                "type": "integer",
                                "description": "分页偏移量",
                                "default": 0,
                                "minimum": 0
                            }
                        }
                    }
                },
                {
                    "name": "list_tags",
                    "description": "列出所有标签，支持排序。当用户说'显示所有标签'、'列出标签'时，应调用此工具。",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "sort": {
                                "type": "string",
                                "enum": ["name", "created_at", "usage"],
                                "description": "可选，排序方式：name（按名称）, created_at（按创建时间）, usage（按使用次数）",
                                "default": "name"
                            }
                        }
                    }
                },
                {
                    "name": "list_favorites",
                    "description": "列出所有收藏夹，包含每个收藏夹的文章数量。当用户说'有哪些收藏夹'、'显示收藏夹列表'时，应调用此工具。",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                }
            ]
        }))
    }

    /// Handle call_tool request
    pub async fn handle_call_tool(&self, params: Value) -> Result<Value, McpModuleError> {
        let name = params
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| McpModuleError::InvalidParams("Missing 'name' field".to_string()))?;

        let arguments = params
            .get("arguments")
            .cloned()
            .unwrap_or(Value::Object(serde_json::Map::new()));

        match name {
            "search" => {
                let search_params: SearchParams = serde_json::from_value(arguments)
                    .map_err(|e| {
                        McpModuleError::InvalidParams(format!("Invalid search parameters: {}", e))
                    })?;

                let result = self.search_tool.execute(search_params).await?;
                Ok(serde_json::to_value(result).map_err(|e| {
                    McpModuleError::InternalError(format!("Failed to serialize result: {}", e))
                })?)
            }
            "list_collections" => {
                let list_params: ListCollectionsParams = serde_json::from_value(arguments)
                    .map_err(|e| {
                        McpModuleError::InvalidParams(format!(
                            "Invalid list_collections parameters: {}",
                            e
                        ))
                    })?;

                let result = self.list_collections_tool.execute(list_params).await?;
                Ok(serde_json::to_value(result).map_err(|e| {
                    McpModuleError::InternalError(format!("Failed to serialize result: {}", e))
                })?)
            }
            "list_tags" => {
                let list_params: ListTagsParams = serde_json::from_value(arguments)
                    .map_err(|e| {
                        McpModuleError::InvalidParams(format!(
                            "Invalid list_tags parameters: {}",
                            e
                        ))
                    })?;

                let result = self.list_tags_tool.execute(list_params).await?;
                Ok(serde_json::to_value(result).map_err(|e| {
                    McpModuleError::InternalError(format!("Failed to serialize result: {}", e))
                })?)
            }
            "list_favorites" => {
                let list_params: ListFavoritesParams = serde_json::from_value(arguments)
                    .map_err(|e| {
                        McpModuleError::InvalidParams(format!(
                            "Invalid list_favorites parameters: {}",
                            e
                        ))
                    })?;

                let result = self.list_favorites_tool.execute(list_params).await?;
                Ok(serde_json::to_value(result).map_err(|e| {
                    McpModuleError::InternalError(format!("Failed to serialize result: {}", e))
                })?)
            }
            _ => Err(McpModuleError::MethodNotFound(format!(
                "Tool '{}' not found",
                name
            ))),
        }
    }
}
