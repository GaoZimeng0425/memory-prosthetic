# MCP 连接问题排查指南

## 问题：MCP 服务器一直处于 Loading 状态

### 可能原因

1. **桌面应用未运行**
   - Memory Prosthetic 桌面应用必须正在运行
   - HTTP 服务器在应用启动时自动启动

2. **端口被占用或配置错误**
   - 默认端口：`21890`
   - 检查应用设置中的端口配置

3. **MCP 协议实现问题**
   - 响应格式不正确
   - 缺少必要的 HTTP 方法支持

### 排查步骤

#### 1. 确认桌面应用正在运行

```bash
# 检查应用进程
ps aux | grep -i "memory-prosthetic\|desktop"

# 或者检查端口是否在监听
lsof -i :21890
```

#### 2. 测试 HTTP 服务器是否可访问

```bash
# 测试健康检查端点
curl http://127.0.0.1:21890/api/health

# 应该返回：
# {"status":"ok","version":"0.1.0"}
```

#### 3. 测试 MCP 端点

```bash
# 测试 MCP initialize 请求
curl -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "cursor",
        "version": "1.0.0"
      }
    }
  }'

# 应该返回：
# {
#   "jsonrpc": "2.0",
#   "id": 1,
#   "result": {
#     "protocolVersion": "2024-11-05",
#     "capabilities": { "tools": {} },
#     "serverInfo": { "name": "Memory Prosthetic", "version": "0.1.0" }
#   }
# }
```

#### 4. 测试工具列表

```bash
# 测试 tools/list 请求
curl -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'

# 应该返回包含 4 个工具的列表：
# - search
# - list_collections
# - list_tags
# - list_favorites
```

#### 5. 检查 Cursor 配置

确认 `~/.cursor/mcp.json` 中的配置正确：

```json
{
  "mcpServers": {
    "memory-prosthetic": {
      "url": "http://127.0.0.1:21890/mcp"
    }
  }
}
```

### 常见问题解决

#### 问题 1: 连接被拒绝 (Connection refused)

**原因：** 桌面应用未运行或 HTTP 服务器未启动

**解决：**
1. 启动 Memory Prosthetic 桌面应用
2. 检查应用日志，确认 HTTP 服务器已启动
3. 日志中应该看到：`HTTP server starting on http://127.0.0.1:21890`

#### 问题 2: 超时 (Timeout)

**原因：** 防火墙阻止或端口被占用

**解决：**
1. 检查防火墙设置
2. 确认端口 21890 未被其他应用占用
3. 尝试更改端口配置（在应用设置中）

#### 问题 3: 协议错误 (Protocol error)

**原因：** MCP 协议实现不兼容

**解决：**
1. 检查应用版本，确保是最新版本
2. 查看应用日志中的 MCP 相关错误信息
3. 尝试重启应用

### 日志位置

**macOS:**
```
~/Library/Logs/memory-prosthetic/
```

**查看日志：**
```bash
# 查看最新日志
tail -f ~/Library/Logs/memory-prosthetic/*.log

# 或者使用项目脚本
./scripts/view-logs.sh
```

### 验证清单

- [ ] 桌面应用正在运行
- [ ] HTTP 服务器已启动（端口 21890）
- [ ] `/api/health` 端点可访问
- [ ] `/mcp` 端点可访问
- [ ] `initialize` 请求返回正确响应
- [ ] `tools/list` 请求返回工具列表
- [ ] Cursor 配置正确
- [ ] 无防火墙阻止

### 下一步

如果以上步骤都正常，但 Cursor 仍然显示 Loading：

1. **重启 Cursor**
   - 完全退出 Cursor
   - 重新启动

2. **重新加载 MCP 配置**
   - 在 Cursor 设置中禁用 MCP 服务器
   - 重新启用

3. **检查 Cursor 版本**
   - 确保使用支持 MCP 的 Cursor 版本（0.47+）

4. **查看 Cursor 日志**
   - Cursor 的日志可能包含更多错误信息
   - 位置：`~/Library/Logs/Cursor/` 或 `~/.cursor/logs/`
