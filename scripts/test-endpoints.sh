#!/bin/bash

# 测试所有 Agent 端点

echo "🧪 测试 Agent 端点"
echo ""

# 1. Agent Manifest
echo "1️⃣ 测试 Agent Manifest:"
echo "   GET /.well-known/agent.json"
curl -s http://localhost:8787/.well-known/agent.json | jq '.name, .version' || echo "❌ 失败"
echo ""

# 2. Entrypoints 列表
echo "2️⃣ 测试 Entrypoints 列表:"
echo "   GET /entrypoints"
curl -s http://localhost:8787/entrypoints | jq '.items[].key' || echo "❌ 失败"
echo ""

# 3. 测试 transcribe-space (会失败，因为没有支付)
echo "3️⃣ 测试 transcribe-space (无支付，预期失败):"
echo "   POST /invoke/transcribe-space"
RESPONSE=$(curl -s -X POST http://localhost:8787/invoke/transcribe-space \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL"}')
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# 4. 测试 unlock-space-chat (会失败，因为没有支付)
echo "4️⃣ 测试 unlock-space-chat (无支付，预期失败):"
echo "   POST /invoke/unlock-space-chat"
RESPONSE=$(curl -s -X POST http://localhost:8787/invoke/unlock-space-chat \
  -H "Content-Type: application/json" \
  -d '{"spaceId": "1RDxlAoOeQRKL"}')
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# 5. 测试 chat-with-spaces (会失败，因为没有支付)
echo "5️⃣ 测试 chat-with-spaces (无支付，预期失败):"
echo "   POST /invoke/chat-with-spaces"
RESPONSE=$(curl -s -X POST http://localhost:8787/invoke/chat-with-spaces \
  -H "Content-Type: application/json" \
  -d '{"spaceIds": ["1RDxlAoOeQRKL"], "question": "What topics were discussed?"}')
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

echo "✅ 测试完成"
echo ""
echo "💡 注意:"
echo "   - 所有 invoke 端点都需要 x402 支付"
echo "   - 无支付请求会返回支付要求信息"
echo "   - 使用 'bun run scripts/test-direct.ts' 进行无支付测试"
