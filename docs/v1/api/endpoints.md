# Agent API 端点

## 正确的路由格式

**Agent-Kit 标准格式：**
```
POST /entrypoints/:key/invoke
```

## 📡 可用端点

### 1. Transcribe Space (转录 Space)

**端点：**
```
POST /entrypoints/transcribe-space/invoke
```

**价格：** 0.2 USDC

**请求：**
```bash
curl -X POST http://localhost:8787/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402_payment_proof>" \
  -d '{
    "spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL",
    "title": "Optional Title"
  }'
```

**无支付测试：**
```bash
curl -X POST http://localhost:8787/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL"}'
```

**返回（无支付）：**
```json
{
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "exact",
    "network": "base",
    "maxAmountRequired": "200000",
    "payTo": "0x58D2FF253998bC2F3b8F5BDBe9C52Cad7b022739",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }]
}
```

**响应（有支付）：**
```json
{
  "success": true,
  "spaceId": "1RDxlAoOeQRKL",
  "message": "Space queued for transcription",
  "estimatedTimeMinutes": 4,
  "queuePosition": 1
}
```

---

### 2. Unlock Space Chat (解锁聊天)

**端点：**
```
POST /entrypoints/unlock-space-chat/invoke
```

**价格：** 0.5 USDC

**请求：**
```bash
curl -X POST http://localhost:8787/entrypoints/unlock-space-chat/invoke \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402_payment_proof>" \
  -d '{
    "spaceId": "1RDxlAoOeQRKL"
  }'
```

**响应：**
```json
{
  "success": true,
  "spaceId": "1RDxlAoOeQRKL",
  "message": "Chat unlocked successfully",
  "unlockedAt": "2024-01-15T10:30:00Z"
}
```

---

### 3. Chat with Spaces (AI 聊天)

**端点：**
```
POST /entrypoints/chat-with-spaces/invoke
```

**价格：** 0.9 + 0.1n USDC (n = 额外 Space 数量)

**请求：**
```bash
curl -X POST http://localhost:8787/entrypoints/chat-with-spaces/invoke \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402_payment_proof>" \
  -d '{
    "spaceIds": ["1RDxlAoOeQRKL"],
    "question": "What were the main topics discussed?"
  }'
```

**响应：**
```json
{
  "answer": "The main topics discussed were...",
  "sources": [
    {
      "spaceId": "1RDxlAoOeQRKL",
      "title": "Launch an <x402 startup> in 20 minutes",
      "excerpt": "..."
    }
  ],
  "spaceCount": 1,
  "model": "gpt-4o"
}
```

---

## 🔍 发现端点

### Agent Manifest
```bash
curl http://localhost:8787/.well-known/agent.json | jq
```

### 列出所有端点
```bash
curl http://localhost:8787/entrypoints | jq
```

---

## 💳 支付流程

### 使用 x402-fetch (推荐)

```typescript
import { x402Fetch } from 'x402-fetch';

const response = await x402Fetch(
  'http://localhost:8787/entrypoints/transcribe-space/invoke',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spaceUrl: 'https://twitter.com/i/spaces/1RDxlAoOeQRKL'
    })
  }
);

const result = await response.json();
```

### 手动支付（高级）

1. 发送请求获取支付要求
2. 在链上执行 USDC 转账
3. 获取交易哈希
4. 在 `X-PAYMENT` header 中提供支付证明
5. 重新发送请求

---

## 🧪 测试端点（无需支付）

### 方式 1: 直接数据库测试
```bash
bun run scripts/test-direct.ts
```

直接在数据库中创建记录，绕过支付。

### 方式 2: 查看支付要求
```bash
curl -X POST http://localhost:8787/entrypoints/transcribe-space/invoke \
  -H "Content-Type: application/json" \
  -d '{"spaceUrl": "https://twitter.com/i/spaces/1RDxlAoOeQRKL"}'
```

验证端点响应和支付配置。

---

## 📊 免费端点（无需支付）

这些端点不需要支付：

```bash
# Health check
GET /health

# Agent manifest
GET /.well-known/agent.json

# List entrypoints
GET /entrypoints
```

---

## ⚠️ 常见错误

### 错误 1: 404 Not Found
**原因：** 使用了错误的路由格式

❌ 错误：
```bash
POST /invoke/transcribe-space
```

✅ 正确：
```bash
POST /entrypoints/transcribe-space/invoke
```

### 错误 2: X-PAYMENT header is required
**原因：** 未提供支付证明

**解决：**
- 使用 `x402-fetch` 自动处理支付
- 或使用 `bun run scripts/test-direct.ts` 绕过支付

### 错误 3: Payment verification failed
**原因：** 支付金额不足或网络不匹配

**检查：**
- 钱包 USDC 余额
- 网络配置（base 或 base-sepolia）
- 支付金额是否正确

---

## 🔗 相关文档

- `HOW_TO_PAY.md` - 完整支付测试指南
- `SERVICES.md` - 服务架构说明
- `README.md` - 项目概览
