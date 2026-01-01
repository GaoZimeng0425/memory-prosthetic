#!/bin/bash

# HTTP Server Diagnostic Script

echo "=== Memory Prosthetic HTTP Server Diagnostic ==="
echo ""

# Check if desktop app is running
echo "1. Checking if desktop app is running..."
if pgrep -f "memory-prosthetic\|desktop" > /dev/null; then
    echo "   ✅ Desktop app process found"
    echo "   Process: $(pgrep -f 'memory-prosthetic\|desktop' | head -1)"
else
    echo "   ❌ Desktop app is NOT running"
    echo "   → Please start the Memory Prosthetic desktop application"
    exit 1
fi

# Check if port is listening
echo ""
echo "2. Checking if HTTP server is listening on port 21890..."
PORT_CHECK=$(lsof -i :21890 2>&1)
if [ $? -eq 0 ] && [ -n "$PORT_CHECK" ]; then
    echo "   ✅ Port 21890 is in use"
    echo "   Details:"
    echo "$PORT_CHECK" | head -3 | sed 's/^/      /'
else
    echo "   ❌ Port 21890 is NOT in use"
    echo "   → HTTP server may not have started"
    echo ""
    echo "   Possible reasons:"
    echo "   - Server failed to start (check application logs)"
    echo "   - Port is blocked by firewall"
    echo "   - Port is configured differently"
    echo ""
    echo "   To check logs:"
    echo "   - macOS: Open Console.app and search for 'desktop' or 'HTTP server'"
    echo "   - Or run: log stream --predicate 'process == \"desktop\"'"
    exit 1
fi

# Test health endpoint
echo ""
echo "3. Testing /api/health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://127.0.0.1:21890/api/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "ok"; then
    echo "   ✅ Health check passed (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
else
    echo "   ❌ Health check failed (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
    exit 1
fi

# Test MCP endpoint
echo ""
echo "4. Testing MCP /mcp endpoint..."
MCP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:21890/mcp \
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

MCP_HTTP_CODE=$(echo "$MCP_RESPONSE" | tail -1)
MCP_BODY=$(echo "$MCP_RESPONSE" | head -n -1)

if [ "$MCP_HTTP_CODE" = "200" ] && echo "$MCP_BODY" | grep -q "protocolVersion"; then
    echo "   ✅ MCP endpoint is working (HTTP $MCP_HTTP_CODE)"
    echo "   Response: $(echo "$MCP_BODY" | jq -c '.result.serverInfo' 2>/dev/null || echo "see full response")"
else
    echo "   ❌ MCP endpoint failed (HTTP $MCP_HTTP_CODE)"
    echo "   Response: $MCP_BODY"
    exit 1
fi

# Test browser extension endpoint
echo ""
echo "5. Testing browser extension endpoint /api/collect..."
COLLECT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://127.0.0.1:21890/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Test",
    "content": "Test content"
  }' 2>&1)

COLLECT_HTTP_CODE=$(echo "$COLLECT_RESPONSE" | tail -1)
COLLECT_BODY=$(echo "$COLLECT_RESPONSE" | head -n -1)

if [ "$COLLECT_HTTP_CODE" = "200" ]; then
    echo "   ✅ Browser extension endpoint is working (HTTP $COLLECT_HTTP_CODE)"
    echo "   Response: $(echo "$COLLECT_BODY" | jq -c '.success' 2>/dev/null || echo "see full response")"
else
    echo "   ⚠️  Browser extension endpoint returned HTTP $COLLECT_HTTP_CODE"
    echo "   Response: $COLLECT_BODY"
fi

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "✅ HTTP server is running and responding correctly!"
echo ""
echo "Available endpoints:"
echo "  - Health: http://127.0.0.1:21890/api/health"
echo "  - MCP: http://127.0.0.1:21890/mcp"
echo "  - Browser Extension: http://127.0.0.1:21890/api/*"
echo ""
echo "If browser extension or MCP still can't connect:"
echo "1. Check browser extension configuration"
echo "2. Check Cursor MCP configuration (~/.cursor/mcp.json)"
echo "3. Restart the browser extension or Cursor"
