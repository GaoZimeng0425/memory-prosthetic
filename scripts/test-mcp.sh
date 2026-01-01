#!/bin/bash

# Test MCP endpoint
echo "Testing MCP endpoint..."

# Test 1: Initialize request
echo -e "\n1. Testing initialize request:"
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
  }' | jq .

# Test 2: List tools
echo -e "\n2. Testing tools/list request:"
curl -X POST http://127.0.0.1:21890/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' | jq .

# Test 3: GET request (SSE)
echo -e "\n3. Testing GET request:"
curl -X GET http://127.0.0.1:21890/mcp \
  -H "mcp-session-id: test-session" \
  -v

echo -e "\nDone!"
