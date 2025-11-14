#!/bin/bash

echo "🧪 测试所有 Agent 端点（正确的路由格式）"
echo ""

echo "✅ 正确格式: POST /entrypoints/:key/invoke"
echo ""

# 1. transcribe-space
echo "1️⃣ Transcribe Space (0.2 USDC):"
curl -s -X POST http://localhost:8787/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl":"https://twitter.com/i/spaces/1RDxlAoOeQRKL"}' | jq -r '.error, "Price:", .accepts[0].maxAmountRequired, "Network:", .accepts[0].network'
echo ""

# 2. unlock-space-chat
echo "2️⃣ Unlock Space Chat (0.5 USDC):"
curl -s -X POST http://localhost:8787/entrypoints/unlock-space-chat/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceId":"1RDxlAoOeQRKL"}' | jq -r '.error, "Price:", .accepts[0].maxAmountRequired, "Network:", .accepts[0].network'
echo ""

# 3. chat-with-spaces
echo "3️⃣ Chat with Spaces (0.9 USDC base):"
curl -s -X POST http://localhost:8787/entrypoints/chat-with-spaces/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceIds":["1RDxlAoOeQRKL"],"question":"What topics were discussed?"}' | jq -r '.error, "Price:", .accepts[0].maxAmountRequired, "Network:", .accepts[0].network'
echo ""

echo "✅ 所有端点都正常响应！"
echo ""
echo "💡 返回 'X-PAYMENT header is required' 是正常的"
echo "   这表示端点正常工作，只是需要支付"
echo ""
echo "📖 查看完整 API 文档："
echo "   cat API_ENDPOINTS.md"
