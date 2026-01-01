#!/bin/bash

# MCP Connection Diagnostic Script

echo "=== Memory Prosthetic MCP Connection Diagnostic ==="
echo ""

# Check if desktop app is running
echo "1. Checking if desktop app is running..."
if pgrep -f "memory-prosthetic\|desktop" > /dev/null; then
    echo "   ✅ Desktop app is running"
else
    echo "   ❌ Desktop app is NOT running"
    echo "   → Please start the Memory Prosthetic desktop application"
    exit 1
fi

# Check if port is listening
echo ""
echo "2. Checking if HTTP server is listening on port 21890..."
if lsof -i :21890 > /dev/null 2>&1; then
    echo "   ✅ Port 21890 is in use"
else
    echo "   ❌ Port 21890 is NOT in use"
    echo "   → HTTP server may not have started"
    exit 1
fi

# Test health endpoint
echo ""
echo "3. Testing /api/health endpoint..."
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:21890/api/health 2>&1)
if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "   ✅ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test MCP initialize
echo ""
echo "4. Testing MCP /mcp endpoint (initialize)..."
INIT_RESPONSE=$(curl -s -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }' 2>&1)

if echo "$INIT_RESPONSE" | grep -q "protocolVersion"; then
    echo "   ✅ MCP initialize successful"
    echo "   Response: $(echo "$INIT_RESPONSE" | jq -c . 2>/dev/null || echo "$INIT_RESPONSE")"
else
    echo "   ❌ MCP initialize failed"
    echo "   Response: $INIT_RESPONSE"
    exit 1
fi

# Test tools/list
echo ""
echo "5. Testing MCP tools/list..."
TOOLS_RESPONSE=$(curl -s -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' 2>&1)

if echo "$TOOLS_RESPONSE" | grep -q "tools"; then
    TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | jq '.result.tools | length' 2>/dev/null || echo "unknown")
    echo "   ✅ MCP tools/list successful"
    echo "   Found $TOOL_COUNT tools"
    echo "   Response: $(echo "$TOOLS_RESPONSE" | jq -c '.result.tools[]?.name' 2>/dev/null | tr '\n' ' ' || echo "see full response")"
else
    echo "   ❌ MCP tools/list failed"
    echo "   Response: $TOOLS_RESPONSE"
    exit 1
fi

# Check Cursor config
echo ""
echo "6. Checking Cursor MCP configuration..."
if [ -f ~/.cursor/mcp.json ]; then
    if grep -q "memory-prosthetic" ~/.cursor/mcp.json && grep -q "21890" ~/.cursor/mcp.json; then
        echo "   ✅ Cursor MCP config found and contains memory-prosthetic"
    else
        echo "   ⚠️  Cursor MCP config found but memory-prosthetic not configured"
        echo "   → Please add the following to ~/.cursor/mcp.json:"
        echo '     "memory-prosthetic": {'
        echo '       "url": "http://127.0.0.1:21890/mcp"'
        echo '     }'
    fi
else
    echo "   ⚠️  Cursor MCP config not found at ~/.cursor/mcp.json"
    echo "   → Please create the config file"
fi

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "If all checks passed but Cursor still shows Loading:"
echo "1. Restart Cursor completely"
echo "2. In Cursor settings, disable and re-enable the MCP server"
echo "3. Check Cursor logs for errors"
echo ""
echo "For more details, see: docs/troubleshooting/mcp-connection-issues.md"
