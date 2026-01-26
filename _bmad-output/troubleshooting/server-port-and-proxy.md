# HTTP 服务器端口和代理配置说明

## 当前配置

### 端口配置

**默认端口：** `21890`

**端口配置位置：**
1. **后端默认值：** `apps/desktop/src-tauri/src/server/mod.rs`
   ```rust
   pub const DEFAULT_PORT: u16 = 21890;
   ```

2. **设置默认值：** `apps/desktop/src-tauri/src/settings.rs`
   ```rust
   server_port: 21890,
   ```

3. **浏览器扩展：** `apps/browser-extension/src/constants/api.ts`
   ```typescript
   export const DEFAULT_PORT = 21890
   ```

4. **MCP 配置：** `~/.cursor/mcp.json`
   ```json
   {
     "memory-prosthetic": {
       "url": "http://127.0.0.1:21890/mcp"
     }
   }
   ```

### 网址配置

**服务器地址：** `127.0.0.1` (localhost)

**为什么使用 127.0.0.1 而不是 localhost？**
- `127.0.0.1` 是 IP 地址，不会被系统代理影响
- `localhost` 是域名，可能会被 DNS 或代理解析
- 使用 `127.0.0.1` 可以避免代理问题

### 端口读取机制

**已修复：** 服务器现在会从应用设置中读取端口，而不是硬编码。

**启动流程：**
1. 应用启动时读取设置文件中的 `server_port`
2. 如果设置文件中没有，使用默认值 `21890`
3. 服务器使用读取到的端口启动

## 代理影响

### 系统代理的影响

**HTTP/HTTPS 代理：**
- ✅ **不影响**：`127.0.0.1` 和 `localhost` 通常被排除在代理之外
- ⚠️ **可能影响**：如果代理配置了 `no_proxy` 排除列表，确保包含 `127.0.0.1` 或 `localhost`

**SOCKS 代理：**
- ✅ **通常不影响**：本地连接通常不经过 SOCKS 代理

### 检查代理设置

**macOS:**
```bash
# 检查系统代理设置
scutil --proxy

# 检查环境变量
echo $http_proxy
echo $https_proxy
echo $no_proxy
```

**如果代理影响连接：**
1. 在 `no_proxy` 中添加 `127.0.0.1,localhost`
2. 或临时禁用代理进行测试

## 修改端口

### 方法 1: 通过应用设置（推荐）

目前设置界面只显示端口，不支持修改。需要手动修改设置文件：

**设置文件位置：**
```
~/Library/Application Support/com.memory-prosthetic.desktop/settings.json
```

**修改示例：**
```json
{
  "searchShortcut": {...},
  "serverPort": 21891,
  "autoStart": false,
  "theme": "dark"
}
```

**修改后：**
1. 重启应用
2. 服务器会在新端口启动
3. 更新浏览器扩展配置（如果需要）
4. 更新 MCP 配置（如果需要）

### 方法 2: 修改代码默认值

如果需要永久更改默认端口，修改以下文件：

1. `apps/desktop/src-tauri/src/server/mod.rs`
   ```rust
   pub const DEFAULT_PORT: u16 = 21891; // 改为新端口
   ```

2. `apps/desktop/src-tauri/src/settings.rs`
   ```rust
   server_port: 21891, // 改为新端口
   ```

3. `apps/browser-extension/src/constants/api.ts`
   ```typescript
   export const DEFAULT_PORT = 21891 // 改为新端口
   ```

4. `~/.cursor/mcp.json`
   ```json
   {
     "memory-prosthetic": {
       "url": "http://127.0.0.1:21891/mcp"
     }
   }
   ```

## 常见问题

### Q: 端口被占用怎么办？

**检查端口占用：**
```bash
lsof -i :21890
```

**解决方案：**
1. 关闭占用端口的程序
2. 或修改应用端口（见上方"修改端口"）

### Q: 浏览器扩展连接失败？

**检查清单：**
1. ✅ 应用是否正在运行
2. ✅ 服务器是否在正确端口启动
3. ✅ 浏览器扩展配置的端口是否正确
4. ✅ 防火墙是否阻止连接
5. ✅ 代理是否影响连接

**测试连接：**
```bash
curl http://127.0.0.1:21890/api/health
```

### Q: MCP 连接失败？

**检查清单：**
1. ✅ 应用是否正在运行
2. ✅ 服务器是否在正确端口启动
3. ✅ `~/.cursor/mcp.json` 中的 URL 是否正确
4. ✅ Cursor 是否重启

**测试连接：**
```bash
curl -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

### Q: 代理导致连接问题？

**解决方案：**
1. **临时禁用代理测试：**
   ```bash
   unset http_proxy https_proxy
   ```

2. **配置 no_proxy：**
   ```bash
   export no_proxy="127.0.0.1,localhost"
   ```

3. **使用 127.0.0.1 而不是 localhost：**
   - 应用已使用 `127.0.0.1`，通常不受代理影响

## 验证配置

运行诊断脚本检查配置：

```bash
./scripts/check-http-server.sh
```

脚本会检查：
- ✅ 应用是否运行
- ✅ 端口是否监听
- ✅ 健康检查端点
- ✅ MCP 端点
- ✅ 浏览器扩展端点

## 总结

| 项目 | 当前值 | 可修改 | 说明 |
|------|--------|--------|------|
| **端口** | 21890 | ✅ 是 | 可通过设置文件修改 |
| **地址** | 127.0.0.1 | ❌ 否 | 固定为本地地址，避免代理问题 |
| **代理影响** | 通常无 | - | 127.0.0.1 通常不被代理 |

**重要提示：**
- 修改端口后需要重启应用
- 修改端口后需要更新浏览器扩展和 MCP 配置
- 使用 `127.0.0.1` 而不是 `localhost` 可以避免代理问题
